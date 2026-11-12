import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import './LanguageSwitch.css'

// Umschalter für die Sprache der Seite (Liste in src/i18n/index.js). Die Wahl merkt sich
// i18next in localStorage; ohne Wahl gilt die Browsersprache.
export default function LanguageSwitch() {
  const { t, i18n } = useTranslation()

  return (
    <div className="lang-switch" role="group" aria-label={t('header.language')}>
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          className="lang-switch__btn"
          lang={language.code}
          title={language.name}
          aria-pressed={i18n.resolvedLanguage === language.code}
          onClick={() => i18n.changeLanguage(language.code)}
        >
          {language.label}
        </button>
      ))}
    </div>
  )
}
