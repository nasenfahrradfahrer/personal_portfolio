import { useId } from 'react'
import { formatYears } from '../utils/experience'
import ExperienceBar from './ExperienceBar'
import Reveal from './Reveal'
import './LanguageBars.css'

// Erfahrung je Programmiersprache in Jahren als teilweise gefüllte Leiste.
// Länge und Farbe der Leiste steigen mit der Erfahrung; die Jahre stehen zusätzlich als Text daneben.
// Jede Zeile blendet sich ein, sobald sie ins Bild scrollt, und baut dann ihre Leiste langsam auf
// (in der zweiten Spalte etwas versetzt).
export default function LanguageBars({ items }) {
  const baseId = useId()

  return (
    <div className="card language-bars">
      <ul className="language-bars__list">
        {items.map((item, i) => {
          const nameId = `${baseId}-${i}`

          return (
            <Reveal as="li" key={item.name} className="language" delay={(i % 2) * 150}>
              <div className="language__head">
                <span id={nameId} className="language__name">
                  {item.name}
                </span>
                <span className="language__years">{formatYears(item.years)}</span>
              </div>
              <ExperienceBar years={item.years} labelledBy={nameId} />
              {item.detail && <p className="language__detail">{item.detail}</p>}
            </Reveal>
          )
        })}
      </ul>
    </div>
  )
}
