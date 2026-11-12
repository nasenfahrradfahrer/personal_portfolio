import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon'
import LanguageBars from '../components/LanguageBars'
import ProjectModal from '../components/ProjectModal'
import Reveal from '../components/Reveal'
import Section from '../components/Section'
import TechStackSunburst from '../components/TechStackSunburst'
import useContent from '../i18n/useContent'
import { accentStyle } from '../utils/accent'
import './Skills.css'

// Abschnitt 3: Kompetenzen und Projekte
export default function Skills(props) {
  const { t } = useTranslation()
  const { languages, projects } = useContent()
  // Index des Projekts, dessen Detailansicht offen ist
  const [openProject, setOpenProject] = useState(null)

  return (
    <Section {...props}>
      <div className="skills__block">
        <h3 className="skills__subtitle">{t('skills.competencies')}</h3>
        <Reveal>
          <TechStackSunburst />
        </Reveal>
      </div>

      <div className="skills__block">
        <h3 className="skills__subtitle">{t('skills.languages')}</h3>
        <Reveal>
          <LanguageBars items={languages} />
        </Reveal>
      </div>

      <div className="skills__block">
        <h3 className="skills__subtitle">{t('skills.projects')}</h3>
        <div className="projects">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 80} style={accentStyle(project.accent)}>
              <article className="card card--interactive project">
                <div className="project__media">
                  {project.image ? (
                    <img src={project.image} alt="" />
                  ) : (
                    <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  )}
                </div>
                <div className="project__body">
                  <h4>{project.title}</h4>
                  <p>{project.description}</p>
                  <ul className="chip-list">
                    {project.tags.map((tag) => (
                      <li key={tag} className="chip">
                        {tag}
                      </li>
                    ))}
                  </ul>
                  {project.details ? (
                    <button type="button" className="btn project__link" onClick={() => setOpenProject(i)}>
                      {t('skills.details')}
                      <Icon name="arrowRight" size={16} />
                    </button>
                  ) : (
                    project.href && (
                      <a href={project.href} className="btn project__link">
                        {t('skills.details')}
                        <Icon name="arrowRight" size={16} />
                      </a>
                    )
                  )}
                </div>
              </article>
              {project.details && (
                <ProjectModal
                  open={openProject === i}
                  onClose={() => setOpenProject(null)}
                  project={project}
                  number={String(i + 1).padStart(2, '0')}
                />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
