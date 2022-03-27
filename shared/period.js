export function getPeriodString() {
  const now = new Date();
  return `${getMonth(now)}.${now.getFullYear()}`;
}

export function getFetchPeriod(type) {
  const now = new Date();
  const month = getMonth(now);

  switch (type) {
    case 'water':
      return `${month}-${now.getFullYear()}`;
    case 'electricity':
      return `${now.getFullYear()}-${month}-01 00:00:00`;
  }
}

function getMonth(now) {
  return now.getMonth() === 0 ? '12' : String(now.getMonth()).padStart(2, '0');
}

export function getCurrentPeriodFilename() {
  return getPeriodString() + '.pdf';
}
