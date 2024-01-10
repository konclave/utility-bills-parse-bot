import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import { getTotal } from '../shared/calculations.js';

export function getValues({ processMessage, handleError }) {
  const billPromises = [water.fetch(), electricity.fetch()];

  const withHandlers = billPromises.map((promise) =>
    promise.then(processMessage).catch(handleError),
  );

  Promise.all(withHandlers).then((messages) => {
    const total = getTotal(messages.map((message) => message.value || 0));
    return processMessage({ text: `Всего: ${total}₽` });
  });
}
