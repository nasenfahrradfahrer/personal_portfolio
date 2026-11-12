import { Fragment } from 'react'
import ContactForm from '../components/ContactForm'
import EmailLink from '../components/EmailLink'
import { legal, profile } from '../data/content'
import LegalPage from './LegalPage'

// Impressum nach § 5 DDG. Anschrift: legal.address in src/data/content.js.
// Zweiter schneller Kontaktweg neben der E-Mail ist das Kontaktformular (statt einer Telefonnummer).
// vercel.json schließt die Seite per X-Robots-Tag von Suchmaschinen aus.
export default function Imprint() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        {profile.name}
        {legal.address.map((line) => (
          <Fragment key={line}>
            <br />
            {line}
          </Fragment>
        ))}
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <EmailLink />
        <br />
        Kontaktformular: <a href="#kontaktformular">auf dieser Seite</a>
      </p>

      <h2 id="kontaktformular">Kontaktformular</h2>
      <p>Ich beantworte Nachrichten über das Formular in der Regel innerhalb von ein, zwei Tagen.</p>
      <ContactForm />
    </LegalPage>
  )
}
