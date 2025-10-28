import axios from 'axios';
import * as S3 from '../shared/s3.js';
import {
  getCurrentPeriodFilename,
  getMonth,
  getYear,
} from '../shared/period.js';
import { getFilenameFromPdf } from '../shared/parse-pdf.js';

export const filenamePrefix = 'electricity-';

const client = axios.create({
  baseURL: 'https://my.mosenergosbyt.ru',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: 'https://my.mosenergosbyt.ru/',
    Origin: 'https://my.mosenergosbyt.ru',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    Accept: 'application/json, text/plain, */*',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
});

export async function fetch() {
  const filename = getCurrentPeriodFilename(filenamePrefix);

  try {
    const fromStorage = await S3.fetch(filename); // Fetch from the Object Storage
    if (fromStorage?.length) {
      return fromStorage;
    }
  } catch (e) {
    console.log(
      '[electricity] failed to fetch persisted pdf from cloud storage:',
      JSON.stringify(e.message),
    );
  }

  const username = process.env.MOSENERGO_LOGIN;
  const password = process.env.MOSENERGO_PASSWORD;
  if (!username) {
    throw new Error('Username is missing!');
  }
  if (!password) {
    throw new Error('Password is missing!');
  }

  const loginData = await login(username, password);
  const { session } = loginData;

  if (session === undefined) {
    throw new Error(`Login to Mosenergosbyt failed: ${loginData.nm_result}`);
  }

  const { vl_params } = await fetchPdfRequestParams(session);
  const pdf = await fetchPdf(vl_params);

  const pdfFilename = await getFilenameFromPdf(pdf, filenamePrefix);
  if (!pdfFilename) {
    throw new Error('Cannot get the filename from the PDF');
  }

  try {
    await S3.purgeStorage([filenamePrefix]);
    await S3.store(pdf, pdfFilename);
  } catch (e) {
    console.log(
      '[electricity] failed to store pdf in cloud storage:',
      JSON.stringify(e.message),
    );
  }
  return pdf;
}

async function login(username, password) {
  const response = await client.get('/auth');
  let cookies = response.headers['set-cookie']?.join('; ');
  cookies = cookies
    .split(';')
    .filter((chunk) => chunk.split('=')[0].trim() === 'session-cookie')
    .join('; ');
  client.defaults.headers.common['Cookie'] = cookies;
  const data = new URLSearchParams();
  data.append('login', username);
  data.append('psw', password);
  data.append(
    'vl_device_info',
    '{"appver":"1.28.1","type":"browser","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15"}',
  );
  const options = {
    method: 'POST',
    data,
    params: { action: 'auth', query: 'login' },
    url: '/gate_lkcomu',
    headers: {
      Referer: 'https://my.mosenergosbyt.ru/auth',
    },
  };
  const loginResponse = await client(options);
  return loginResponse.data.data[0];
}

async function fetchPdfRequestParams(session) {
  const period = getFetchPeriod();
  const data = new URLSearchParams();
  data.append('dt_period', period);
  data.append('kd_provider', 1);
  data.append(
    'vl_provider',
    `{"id_kng": ${process.env.MOSENERGO_ID_KNG}, "nm_abn": ${process.env.MOSENERGO_NM_ABN}}`,
  );
  data.append('plugin', 'bytProxy');
  data.append('proxyquery', 'GetPrintBillLink');

  const params = { action: 'sql', query: 'bytProxy', session };
  const options = {
    method: 'POST',
    data,
    params,
    url: '/gate_lkcomu',
    headers: {
      Referer: `https://my.mosenergosbyt.ru/accounts/${process.env.MOSENERGO_ACCOUNT}/events/all-events`,
    },
  };
  const response = await client(options);
  return response.data.data[0];
}

async function fetchPdf(dataJson) {
  const dataObject = JSON.parse(dataJson);
  const data = new URLSearchParams();

  Object.entries(dataObject).forEach(([key, value]) => {
    data.append(key, value);
  });

  const params = { anstype: 'print' };
  const options = {
    method: 'POST',
    data,
    params,
    url: '/printServ',
    headers: {
      Referer: `https://my.mosenergosbyt.ru/accounts/${process.env.MOSENERGO_ACCOUNT}/events/all-events`,
    },
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
  };

  const response = await client(options);
  return response.data;
}

function getFetchPeriod() {
  const now = new Date();
  const month = getMonth(now);
  const year = getYear(now);

  return `${year}-${month}-01 00:00:00`;
}
