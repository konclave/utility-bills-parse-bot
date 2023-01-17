export function getTotal(values) {
  if (!Array.isArray(values)) {
    return 0;
  }

  return values.reduce((acc, item) => acc + Number(item) * 100, 0) / 100;
}
