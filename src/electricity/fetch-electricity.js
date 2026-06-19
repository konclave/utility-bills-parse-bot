import axios from 'axios';
import { getMonth, getYear } from '../shared/period.js';

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

/**
 * Fetches the current-period electricity bill PDF from the Mosenergosbyt API.
 * @returns {Promise<Buffer>} Raw PDF binary
 */
export async function fetch() {
  const username = process.env.MOSENERGO_LOGIN;
  const password = process.env.MOSENERGO_PASSWORD;
  if (!username) throw new Error('Username is missing!');
  if (!password) throw new Error('Password is missing!');

  const loginData = await login(username, password);
  const { session } = loginData;
  if (session === undefined) {
    throw new Error(`Login to Mosenergosbyt failed: ${loginData.nm_result}`);
  }

  const { vl_params } = await fetchPdfRequestParams(session);
  return fetchPdf(vl_params);
}

/**
 * Authenticates with the Mosenergosbyt API and returns the session object.
 * @param {string} username - Mosenergosbyt account login
 * @param {string} password - Mosenergosbyt account password
 * @returns {Promise<{session?: string, nm_result?: string}>}
 */
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
    headers: { Referer: 'https://my.mosenergosbyt.ru/auth' },
  };
  const loginResponse = await client(options);
  return loginResponse.data.data[0];
}

/**
 * Fetches the print-bill link parameters for the current billing period.
 * @param {string} session - Active Mosenergosbyt session token
 * @returns {Promise<{vl_params: string}>}
 */
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

/**
 * Submits the print request with the given parameters and returns the PDF binary.
 * @param {string} dataJson - JSON-encoded PDF request parameters from fetchPdfRequestParams
 * @returns {Promise<Buffer>} Raw PDF binary
 */
async function fetchPdf(dataJson) {
  const dataObject = JSON.parse(dataJson);
  const data = new URLSearchParams();
  Object.entries(dataObject).forEach(([key, value]) => data.append(key, value));

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

/**
 * Returns the billing period string for the current month, formatted as 'YYYY-MM-01 00:00:00'.
 * @returns {string}
 */
function getFetchPeriod() {
  const now = new Date();
  const month = getMonth(now);
  const year = getYear(now);
  return `${year}-${month}-01 00:00:00`;
}
