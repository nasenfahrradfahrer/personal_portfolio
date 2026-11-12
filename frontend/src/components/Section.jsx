import { accentStyle } from '../utils/accent'
import Icon from './Icon'
import Reveal from './Reveal'
import './Section.css'

// Gemeinsamer Rahmen für alle Inhaltsabschnitte (Nummer, Titel, Einleitung).
// icon: Symbol, das groß und in der Abschnittsfarbe hinter der Überschrift angedeutet wird
export default function Section({ id, index, nav, title, lead, accent, icon, className = '', children }) {
  const headingId = `${id}-title`

  return (
    <section
      id={id}
      className={`section${className ? ` ${className}` : ''}`}
      style={accentStyle(accent)}
      aria-labelledby={headingId}
    >
      <div className="container">
        <Reveal as="header" className="section__head">
          {icon && (
            <span className="section__icon" aria-hidden="true">
              <Icon name={icon} />
            </span>
          )}
          <p className="section__eyebrow">
            <span>{String(index).padStart(2, '0')}</span>
            {nav}
          </p>
          <h2 id={headingId}>{title}</h2>
          {lead && <p className="section__lead">{lead}</p>}
        </Reveal>

        {children}
      </div>
    </section>
  )
}
