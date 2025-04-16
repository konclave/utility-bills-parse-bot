import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import { getTotal } from '../shared/calculations.js';
import { getPeriodString } from '../shared/period.js';

export async function getValues({ processMessage, handleError }) {
  const billPromises = [water.fetch(), electricity.fetch()];

  const withHandlers = billPromises.map(async (promise) => {
    try {
      const result = await promise;
      await processMessage(result);
      return result;
    } catch (error) {
      return handleError(error);
    }
  });

  return Promise.all(withHandlers).then((messages) => {
    const total = getTotal(messages.map((message) => message.value || 0));
    return processMessage({ text: `Всего за ${getPeriodString()}: ${total}₽` });
  });
}
