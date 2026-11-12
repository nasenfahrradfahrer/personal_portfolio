import { currentLocale } from '../i18n'

const formats = new Map()

// Zahl im Format der aktuellen Sprache (2,5 bzw. 2.5); options wie bei Intl.NumberFormat.
// Jedes Format wird je Sprache nur einmal erzeugt.
export function formatNumber(value, options = { maximumFractionDigits: 2 }) {
  const locale = currentLocale()
  const key = `${locale}|${JSON.stringify(options)}`
  if (!formats.has(key)) formats.set(key, new Intl.NumberFormat(locale, options))
  return formats.get(key).format(value)
}

// Feste Zahl an Nachkommastellen, z. B. fixed(1)(92) -> "92,0" bzw. "92.0"
export const fixed = (digits) => (value) =>
  formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })
