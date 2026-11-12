import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import de from '../locales/de'
import en from '../locales/en'

// Verfügbare Sprachen in der Reihenfolge des Umschalters im Header. Neue Sprache: Ordner unter
// src/locales anlegen (Vorlage: en), hier eintragen und in resources aufnehmen. Fehlende Texte
// fallen auf die Standardsprache zurück. locale steuert Zahlenformate (Intl.NumberFormat).
export const LANGUAGES = [
  { code: 'de', label: 'DE', name: 'Deutsch', locale: 'de-DE' },
  { code: 'en', label: 'EN', name: 'English', locale: 'en-US' },
]

export const DEFAULT_LANGUAGE = 'de'

const resources = { de, en }

export const currentLanguage = () => i18n.resolvedLanguage ?? DEFAULT_LANGUAGE

export const currentLocale = () => LANGUAGES.find((lang) => lang.code === currentLanguage())?.locale ?? 'de-DE'

// Hält <html lang> aktuell (Aussprache von Screenreadern, Silbentrennung, Übersetzungs-Tools)
const syncDocument = () => {
  document.documentElement.lang = currentLanguage()
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: LANGUAGES.map((lang) => lang.code),
    fallbackLng: DEFAULT_LANGUAGE,
    ns: ['ui', 'content', 'demos'],
    defaultNS: 'ui',
    // React escapt selbst
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    // Texte liegen im Bundle: synchron initialisieren, damit der erste Render schon übersetzt ist
    initAsync: false,
    // Reihenfolge: ?lang=en im Link, dann die zuletzt gewählte Sprache, dann die Browsersprache.
    // Die Wahl im Umschalter wird in localStorage gemerkt.
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
      // en-US, en-GB … -> en
      convertDetectedLanguage: (lng) => lng.split('-')[0].toLowerCase(),
    },
  })

syncDocument()
i18n.on('languageChanged', syncDocument)

export default i18n
