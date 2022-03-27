import { PdfReader } from 'pdfreader';

export async function getStringsFromPdf(binary) {
  const buffer = new Buffer.from(binary);
  return await readPdfToArray(buffer);
}

async function readPdfToArray(buffer) {
  return new Promise((resolve, reject) => {
    const pdfArray = new Array();
    new PdfReader().parseBuffer(buffer,  (err, item) => {
      if (err) {
        reject(err);
      }
      if (!item) {
        resolve(pdfArray);
      }
      if (item?.text) {
        pdfArray.push(item.text);
      }
    });
  });
}

function onError(error) {
  console.error(error);
}
