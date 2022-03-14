import { fetch as fetchWater } from './fetch-water.js';
import { parse } from './parse-water.js';

export async function fetch() {
  try {
    const pdf = await fetchWater();
    return await parse(pdf);
  } catch(error) {
    return { text: '💧: Что-то пошло не так 💩: ' + JSON.stringify(error) };
  }
}
