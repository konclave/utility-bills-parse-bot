import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
import { getTotal } from '../shared/calculations.js';
import { getPeriodString } from '../shared/period.js';

export async function getValues({ processMessage, handleError }) {
  const billPromises = [water.fetch(), electricity.fetch(), mosobleirc.fetch()];

  const withHandlers = billPromises.map(async (promise) =>
    promise.then(processMessage).catch(handleError),
  );

  return Promise.all(withHandlers).then((messages) => {
    const total = getTotal(
      messages.flat().flatMap((message) => message.values || 0),
    );
    return processMessage({ text: `Всего за ${getPeriodString()}: ${total}₽` });
  });
}
