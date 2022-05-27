import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand  } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env['YC_REGION'];
const bucketName = process.env['YC_S3_BUCKET'];

export async function fetch(filename) {
  const s3Client = getS3Client();
  const result = await getS3Object(s3Client, filename);
  return result;
}

function getS3Client() {
  const region = process.env['YC_REGION'];
  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env['YC_S3_ACCESS_KEY'],
      secretAccessKey: process.env['YC_S3_SECRET_ACCESS_KEY'],
    },
    endpoint: 'https://storage.yandexcloud.net',
  });
  return s3Client;
}

async function getS3Object(s3Client, filename) {
  const bucketName = process.env['YC_S3_BUCKET'];
  const listResponse = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName}));
  const hasFile = listResponse.Contents?.some(({ Key}) => Key === filename);
  if (hasFile) {
    const params = {
      Bucket: bucketName,
      Key: filename,
    };
    const data = await s3Client.send(new GetObjectCommand(params));
    return new Promise((resolve) => {
      const bufs = [];
      data.Body.on('data', (chunk) => {
        bufs.push(chunk);
      });
      data.Body.on('end', () => {
        resolve(Buffer.concat(bufs));
      });
    });
  }
  return [];
}


export async function store(pdf, filename) {
  const s3Client = getS3Client();

  const params = {
    Bucket: bucketName,
    Key: filename,
    Body: pdf,
  };

  try {
    return await s3Client.send(new PutObjectCommand(params));
  } catch (err) {
    console.log("Error", err);
  }
}

export async function purge(predicate) {
  const s3Client = getS3Client();
  const params = {
    Bucket: bucketName,
  }
  const data = await s3Client.send(new ListObjectsV2Command(params));
  const objects = data.Contents?.map(({ Key}) => ({ Key }));

  if (objects?.length) {
    const options = {
      Bucket: bucketName,
      Delete: {
        Objects: objects.filter(predicate)
      }
    };
    await s3Client.send(new DeleteObjectsCommand(options));
  }
}
