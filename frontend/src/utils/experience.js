import { color, interpolateLab, piecewise } from 'd3'
import i18n from '../i18n'
import { formatNumber } from './format'

// Volle Leiste = so viele Jahre Erfahrung. Mehr wird als volle Leiste dargestellt,
// der Text zeigt trotzdem den echten Wert.
export const EXPERIENCE_MAX = 4.5

// Farbverlauf für die Erfahrung: wenig = dunkles Violett, viel = helles Fuchsia.
// Auf dem dunklen Hintergrund geprüft: eine Farbfamilie, Helligkeit steigt gleichmäßig,
// auch das dunkle Ende hebt sich noch mit 2,65:1 vom Hintergrund ab.
export const EXPERIENCE_COLORS = ['#6d28d9', '#a855f7', '#f0abfc']

const ramp = piecewise(interpolateLab, EXPERIENCE_COLORS)

// Anteil 0–1 an EXPERIENCE_MAX
export const experienceRatio = (years) => Math.min(Math.max(years, 0) / EXPERIENCE_MAX, 1)

export const experienceColor = (years) => color(ramp(experienceRatio(years))).formatHex()

// Derselbe Verlauf als CSS-Gradient (für die Legende)
export const experienceGradient = `linear-gradient(90deg, ${Array.from({ length: 9 }, (_, i) =>
  color(ramp(i / 8)).formatHex(),
).join(', ')})`

export { formatNumber }

// "2,5 Jahre" bzw. "2.5 years" in der aktuellen Sprache
export const formatYears = (years) => i18n.t('units.years', { ns: 'ui', count: years, value: formatNumber(years) })
