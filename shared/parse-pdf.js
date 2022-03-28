import pdfParser from 'pdf-parser';

export async function getStringsFromPdf(binary) {
  const buffer = new Buffer.from(binary);
  return await readPdfToArray(buffer);
}

async function readPdfToArray(buffer) {
  return new Promise((resolve, reject) => {
    pdfParser.pdf2json(buffer, (error, pdf) => {
      if (error != null) {
        reject(error);
      } else {
        resolve(pdf.pages.flatMap((page) => page.texts.map(({text}) => text)));
      }
    });
  });
}
