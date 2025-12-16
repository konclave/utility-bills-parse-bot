import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleEmailEvent } from '../parse-email.js';
import { emailTriggerEventMock } from './emailTriggerEvent.mock.js';

const __dirname = import.meta.dirname;

describe('handleEmailEvent', () => {
  it('should get url from the email event object from Mosobleirc email forward', () => {
    const result = handleEmailEvent(emailTriggerEventMock);
    assert.strictEqual(result.type, 'MOSOBLEIRC');
    assert.strictEqual(
      result.url,
      'https://epd.mosobleirc.ru/jReport/sreport-query/738dc80f-83c4-4b32-94a7-18154797f7cc/PDF?rparams=0E5ED57DCC966B435BF11055585BEE6D031D5B2DA62E958B4C64AFD18F8B0C03FE01C3FA1D9FEE0395C4E7ECE398715C65',
    );
  });

  it('should get url from the email event object from Mosenergo email forward', () => {
    const emailTriggerMosenergoEventMockJson = readFileSync(
      resolve(__dirname, './mosenergoMessages.json'),
      'utf8',
    );
    const emailTriggerMosenergoEventMock = JSON.parse(
      emailTriggerMosenergoEventMockJson,
    );
    const result = handleEmailEvent(emailTriggerMosenergoEventMock);
    assert.strictEqual(result.type, 'MOSENERGO');
    assert.strictEqual(
      result.url,
      'https://my.mosenergosbyt.ru/printServ?anstype=print&params=60BB97767DDD6BD6BD55DC7DD6954BF6B899A8A9E751871A9D7EE229088F93A5AE6AA365B8F7834B6708A6748C4373780C91911D84A8AFC305E9828506E9DA564382C76EAA5CD8E0453E212F93111075E4AC1BDB2DF244655271E80F23C0191232F2DBADE58B2C27DD1BDE49D9150A2F0BF4F35FAAEC1A6708AA740929CD7CBF2B276DC5FDAD3156D6C2331EAADAB8A2AF4A194E790044B4CCC09E84E0712511B8637522F2322B65FA46E6F973ECE5427B1984112CE73A76A34A7061BD3FAD51DF22933A77DEAA0B8144DEE215A0AC2FF312A816C55D86DCC4144599C86326F60BF41AABE954E7DEC5919119B5914BF088F904752A930443BF2894BC0970E4795AC993AB300DD8D286A9B5824AF8CCE7E86E5B4C62A33229EFAA8EE6FE7268BBF2B75DFE4B6C056741A8F1E111B4BCF82AE0349B',
    );
  });
});
