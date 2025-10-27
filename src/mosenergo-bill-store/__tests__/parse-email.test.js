import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handleEmailEvent, fromMosobleirc  } from "../parse-email.js";

const mockMosobleircHtml = `<td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:30px;padding:50px 55px 60px 55px">
						<p style="color:#004781;font-size:48px;font-weight:bold;margin-bottom:55px;margin-top:0px;text-transform:uppercase">Уважаемый Клиент!</p>
						Вам направлен <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzI4NzQ5Mzg1NjkyNTcwNzk5fQ.YVDPoOkTb93q3r-8Dp_UC0lZWx6sMKBB4dbrPVkXecI&amp;linkId=30edd25642fc48a489422105e0a94816&amp;args=https%3a%2f%2fepd.mosobleirc.ru%2fjReport%2fsreport-query%2f738dc80f-83c4-4b32-94a7-18154797f7cc%2fPDF%3frparams%3d0E5ED57DCC966B435BF11055585BEE6D031D5B2DA62E958B4C64AFD18F8B0C03FE001370059703FDABD508BE282D33EB11" rel="noopener noreferrer" target="_blank" data-link-id="40"> единый платежный документ</a> за <span style="white-space:nowrap">сентябрь&nbsp;2025&nbsp; </span> по лицевому счету <span class="wmi-callto">39058571</span>, в соответствии с Вашим согласием на его получение по электронной почте*.</td>`;

describe('handleEmailEvent', () => {
  it('should get url from the email event object from Mosobleirc email forward', () => {
    const mockEvent = {
      messages: [
        {
          headers: [{
            name: 'From',
            values: [`John Doe <${fromMosobleirc}>`]
          }],
          message: mockMosobleircHtml
        }
      ]
    }
    const result = handleEmailEvent(mockEvent);
    
    assert.strictEqual(result.type, 'MOSOBLEIRC');
    assert.strictEqual(result.url, 'https://epd.mosobleirc.ru/jReport/sreport-query/738dc80f-83c4-4b32-94a7-18154797f7cc/PDF?rparams=0E5ED57DCC966B435BF11055585BEE6D031D5B2DA62E958B4C64AFD18F8B0C03FE001370059703FDABD508BE282D33EB11');
  });
});
