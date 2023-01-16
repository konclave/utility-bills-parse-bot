import * as core from "@actions/core";

import { PassThrough, Stream } from "stream";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Session, cloudApi, serviceClients } from "@yandex-cloud/nodejs-sdk";

import archiver from "archiver";

async function run() {
    core.setCommandEcho(true);

    try {
        const inputs = {
            functionId: core.getInput("function_id", { required: true }),
            token: core.getInput("token", { required: true }),
            accessKeyId: core.getInput("accessKeyId", { required: false }),
            secretAccessKey: core.getInput("secretAccessKey", { required: false }),
            runtime: core.getInput("runtime", { required: true }),
            entrypoint: core.getInput("entrypoint", { required: true }),
            memory: core.getInput("memory", { required: false }),
            source: core.getInput("source", { required: false }),
            sourceIgnore: core.getInput("exclude", { required: false }),
            executionTimeout: core.getInput("execution_timeout", { required: false }),
            environment: core.getInput("environment", { required: false }),
            serviceAccount: core.getInput("service_account", { required: false }),
            bucket: core.getInput("bucket", { required: false }),
            description: core.getInput("description", { required: false }),
        };

        core.info("Function inputs set");

        const fileContents = await zipDirectory(inputs);

        core.info(`Buffer size: ${Buffer.byteLength(fileContents)}b`);

        // OAuth token
        // Initialize SDK with your token
        const session = new Session({ oauthToken: inputs.token });

        await tryStoreObjectInBucket(inputs, fileContents);

        const functionObject = await getFunctionById(session, inputs);

        await createFunctionVersion(session, functionObject, fileContents, inputs);

        core.setOutput("time", new Date().toTimeString());
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

async function tryStoreObjectInBucket(inputs, fileContents) {
    if (!inputs.bucket)
        return;

    if (!inputs.accessKeyId || !inputs.secretAccessKey) {
        core.setFailed("Missing ACCESS_KEY_ID or SECRET_ACCESS_KEY");
        return;
    }

    // setting object name
    const bucketObjectName = constructBucketObjectName(inputs);
    core.info(`Upload to bucket: "${inputs.bucket}/${bucketObjectName}"`);

    // create AWS client
    const client = new S3Client({
        region: "ru-central1",
        signingRegion: "ru-central1",
        endpoint: "https://storage.yandexcloud.net",
        forcePathStyle: true,
        credentials: {
            accessKeyId: inputs.accessKeyId,
            secretAccessKey: inputs.secretAccessKey
        },
    });

    // create PUT Object command
    const cmd = new PutObjectCommand({
        Key: bucketObjectName,
        Bucket: inputs.bucket,
        Body: fileContents
    });

    await client.send(cmd);
}

function handleOperationError(operation) {
    if (operation.error) {
        const details = operation.error?.details;
        if (details)
            throw Error(`${operation.error.code}: ${operation.error.message} (${details.join(", ")})`);

        throw Error(`${operation.error.code}: ${operation.error.message}`);
    }
}

async function getFunctionById(session, inputs) {
    const functionService = session.client(serviceClients.FunctionServiceClient);
    const { serverless: { functions_function_service: { GetFunctionRequest } } } = cloudApi;

    core.startGroup(`Get function by ID: "${inputs.functionId}"`);

    try {
        // Check if Function exist
        const foundFunction = await functionService.get(GetFunctionRequest.fromPartial({ functionId: inputs.functionId }));

        if (foundFunction) {
            core.info(`Function found: "${foundFunction.id} (${foundFunction.name})"`);

            return foundFunction;
        }

        throw Error("Failed to find Function by id");
    }
    finally {
        core.endGroup();
    }
}

async function createFunctionVersion(session, targetFunction, fileContents, inputs) {
    const functionService = session.client(serviceClients.FunctionServiceClient);
    const { serverless: { functions_function: { Package }, functions_function_service: { CreateFunctionVersionRequest } } } = cloudApi;

    core.startGroup("Create function version");

    try {
        core.info(`Function ${inputs.functionId}`);

        //convert variables
        const memory = Number.parseFloat(inputs.memory);
        core.info(`Parsed memory: "${memory}"`);

        const executionTimeout = Number.parseFloat(inputs.executionTimeout);
        core.info(`Parsed timeout: "${executionTimeout}"`);

        const request = CreateFunctionVersionRequest.fromPartial({
            functionId: targetFunction.id,
            runtime: inputs.runtime,
            entrypoint: inputs.entrypoint,
            resources: {
                memory: memory ? memory * 1024 * 1024 : undefined,
            },
            serviceAccountId: inputs.serviceAccount,
            description: inputs.description,
            environment: parseEnvironmentVariables(inputs.environment),
            executionTimeout: { seconds: executionTimeout }
        });

        // get from bucket if supplied
        if (inputs.bucket) {
            core.info(`From bucket: "${inputs.bucket}"`);

            request.package = Package.fromPartial({
                bucketName: inputs.bucket,
                objectName: constructBucketObjectName(inputs)
            });
        }
        else
            request.content = fileContents;

        // Create new version
        functionService.createVersion(request, (err, operation) => {
          core.info(`@@@ ${JSON.stringify(err, null, 2)}, ${JSON.stringify(operation, null, 2)}`)  
          core.info(`Operation complete: ${JSON.stringify(operation)}`);
          handleOperationError(operation);
          core.endGroup();
        });

        
    }
    catch(error) {
        console.error('@@@', error)
    }
    finally {
        
    }
}

/**
 * Generates object name
 * @param inputs parameters
 * @returns object name
 */
function constructBucketObjectName(inputs) {
    const { GITHUB_SHA } = process.env;

    // check SHA present
    if (!GITHUB_SHA) {
        core.setFailed("Missing GITHUB_SHA");
        return;
    }

    return `${inputs.functionId}/${GITHUB_SHA}.zip`;
}

/**
 * Allows to zip input contents
 * @param inputs parameters
 */
async function zipDirectory(inputs) {
    core.startGroup("ZipDirectory");

    try {
        const bufferStream = new PassThrough();

        const archive = archiver("zip", { zlib: { level: 9 } });
        core.info(`Archive initialize`);

        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            core.warning(err);
          } else {            
            core.error(err);
            throw err;
          }
        });

        archive.on('error', (err) => {
          core.error(err);
          throw err;
        });

        archive.pipe(bufferStream);

        archive
            .glob("**", {
                cwd: inputs.source,
                dot: true,
                ignore: parseIgnoreGlobPatterns(inputs.sourceIgnore)
            });
        
        await archive.finalize();

        core.info("Archive finalized");

        bufferStream.end();
        const buffer = await streamToBuffer(bufferStream);

        if (!buffer)
            throw Error("Failed to initialize Buffer");

        core.info("Buffer object created");

        return buffer;
    }
    catch (e) {
      core.error('Archive creation failed:', e.message);
    }
    finally {
        core.endGroup();
    }
}

function parseIgnoreGlobPatterns(ignoreString) {
    const result = [];
    const patterns = ignoreString.split(",");

    patterns.forEach(pattern => {
        // only not empty patterns
        if (pattern?.length > 0)
            result.push(pattern);
    });

    core.info(`Source ignore pattern: "${JSON.stringify(result)}"`);
    return result;
}

function streamToBuffer(stream) {
    const chunks = [];

    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

function parseEnvironmentVariables(env) {
    core.info(`Environment string: "${env}"`);

    const envObject = {};
    const kvs = env.split(",");
    kvs.forEach(kv => {
        const eqIndex = kv.indexOf("=");
        const key = kv.substring(0, eqIndex);
        const value = kv.substring(eqIndex + 1);
        envObject[key] = value;
    });

    core.info(`EnvObject: "${JSON.stringify(envObject)}"`);
    return envObject;
}

run();
