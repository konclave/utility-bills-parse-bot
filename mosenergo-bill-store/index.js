import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand  } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';
import { getPeriodString } from '../shared/period.js';

dotenv.config();

const region = process.env['YC_REGION'];
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env['YC_S3_ACCESS_KEY'],
    secretAccessKey: process.env['YC_S3_SECRET_ACCESS_KEY'],
  }
});

const client = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
});

export async function webhookCallbak(event) {
  const data = JSON.parse(event.body);
  const { mail_attachments_0: attachmentUrl } = data;

  const pdf = downloadInvoice(attachmentUrl);
  const filename = getPeriodString() + '.pdf';

  await purgeStorage();
  await store(pdf, filename);
}

async function downloadInvoice(url) {
  const options = {
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
  };

  const response = await client(options);
  return response.data;
}

async function store(pdf, filename) {
  const params = {
    Bucket: 'electricity_invoices',
    Key: filename,
    Body: pdf,
  };
  try {
    const results = await s3Client.send(new PutObjectCommand(params));
    return results; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
}

async function purgeStorage() {
  const params = {
    Bucket: 'electricity_invoices',
  }
  const data = await s3Client.send(new ListObjectsV2Command(params));
  const objects = [];
  for(var k in data){
    objects.push({Key : data[k].fileName});
  }
  const options = {
    Bucket: process.env.AWS_BUCKET,
    Delete: {
      Objects: objects
    }
  };
  await s3Client.send(new DeleteObjectCommand(options));
}
