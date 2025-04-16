import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const region = process.env['YC_REGION'];
const bucketName = process.env['YC_S3_BUCKET'];

const KEEP_INVOICES_NUMBER = 3;

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

export async function fetch(filename) {
  const bucketName = process.env['YC_S3_BUCKET'];
  const s3Client = getS3Client();

  const listResponse = await s3Client.send(
    new ListObjectsV2Command({ Bucket: bucketName }),
  );
  const hasFile = listResponse.Contents?.some(({ Key }) => Key === filename);

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

  return Buffer.concat([]);
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
    console.log('Error', err);
  }
}

export async function purge(predicate) {
  const s3Client = getS3Client();
  const params = {
    Bucket: bucketName,
  };
  const data = await s3Client.send(new ListObjectsV2Command(params));
  const objects = data.Contents?.map(({ Key }) => ({ Key }));

  if (objects?.length) {
    const options = {
      Bucket: bucketName,
      Delete: {
        Objects: objects.filter(predicate),
      },
    };
    await s3Client.send(new DeleteObjectsCommand(options));
  }
}

function getFilenamesToKeep(filename, prefixes) {
  const chunks = filename.split('.')[0].split('-');
  const year = Number(chunks[chunks.length - 1]);
  const month = Number(chunks[chunks.length - 2]);

  const keep = [];

  for (let i = 0; i < KEEP_INVOICES_NUMBER; i++) {
    let prevMonth = month - i;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth += 12;
      prevYear -= 1;
    }

    for (let prefix of prefixes) {
      keep.push(
        `${prefix}${String(prevMonth).padStart(2, '0')}-${prevYear}.pdf`,
      );
    }
  }

  return keep;
}

export async function purgeStorage(filename, prefixes) {
  const keep = getFilenamesToKeep(filename, prefixes);
  const predicate = (object) =>
    prefixes.some((prefix) => object['Key'].startsWith(prefix)) &&
    !keep.includes(object['Key']);
  return purge(predicate);
}
