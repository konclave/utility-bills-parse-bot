import { readFileSync, writeFileSync } from 'node:fs'
import { getStringsFromPdf } from './shared/parse-pdf.js';
import { argv } from 'node:process';

async function main() {
  if (argv.length < 4) {
    console.log('PDF and dump files name with path are required.');
    exit(0);
  }
  const pdfFilename = argv[2];
  const dumpFilename = argv[3];

  const pdfBuffer = readFileSync(pdfFilename);
  const strings = await getStringsFromPdf(pdfBuffer);
  
  writeFileSync(dumpFilename, JSON.stringify(strings, undefined, 2));
}

main();
