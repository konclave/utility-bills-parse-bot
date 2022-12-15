import axios from 'axios';
import cheerio from 'cheerio';
import { getMonth, getCurrentPeriodFilename } from '../shared/period.js';
import * as S3 from '../shared/s3.js';

const client = axios.create({
  baseURL: 'https://lk.myuk.ru',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: 'https://lk.myuk.ru/',
    Origin: 'https://lk.myuk.ru',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
});

export const filenamePrefix = 'water-';

export async function fetch() {
  const filename = getCurrentPeriodFilename(filenamePrefix);

  const persisted = await S3.fetch(filename);
  if (persisted?.length) {
    return persisted;
  }

  const username = process.env.LOGIN;
  const password = process.env.PASSWORD;
  if (!username) {
    throw new Error('Username is missing!');
  }
  if (!password) {
    throw new Error('Password is missing!');
  }
  const accountHtml = await login(username, password);
  const params = getPdfRequestParams(accountHtml);
  const pdf = await fetchPdf(username, params);

  await S3.purgeStorage(filename, [filenamePrefix]);
  await S3.store(pdf, filename);

  return pdf;
}

async function login(username, password) {
  const response = await client.get('/');
  const cookies = response.headers['set-cookie']?.join('; ');
  client.defaults.headers.common['Cookie'] = cookies;

  const $login = cheerio.load(response.data);
  const csrf = $login('input[name="_csrf"]').attr('value');

  const params = new URLSearchParams();
  params.append('ehm_nme', username);
  params.append('ehm_sec', password);
  params.append('_csrf', csrf);

  const options = {
    method: 'POST',
    data: params,
    url: '/login',
  };
  const { data } = await client(options);
  return data;
}

function getPdfRequestParams(html) {
  const $ = cheerio.load(html);
  const $form = $(
    '#billings > table input[type="submit"]:not(:disabled)'
  ).parent();
  const tt = $('input[name="tt"]', $form).attr('value');
  const period = getFetchPeriod();
  const params = new URLSearchParams();
  params.append('dt', period);
  params.append('tt', tt);

  return params;
}

async function fetchPdf(username, data) {
  const options = {
    method: 'POST',
    headers: {
      Cookie:
        client.defaults.headers.common['Cookie'] +
        `EpdInfoDId=0; EpdInfoName=${username};`,
    },
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    data,
    url: '/invoice',
  };
  
  try {
    const { data } = await client(options);
    return data;
  } catch (error) {
    console.log(JSON.stringify({origin: '💧 fetch pdf', error}));
    throw error;
  }
}

function getFetchPeriod() {
  const now = new Date();
  const month = getMonth(now);

  return `${month}-${now.getFullYear()}`;
}
