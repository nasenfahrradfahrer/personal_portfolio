import {
  EXPERIENCE_COLORS,
  EXPERIENCE_MAX,
  experienceColor,
  experienceGradient,
  experienceRatio,
  formatNumber,
  formatYears,
} from '../utils/experience'
import './ExperienceBar.css'

// Leiste für Jahre an Erfahrung: Länge und Farbe steigen mit der Erfahrung.
// Innerhalb eines Reveal füllt sie sich erst, wenn es ins Bild scrollt.
export default function ExperienceBar({ years, labelledBy }) {
  return (
    <div
      className="experience-bar"
      role="meter"
      aria-labelledby={labelledBy}
      aria-valuemin={0}
      aria-valuemax={EXPERIENCE_MAX}
      aria-valuenow={Math.min(years, EXPERIENCE_MAX)}
      aria-valuetext={formatYears(years)}
    >
      <div
        className="experience-bar__fill"
        style={{
          '--fill': `${experienceRatio(years) * 100}%`,
          '--bar-color': experienceColor(years),
          '--bar-start': EXPERIENCE_COLORS[0],
        }}
      />
    </div>
  )
}
