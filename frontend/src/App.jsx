import { useTranslation } from 'react-i18next'
import Background from './components/Background'
import ChatWidget from './components/ChatWidget'
import Footer from './components/Footer'
import Header from './components/Header'
import useContent from './i18n/useContent'
import Imprint from './pages/Imprint'
import Privacy from './pages/Privacy'
import Contact from './sections/Contact'
import Experience from './sections/Experience'
import Hero from './sections/Hero'
import Skills from './sections/Skills'
import { PAGES, currentPath } from './utils/routes'

// Zuordnung: Abschnitts-id (aus content.js) -> Komponente
const sectionComponents = {
  profil: Hero,
  erfahrung: Experience,
  skills: Skills,
  kontakt: Contact,
}

// Unterseiten statt der Abschnitte; der Chat erscheint nur auf der Startseite
const pageComponents = {
  [PAGES.imprint]: Imprint,
  [PAGES.privacy]: Privacy,
}
const Page = pageComponents[currentPath]

export default function App() {
  const { t } = useTranslation()
  const { chat, sections } = useContent()

  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skipLink')}
      </a>
      <Background />
      <Header />
      <main id="main" tabIndex={-1}>
        {Page ? (
          <Page />
        ) : (
          sections.map((section, i) => {
            const Component = sectionComponents[section.id]
            return <Component key={section.id} {...section} index={i + 1} />
          })
        )}
      </main>
      <Footer />
      {chat.enabled && !Page && <ChatWidget />}
    </>
  )
}
