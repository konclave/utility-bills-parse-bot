import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getPeriodString } from './period.js';

const bucketName = process.env['YC_S3_BUCKET'];

const KEEP_INVOICES_NUMBER = 12;

function isNotFoundError(err) {
  return (
    err?.name === 'NoSuchKey' ||
    err?.name === 'NotFound' ||
    err?.Code === 'NoSuchKey' ||
    err?.Code === 'NotFound'
  );
}

async function readBody(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  return new Promise((resolve, reject) => {
    const bufs = [];
    body.on('data', (chunk) => {
      bufs.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    body.on('end', () => {
      resolve(Buffer.concat(bufs));
    });
    body.on('error', reject);
  });
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

export async function fetch(filename) {
  const bucketName = process.env['YC_S3_BUCKET'];
  const s3Client = getS3Client();
  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    return await readBody(data.Body);
  } catch (err) {
    if (isNotFoundError(err)) {
      return Buffer.alloc(0);
    }

    throw err;
  }
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
    throw err;
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
    const objectsToDelete = objects.filter(predicate);
    if (objectsToDelete.length === 0) {
      return;
    }

    const options = {
      Bucket: bucketName,
      Delete: {
        Objects: objectsToDelete,
      },
    };
    await s3Client.send(new DeleteObjectsCommand(options));
  }
}

export function getFilenamesToKeep(prefixes) {
  const chunks = getPeriodString().split('-');
  const year = Number(chunks[chunks.length - 1]);
  const month = Number(chunks[chunks.length - 2]) + 1;

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

export async function purgeStorage(prefixes) {
  const keep = getFilenamesToKeep(prefixes);
  const predicate = (object) =>
    prefixes.some((prefix) => object['Key'].startsWith(prefix)) &&
    !keep.includes(object['Key']);
  return purge(predicate);
}
