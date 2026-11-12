import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { chat } from '../data/content'
import { accentStyle } from '../utils/accent'
import { openChat } from '../utils/chatEvents'
import FrameSelectionDemo from './FrameSelectionDemo'
import Icon from './Icon'
import './ProjectModal.css'

// Interaktive Elemente, die ein Projekt über details.demo.type einbinden kann
const demos = {
  frameSelection: FrameSelectionDemo,
}

// Detailansicht eines Projekts (Inhalt: project.details aus src/i18n/useContent.js). Wie das Video-Overlay
// ein <dialog>: Fokus bleibt im Overlay, Escape schließt, danach springt der Fokus zurück zu
// „Details ansehen“. Kopf- und Fußleiste stehen fest, nur der Inhalt dazwischen scrollt.
// Mobil kommt das Overlay als Blatt von unten, ab Tablet mittig.
export default function ProjectModal({ open, onClose, project, number }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const titleId = useId()
  const { details } = project
  const Demo = demos[details.demo?.type]

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) {
      bodyRef.current.scrollTop = 0
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const tryChat = () => {
    onClose()
    openChat()
  }

  const meta = [t('project.number', { number }), details.meta].filter(Boolean).join(' · ')

  return (
    <dialog
      ref={dialogRef}
      className="project-modal"
      style={accentStyle(project.accent)}
      aria-labelledby={titleId}
      onClose={onClose}
      // Klick auf die abgedunkelte Fläche (nicht auf den Inhalt) schließt
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="project-modal__panel">
        <header className="project-modal__head">
          <div>
            <p className="project-modal__meta">{meta}</p>
            <h2 id={titleId} className="project-modal__title">
              {project.title}
            </h2>
          </div>
          <button type="button" className="project-modal__close" onClick={onClose} aria-label={t('project.close')}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="project-modal__body" ref={bodyRef}>
          <p className="project-modal__hint">
            <Icon name="monitor" size={18} />
            {t('project.mobileHint')}
          </p>

          {details.summary && <p className="project-modal__summary">{details.summary}</p>}

          {details.facts?.length > 0 && (
            <dl className="project-facts">
              {details.facts.map((fact) => (
                <div key={fact.label} className="project-fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {Demo && (
            <section>
              <h3 className="project-modal__heading">{details.demo.title}</h3>
              <Demo />
            </section>
          )}

          {details.flow && (
            <section>
              <h3 className="project-modal__heading">{details.flow.title}</h3>
              <ol className="project-flow">
                {details.flow.steps.map((step, i) => (
                  <li key={step.title} className="project-flow__step">
                    <span className="project-flow__icon" aria-hidden="true">
                      <Icon name={step.icon} size={18} />
                    </span>
                    <div>
                      <h4 className="project-flow__title">
                        <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        {step.title}
                      </h4>
                      <p className="project-flow__text">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {details.sections?.length > 0 && (
            <div className="project-modal__grid">
              {details.sections.map((section) => (
                <section key={section.title} className="project-modal__card">
                  <h3>{section.title}</h3>
                  <ul className="project-modal__points">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {details.stack?.length > 0 && (
            <section>
              <h3 className="project-modal__heading">{t('project.stack')}</h3>
              <dl className="project-stack">
                {details.stack.map((group) => (
                  <div key={group.group} className="project-stack__group">
                    <dt>{group.group}</dt>
                    <dd>
                      <ul>
                        {group.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <footer className="project-modal__foot">
          {details.chatDemo && chat.enabled && (
            <button type="button" className="btn btn--primary" onClick={tryChat}>
              <Icon name="chat" size={18} />
              {t('project.tryChat')}
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('project.closeButton')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
