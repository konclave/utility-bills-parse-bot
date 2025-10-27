import { getTotal } from '../shared/calculations.js';
import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { filenamePrefix } from './fetch-water.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

const waterBillConfig = [
  { title: 'Hot water', sequence: ['м', '3', 'ГВС', ':', 'компонент'] },
  { title: 'Hot water heating', sequence: ['ГКал', 'ГВС', ':', 'компонент'] },
  { title: 'Cold water', sequence: ['м', '3', 'Холодная', 'вода'] },
  { title: 'Water drain', sequence: ['м', '3', 'Водоотведение'] },
];

// Finds the sequence and then searches back from the sequence start for
// the first NaN value and returns the first number after that value (NaN index + 1)
function getValueBySequence(text, sequence) {
  if (!text || !sequence || sequence.length === 0) {
    return 'Not found';
  }

  let idx = -1;
  do {
    idx = text.indexOf(sequence[0]);
    let i = 1;
    while (i < sequence.length) {
      if (text[idx + i] !== sequence[i]) {
        break;
      }
      i++;
    }
    if (i === sequence.length) {
      break;
    } else {
      text = text.slice(idx + 1);
    }
  } while (idx !== -1);
  if (idx === -1) {
    return '';
  }
  let i = 1;
  while (!Number.isNaN(Number(text[idx - i].replace(' ', ''))) && i < idx) {
    i++;
  }
  return text[idx - i + 1].replace(' ', '');
}

export async function parse(binary) {
  if (binary?.length === 0) {
    return { text: '💧: Счёта пока что нет 🙁' };
  }
  const strings = await getStringsFromPdf(binary);
  const result = waterBillConfig.map((entry) =>
    getValueBySequence(strings, entry.sequence),
  );
  const total = getTotal(result);
  const intermediate = result.join(' + ');
  const fileTitle = getCurrentPeriodFilename(`${filenamePrefix}bill-`);
  return {
    text: `💧: ${total} ₽\n(${intermediate})`,
    value: total,
    fileTitle,
    fileBuffer: binary,
  };
}
