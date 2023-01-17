import { getTotal } from '../shared/calculations.js';
import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { filenamePrefix } from './fetch-water.js';

function parseWaterBill(text) {
  const result = [
    getHotWaterLiquid(text),
    getHotWaterEnergy(text),
    getColdWaterLiquid(text),
    getWaterDrain(text),
  ];
  return result;
}

function getHotWaterLiquid(text) {
  const sequence = ['м', '3', 'ГВС', ':', 'ХВ', 'для', 'ГВС'];
  return getValueBySequence(text, sequence);
}

function getHotWaterEnergy(text) {
  const sequence = ['ГКал', 'ГВС', ':', 'ТЭ', 'для', 'ГВС'];
  return getValueBySequence(text, sequence);
}

function getColdWaterLiquid(text) {
  const sequence = ['м', '3', 'Холодная', 'вода'];
  return getValueBySequence(text, sequence);
}

function getWaterDrain(text) {
  const sequence = ['м', '3', 'Водоотведение'];
  return getValueBySequence(text, sequence);
}

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
  while (!Number.isNaN(Number(text[idx - i])) && i < idx) {
    i++;
  }
  return text[idx - i + 1];
}

export async function parse(binary) {
  if (binary.length === 0) {
    return { text: '💧: Счёта пока что нет 🙁' };
  }
  const strings = await getStringsFromPdf(binary);
  const result = parseWaterBill(strings);
  const total = getTotal(result);
  const intermediate = result.join(' + ');
  return {
    text: `💧: ${total} ₽\n(${intermediate})`,
    value: total,
    fileTitle: filenamePrefix + 'bill.pdf',
    fileBuffer: binary,
  };
}
