import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handleEmailEvent } from '../parse-email.js';
import { emailTriggerEventMock } from './emailTriggerEvent.mock.js';

describe('handleEmailEvent', () => {
  it('should get url from the email event object from Mosobleirc email forward', () => {
    const result = handleEmailEvent(emailTriggerEventMock);
    assert.strictEqual(result.type, 'MOSOBLEIRC');
    assert.strictEqual(
      result.url,
      'https://epd.mosobleirc.ru/jReport/sreport-query/738dc80f-83c4-4b32-94a7-18154797f7cc/PDF?rparams=0E5ED57DCC966B435BF11055585BEE6D031D5B2DA62E958B4C64AFD18F8B0C03FE01C3FA1D9FEE0395C4E7ECE398715C65',
    );
  });
});
