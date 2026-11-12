import Reveal from '../components/Reveal'
import Section from '../components/Section'
import useContent from '../i18n/useContent'
import './Experience.css'

// Abschnitt 2: Werdegang als Zeitleiste
export default function Experience(props) {
  const { experience } = useContent()

  return (
    <Section {...props}>
      <ol className="timeline">
        {experience.map((item, i) => (
          <Reveal as="li" key={item.id} className="timeline__item" delay={i * 80}>
            <span className="timeline__marker" aria-hidden="true" />
            <p className="timeline__period">{item.period}</p>
            <article className="card card--interactive timeline__card">
              <h3>{item.title}</h3>
              <p className="timeline__org">{item.org}</p>
              {/* description ist HTML aus den eigenen Sprachdateien (ungefiltert, daher nur vertrauenswürdige Texte) */}
              <div className="timeline__text" dangerouslySetInnerHTML={{ __html: item.description }} />
              {item.tags?.length > 0 && (
                <ul className="chip-list timeline__tags">
                  {item.tags.map((tag) => (
                    <li key={tag} className="chip">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
