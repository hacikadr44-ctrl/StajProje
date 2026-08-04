export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return '0,00'
  return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
