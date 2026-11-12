import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon'
import { profile } from '../data/content'
import './LegalPage.css'

// Gemeinsamer Rahmen für Impressum und Datenschutzerklärung. Der Text ist nur auf Deutsch
// (lang="de"); auf anderen Sprachen erscheint oben ein Hinweis in der jeweiligen Sprache.
export default function LegalPage({ title, children }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  useEffect(() => {
    const previous = document.title
    document.title = `${title} – ${profile.name}`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <div className="container">
      <article className="legal" lang="de">
        <header className="legal__head">
          <a href="/" className="legal__back" lang={language}>
            <Icon name="arrowLeft" size={16} />
            {t('legal.back')}
          </a>
          <h1>{title}</h1>
          {language !== 'de' && (
            <p className="legal__note" lang={language}>
              {t('legal.germanOnly')}
            </p>
          )}
        </header>
        <div className="legal__body">{children}</div>
      </article>
    </div>
  )
}
