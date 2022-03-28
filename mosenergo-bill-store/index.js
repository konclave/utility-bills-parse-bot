import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand  } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';
import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { getPeriodString, getMonthByRusTitle } from "../shared/period.js";

dotenv.config();

const region = process.env['YC_REGION'];
const bucketName = process.env['YC_S3_BUCKET'];
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env['YC_S3_ACCESS_KEY'],
    secretAccessKey: process.env['YC_S3_SECRET_ACCESS_KEY'],
  },
  endpoint: 'https://storage.yandexcloud.net',
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

  const pdf = await downloadInvoice(attachmentUrl);
  const filename = await getFilename(pdf);
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

async function purgeStorage() {
  const params = {
    Bucket: bucketName,
  }
  const data = await s3Client.send(new ListObjectsV2Command(params));
  const objects = data.Contents?.map(({ Key}) => ({ Key }));
  if (objects?.length) {
    const options = {
      Bucket: bucketName,
      Delete: {
        Objects: objects
      }
    };
    await s3Client.send(new DeleteObjectsCommand(options));
  }
}

async function getFilename(pdf) {
  const strings = await getStringsFromPdf(pdf);
  const index = strings.findIndex((entry) => entry.includes('Сумма к оплате за'));
  if (index > -1) {
    const periodString = strings[index + 1];
    const [month, year] = periodString.split(' ');
    const monthNum = getMonthByRusTitle(month);
    const date = new Date(year, monthNum, 1, 0, 0, 0, 0);
    return getPeriodString(date);
  }
}
