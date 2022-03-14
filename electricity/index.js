import { fetch as fetchElectricity } from './fetch-electricity.js';
import { parse } from './parse-electricity.js';

export async function fetch() {
  try {
    const pdf = await fetchElectricity();
    return await parse(pdf);
  } catch(error) {
    return { text: '⚡️: Что-то пошло не так 💩: ' + JSON.stringify(error) };
  }
}
