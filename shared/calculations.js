export function getTotal(values) {
  return values.reduce((acc, item) => acc + Number(item) * 100, 0) / 100;
}
