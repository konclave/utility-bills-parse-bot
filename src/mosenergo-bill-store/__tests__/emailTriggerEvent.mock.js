export const emailTriggerEventMock = {
  messages: [
    {
      attachments: {
        bucket_id: '',
        keys: [],
      },
      headers: [
        {
          name: 'Received',
          values: [
            'from forward500a.mail.yandex.net (forward500a.mail.yandex.net. [178.154.239.80]) by serverless.yandexcloud.net (YandexCloudFunctions) with SMTP for <a1sh0rgmvlql1h91iq0a-hlblquhn@serverless.yandexcloud.net>; Tue, 28 Oct 2025 10:07:30 +0000 (UTC)',
            'from mail-nwsmtp-mxback-production-main-674.vla.yp-c.yandex.net (mail-nwsmtp-mxback-production-main-674.vla.yp-c.yandex.net [IPv6:2a02:6b8:c0f:4d92:0:640:8901:0]) by forward500a.mail.yandex.net (Yandex) with ESMTPS id E238E81BD9 for <a1sh0rgmvlql1h91iq0a-hlblquhn@serverless.yandexcloud.net>; Tue, 28 Oct 2025 13:07:30 +0300 (MSK)',
            'from mail.yandex.ru (2a02:6b8:c15:2813:0:640:4f4f:0 [2a02:6b8:c15:2813:0:640:4f4f:0]) by mail-nwsmtp-mxback-production-main-674.vla.yp-c.yandex.net (mxback/Yandex) with HTTPS id T7acl3Tsoa60-8oSzbMaa; Tue, 28 Oct 2025 13:07:30 +0300',
            'by mail-sendbernar-production-main-96.vla.yp-c.yandex.net (sendbernar/Yandex) with HTTPS id dc4a0ed8ddca3cba5a66da456f1e83af; Tue, 28 Oct 2025 13:07:30 +0300',
          ],
        },
        {
          name: 'Message-Id',
          values: ['<1851481761646045@mail.yandex.ru>'],
        },
        {
          name: 'In-Reply-To',
          values: ['<1ztpDbeoLDc@devinosender.com>'],
        },
        {
          name: 'Subject',
          values: ['Fwd: Электронный счет МосОблЕИРЦ за август 2025'],
        },
        {
          name: 'X-Yandex-Fwd',
          values: ['1'],
        },
        {
          name: 'Content-Type',
          values: ['text/html; charset=utf-8'],
        },
        {
          name: 'Mime-Version',
          values: ['1.0'],
        },
        {
          name: 'Dkim-Signature',
          values: [
            'v=1; a=rsa-sha256; c=relaxed/relaxed; d=yandex.ru; s=mail; t=1761646050; bh=eqvZ3IfMTOX206I9cQmNEuLGzwQ5fLELRa9JcH3DKew=; h=Message-Id:Date:Subject:In-Reply-To:To:From; b=uaUbSQqxD8RhJ42Jiwb1SblQB8qhSYjWDDZW3dtiGmcOnbCVpnIQiAhFTC7J8JkdN BXhPI4PPSOt1fIZmhpqETGz7H++0M/3N5Un0MUEb6WftZJBOfjVm1wYjHkSceoWyEI ps9m/na/Yyyp8tkjOC+BnO8R3X0LL8S+jzPPdvuo=',
          ],
        },
        {
          name: 'Date',
          values: ['Tue, 28 Oct 2025 13:07:30 +0300'],
        },
        {
          name: 'Content-Transfer-Encoding',
          values: ['base64'],
        },
        {
          name: 'X-Mailer',
          values: ['Yamail [ http://yandex.ru ] 5.0'],
        },
        {
          name: 'Authentication-Results',
          values: [
            'mail-nwsmtp-mxback-production-main-674.vla.yp-c.yandex.net; dkim=pass header.i=@yandex.ru',
          ],
        },
        {
          name: 'From',
          values: ['Васильев Иван <konclave@yandex.ru>'],
        },
        {
          name: 'To',
          values: [
            '"a1sh0rgmvlql1h91iq0a-hlblquhn@serverless.yandexcloud.net" <a1sh0rgmvlql1h91iq0a-hlblquhn@serverless.yandexcloud.net>',
          ],
        },
      ],
      received_at:
        '2025-10-28 10:07:30.957952728 +0000 UTC m=+4237890.433309929',
      request_id: 'eea72a1c-2121-47f9-861a-775e1d8ff528',
      source: 'user',
      version_id: 'd4emt9b00tru2veeud1v',
      message: `<div> </div><div> </div><div>-------- Пересылаемое сообщение --------</div><div>31.08.2025, 09:54, МосОблЕИРЦ (epd@mosobleirc.ru):</div><div>Кому: konclave@yandex.ru (konclave@yandex.ru);</div><div>Тема: Электронный счет МосОблЕИРЦ за август 2025;</div><div> </div><div><div style="margin:0px;padding:0px"><table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;height:100%;margin:0;padding:0;width:100%"><tbody><tr><td height="100%" valign="top"><div><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:800px"><tbody><tr><td align="left" style="padding:50px 6% 40px 6%"><img alt="moe_03.png" src="http://cdn.st.email4customers.com/lk/09c466ad-d1e9-434d-b9aa-c814a869157d_img_03.png" style="border:medium;height:77px;width:347px" /></td></tr><tr><td><img alt="image_02.png" src="http://cdn.st.email4customers.com/lk/550b7b22-9c1e-496c-adb0-fae59409469f_image_02.png" style="border:medium" /></td></tr><tr><td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:30px;padding:50px 55px 60px 55px"><p style="color:#004781;font-size:48px;font-weight:bold;margin-bottom:55px;margin-top:0px;text-transform:uppercase">Уважаемый Клиент!</p>Вам направлен <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=b2704250b0454c5194e0c356dc6a9594&amp;args=https%3a%2f%2fepd.mosobleirc.ru%2fjReport%2fsreport-query%2f738dc80f-83c4-4b32-94a7-18154797f7cc%2fPDF%3frparams%3d0E5ED57DCC966B435BF11055585BEE6D031D5B2DA62E958B4C64AFD18F8B0C03FE01C3FA1D9FEE0395C4E7ECE398715C65" rel="noopener noreferrer" target="_blank"> единый платежный документ</a> за <span style="white-space:nowrap">август 2025  </span> по лицевому счету 39058571, в соответствии с Вашим согласием на его получение по электронной почте*.</td></tr><tr><td style="padding-bottom:45px;padding-left:55px"><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody><tr><td><a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=6461c360c4a24740a19d3906c231bcb5&amp;args=https%3a%2f%2fpay.vbrr.ru%2fmes%2fmos_obl_eirc%2fregister.html%3fs%3d39058571%26email%3dkonclave%40yandex.ru%26withInsurance%3dtrue%26moeMerchantLogin%3dmoe_email_1" rel="noopener noreferrer" target="_blank"><img alt="moe_03.png" src="http://cdn.st.email4customers.com/lk/c5b5eee7-c95b-4c7f-86d6-511f70fc0abc_moe_03.png" style="border:medium" /></a></td><td width="45"> </td><td><a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=c8539ec72b3642b093712368b74daf3b&amp;args=https%3a%2f%2fpay.vbrr.ru%2fmes%2fmos_obl_eirc%2fregister.html%3fs%3d39058571%26email%3dkonclave%40yandex.ru%26withInsurance%3dlie%26moeMerchantLogin%3dmoe_email_1" rel="noopener noreferrer" target="_blank"><img alt="moe_06.png" src="http://cdn.st.email4customers.com/lk/e4ba568c-a85c-4a68-9731-7749b02ff9b6_moe_06.png" style="border:medium" /></a></td></tr></tbody></table></td></tr><tr><td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:28px;line-height:130%;padding-bottom:45px;padding-left:55px;padding-right:55px">Хотите первыми узнавать об акциях и выгодных предложениях? Подпишитесь на нашу рассылку в личном кабинете «МосОблЕИРЦ Онлайн» в настройках раздела «Профиль».</td></tr><tr><td style="padding-bottom:45px;padding-left:55px"><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody><tr><td><a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=964d3ee4ece34e9d88020a36be21a731&amp;args=https%3a%2f%2flkk.mosobleirc.ru%2f%23%2fentrance" rel="noopener noreferrer" target="_blank"><img alt="lk_btn.png" src="http://cdn.st.email4customers.com/lk/29fa244c-b7c5-4fe4-b6b4-84718a5c5c76_lk_btn.png" style="border:medium" /></a></td></tr></tbody></table></td></tr><tr><td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:30px;padding-bottom:20px;padding-left:55px;padding-right:55px">В <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=dd2ccfbb656e461ea14ec1b9e92adb7d&amp;args=https%3a%2f%2fxn--90aijkdmaud0d.xn--p1ai%2fpreimushchestva-lichnogo-kabineta%2f" rel="noopener noreferrer" target="_blank" style="color:#000000;text-decoration:underline">личном кабинете на сайте МосОблЕИРЦ</a> или в <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=18cde2b0a455426bad8906e9b72568e5&amp;args=https%3a%2f%2fxn--90aijkdmaud0d.xn--p1ai%2fchastnym-klientam%2fperedat-pokazaniya%2fmosobleirts-onlayn%2f" rel="noopener noreferrer" target="_blank" style="color:#000000;text-decoration:underline">мобильном приложении «МосОблЕИРЦ Онлайн»</a><br />Вы можете:</td></tr><tr><td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:30px;padding-bottom:35px;padding-left:55px;padding-right:55px"><ul type="square" style="color:#f78e1e;margin-bottom:0px;margin-left:20px;padding:0px"><li><span style="color:#000000">оплатить жилищно-коммунальные услуги без комиссии;</span></li><li><span style="color:#000000">передать показания приборов учета;</span></li><li><span style="color:#000000">получить выписку из финансово-лицевого счета;</span></li><li><span style="color:#000000">заказать справку об отсутствии задолженности;</span></li><li><span style="color:#000000">убедиться в справедливости и точности начислений, используя функцию «Умная платежка»;</span></li><li><span style="color:#000000">заказать товары и услуги для дома и семьи;</span></li><li><span style="color:#000000">получить купоны и подарки от программы <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=549c0505def445c18cdfbc8f521afd05&amp;args=https%3a%2f%2fxn--90aijkdmaud0d.xn--p1ai%2fclubonus%2f" rel="noopener noreferrer" target="_blank" style="color:#000000">«Коммунальный бонус»</a>;</span></li></ul></td></tr><tr><td align="left" style="color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:30px;padding-bottom:60px;padding-left:55px;padding-right:55px">Во избежание образования задолженности необходимо оплачивать сумму, указанную в квитанции, в полном объеме в рекомендованные сроки.<br /><br />В случае возникновения вопросов Вы можете ежедневно с 08:00 до 22:00 обращаться в контактный центр по телефону:<br />8 (499) 444 01 00.<br /><br />Благодарим за пользование нашими дистанционными сервисами и за подписку на электронный платежный документ.</td></tr><tr><td align="left" style="color:#004781;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:28px;font-weight:bold;line-height:130%;padding-bottom:90px;padding-left:60px;padding-right:55px">Мы делаем все необходимое, чтобы поддержать порядок в расчетах в отрасли ЖКХ - для пользы всех жителей Подмосковья.<br />Ваш МосОблЕИРЦ.</td></tr><tr><td bgcolor="#ffffff" style="padding-bottom:40px;padding-left:60px;padding-right:60px"><table border="0" cellpadding="0" cellspacing="0" style="width:680px"><tbody><tr><td style="border-top-color:#000000;border-top-style:solid;border-top-width:1px;color:#000000;font-family:'trebuchet ms' , 'tahoma' , 'geneva' , sans-serif;font-size:22px;line-height:130%;padding-bottom:40px;padding-top:20px"><em>Вы получили это сообщение, потому что выразили согласие на получение информации. Вы всегда можете отписаться от рассылок в личном кабинете <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=4da29491408b43b2a81c3a6ac7788062&amp;args=https%3a%2f%2fxn--90aijkdmaud0d.xn--p1ai%2f" rel="noopener noreferrer" target="_blank" style="color:#000000;text-decoration:underline">на сайте ООО «МосОблЕИРЦ»</a> или в <a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=2c1986349b594af78212dae06edfc0d9&amp;args=https%3a%2f%2fxn--90aijkdmaud0d.xn--p1ai%2fchastnym-klientam%2fperedat-pokazaniya%2fmosobleirts-onlayn%2f" rel="noopener noreferrer" target="_blank" style="color:#000000;text-decoration:underline">мобильном приложении «МосОблЕИРЦ Онлайн»</a>.<br />*Подписка на получение счета к оплате на e-mail означает согласие на отказ от получения платежных документов на бумажном носителе.<br /><br />Для корректного отображения текстовой информации в счете на мобильном устройстве рекомендуется использовать программу Adobe Acrobat Reader.</em></td></tr><tr><td align="right"><table align="right" border="0" cellpadding="0" cellspacing="0" style="width:85px"><tbody><tr><td align="left"><a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=d68471dafa444555abd7a1723ad0b755&amp;args=https%3a%2f%2fvk.com%2fmosobleirc_official" rel="noopener noreferrer" target="_blank"><img alt="img_09.png" src="http://cdn.st.email4customers.com/lk/8806cfd7-cadd-405f-ac8b-9a8260407611_img_09.png" style="border:medium" /></a></td><td align="right"><a href="https://click.email4customers.com/Link?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;linkId=18bd5ee3c5e14469b5890e3f1c0636de&amp;args=https%3a%2f%2ft.me%2fmosobleirz" rel="noopener noreferrer" target="_blank"><img alt="img_11.png" src="http://cdn.st.email4customers.com/lk/119ac1ce-6dcf-43c3-aca3-0df05cda5c1a_img_11.png" style="border:medium" /></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table><img height="1" src="https://click.email4customers.com/Track?messageId=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzIyNzQxODE3MzYxMzQ2NjQ5fQ.t3KD-PBYtWrTNxTVRnJDJCJwy_qBoqut83F4ntuJr-o&amp;args=0372e650b44645ca9682ce43bc300809" width="1" /></div></div><div> </div><div>-------- Конец пересылаемого сообщения --------</div>`,
    },
  ],
};
