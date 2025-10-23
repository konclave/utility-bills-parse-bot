export function getPeriodString() {
  const now = new Date();
  return `${getMonth(now)}-${getYear(now)}`;
}

export function getMonth(now) {
  return now.getMonth() === 0 ? '12' : String(now.getMonth()).padStart(2, '0');
}

export function getYear(now) {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

export function getCurrentPeriodFilename(prefix = '') {
  return prefix + getPeriodString() + '.pdf';
}

export function getMonthByRusTitle(monthStr) {
  switch (monthStr.toLowerCase()) {
    case 'январь':
      return 0;
    case 'февраль':
      return 1;
    case 'март':
      return 2;
    case 'апрель':
      return 3;
    case 'май':
      return 4;
    case 'июнь':
      return 5;
    case 'июль':
      return 6;
    case 'август':
      return 7;
    case 'сентябрь':
      return 8;
    case 'октябрь':
      return 9;
    case 'ноябрь':
      return 10;
    case 'декабрь':
      return 11;
    default:
      return -1;
  }
}

export function getTodayISODate() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
