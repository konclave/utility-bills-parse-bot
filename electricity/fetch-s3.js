import {S3Client, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { getCurrentPeriodFilename } from "../shared/period.js";

dotenv.config();

export async function fetchFromS3() {
  const s3Client = getS3Client();
  const result = await getS3Object(s3Client);
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

async function getS3Object(s3Client) {
  const bucketName = process.env['YC_S3_BUCKET'];
  const filename = getCurrentPeriodFilename();
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
