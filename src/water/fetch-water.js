import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'node:https';
import { getMonth, getYear } from '../shared/period.js';

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
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

export const filenamePrefix = 'water-';

/**
 * Fetches the current-period water bill PDF from the provider API.
 * @returns {Promise<Buffer>} Raw PDF binary
 */
export async function fetch() {
  const username = process.env.LOGIN;
  const password = process.env.PASSWORD;
  if (!username) throw new Error('Username is missing!');
  if (!password) throw new Error('Password is missing!');
  const accountHtml = await login(username, password);
  const params = getPdfRequestParams(accountHtml);
  return fetchPdf(username, params);
}

/**
 * Logs in to the water provider portal and returns the account page HTML.
 * @param {string} username - Account login
 * @param {string} password - Account password
 * @returns {Promise<string>} Account page HTML
 */
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

  const options = { method: 'POST', data: params, url: '/login' };
  const { data } = await client(options);
  return data;
}

/**
 * Extracts the PDF request parameters (billing period, account token) from the account page HTML.
 * @param {string} html - Account page HTML
 * @returns {URLSearchParams}
 */
function getPdfRequestParams(html) {
  const $ = cheerio.load(html);
  const $form = $('#billings > table input[type="submit"]:not(:disabled)').parent();
  const tt = $('input[name="tt"]', $form).attr('value');
  const period = getFetchPeriod();
  const params = new URLSearchParams();
  params.append('dt', period);
  params.append('tt', tt);
  return params;
}

/**
 * Submits the invoice request and returns the PDF binary.
 * @param {string} username - Account login (used to set invoice cookie)
 * @param {URLSearchParams} data - PDF request parameters
 * @returns {Promise<Buffer>} Raw PDF binary
 */
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
    console.log(JSON.stringify({ origin: '💧 fetch pdf', error }));
    throw error;
  }
}

/**
 * Returns the billing period string for the current month, formatted as 'MM-YYYY'.
 * @returns {string}
 */
function getFetchPeriod() {
  const now = new Date();
  const month = getMonth(now);
  const year = getYear(now);
  return `${month}-${year}`;
}
