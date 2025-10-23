export async function loginAndGetSession({ controller }) {
  const ua =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0';
  const baseHeaders = {
    'User-Agent': ua,
    Referer: 'https://lkk.mosobleirc.ru/',
  };

  // 1) Open main page to get session-cookie
  const mainRes = await fetch('https://lkk.mosobleirc.ru/', {
    method: 'GET',
    headers: {
      ...baseHeaders,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    signal: controller.signal,
  });
  const setCookie = mainRes.headers.get('set-cookie') || '';
  const sessionMatch = /session-cookie=([^;\s]+)/i.exec(setCookie);
  if (!sessionMatch) {
    const text = await mainRes.text().catch(() => '');
    throw new Error(
      `MosOblEIRC auth: session cookie not found. Status: ${
        mainRes.status
      }. Body snippet: ${text.slice(0, 200)}`,
    );
  }
  const sessionCookie = sessionMatch[1];

  const phone = process.env.MOSOBL_LOGIN;
  const password = process.env.MOSOBL_PASSWORD;
  if (!phone) throw new Error('MOSOBL_LOGIN is missing');
  if (!password) throw new Error('MOSOBL_PASSWORD is missing');

  const cookieHeader = `session-cookie=${sessionCookie}`;

  // 2) Account verification (optional but per spec)
  const statusUrl = new URL(
    'https://lkk.mosobleirc.ru/api/tenants-registration/v2/tenant/status',
  );
  statusUrl.searchParams.set('phone', phone);
  const statusRes = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      ...baseHeaders,
      Accept: '*/*',
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    signal: controller.signal,
  });
  if (!statusRes.ok) {
    const t = await statusRes.text().catch(() => '');
    throw new Error(
      `MosOblEIRC auth status failed: ${statusRes.status} ${statusRes.statusText} ${t}`,
    );
  }

  // 3) First-factor login
  const loginRes = await fetch(
    'https://lkk.mosobleirc.ru/api/clients/auth/login/first-factor',
    {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Accept: '*/*',
        'Content-Type': 'application/json',
        Origin: 'https://lkk.mosobleirc.ru',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        phone,
        password,
        loginMethod: 'PERSONAL_OFFICE',
      }),
      signal: controller.signal,
    },
  );
  if (!loginRes.ok) {
    const t = await loginRes.text().catch(() => '');
    throw new Error(
      `MosOblEIRC login failed: ${loginRes.status} ${loginRes.statusText} ${t}`,
    );
  }

  // 4) Second auth call to get tenant token in headers
  const propsRes = await fetch(
    'https://lkk.mosobleirc.ru/api/properties/auth',
    {
      method: 'GET',
      headers: {
        ...baseHeaders,
        Accept: '*/*',
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      signal: controller.signal,
    },
  );
  if (!propsRes.ok) {
    const t = await propsRes.text().catch(() => '');
    throw new Error(
      `MosOblEIRC second auth failed: ${propsRes.status} ${propsRes.statusText} ${t}`,
    );
  }
  return { cookieHeader };
}
