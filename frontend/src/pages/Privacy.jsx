import { Fragment } from 'react'
import EmailLink from '../components/EmailLink'
import { legal, profile } from '../data/content'
import { PAGES } from '../utils/routes'
import LegalPage from './LegalPage'

// Datenschutzerklärung. Beschreibt die Datenflüsse so, wie sie im Code umgesetzt sind:
// Vercel (Frontend), IONOS-VPS (backend/), Anthropic (backend/app/llm.py), Cloudflare Turnstile
// (hooks/useTurnstile.js), Kontaktformular (backend/app/contact.py), Tech-Stack vom Backend
// (utils/techstackApi.js), localStorage (i18n/index.js).
// Ändert sich daran etwas (neuer Dienst, Video-Einbettung, Analyse, Speicherdauer), hier anpassen.
export default function Privacy() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <h2>1. Überblick</h2>
      <p>
        Diese Webseite ist meine persönliche Profil- und Bewerbungsseite. Sie verwendet keine Cookies, kein Tracking,
        keine Werbung und keine Analyse-Dienste. Personenbezogene Daten verarbeite ich nur, soweit es für den Betrieb
        der Seite, den KI-Assistenten und das Kontaktformular nötig ist. Was dabei im Einzelnen passiert, steht unten.
      </p>

      <h2>2. Verantwortlicher</h2>
      <address>
        {profile.name}
        {legal.address.map((line) => (
          <Fragment key={line}>
            <br />
            {line}
          </Fragment>
        ))}
        <br />
        E-Mail: <EmailLink />
      </address>
      <p>
        Weitere Angaben stehen im <a href={PAGES.imprint}>Impressum</a>.
      </p>

      <h2>3. Aufruf der Webseite (Hosting bei Vercel)</h2>
      <p>
        Die Webseite wird von der Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, ausgeliefert. Beim
        Aufruf verarbeitet Vercel technisch notwendige Zugriffsdaten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse,
        übertragene Datenmenge, die zuvor besuchte Seite (Referrer) sowie Browser und Betriebssystem. Diese Daten sind
        nötig, um die Seite auszuliefern, sie vor Angriffen zu schützen und Fehler zu finden. Vercel speichert sie nur
        für begrenzte Zeit.
      </p>
      <p>
        Rechtsgrundlage ist mein berechtigtes Interesse an einer sicheren und zuverlässigen Bereitstellung der Seite
        (Art. 6 Abs. 1 lit. f DSGVO). Vercel verarbeitet die Daten in meinem Auftrag (Art. 28 DSGVO). Dabei können Daten
        in die USA übermittelt werden. Vercel ist unter dem EU-US Data Privacy Framework zertifiziert, für das ein
        Angemessenheitsbeschluss der EU-Kommission besteht (Art. 45 DSGVO); ergänzend gelten die
        EU-Standardvertragsklauseln (Art. 46 DSGVO).
      </p>

      <h2>4. Server für Chat, Kontaktformular und Tech-Stack (IONOS)</h2>
      <p>
        Der KI-Assistent, das Kontaktformular und die Daten der Tech-Stack-Grafik laufen über einen eigenen Server unter
        api.felixmoeller.me. Er wird von der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, in einem Rechenzentrum in
        Deutschland betrieben. IONOS verarbeitet die Daten in meinem Auftrag (Art. 28 DSGVO).
      </p>
      <p>
        Die Tech-Stack-Grafik lädt ihre Daten beim Aufruf der Seite von diesem Server. Dabei übermittelt dein Browser
        technisch bedingt deine IP-Adresse; der Server verwendet sie nur, um die Antwort zurückzuschicken, und speichert
        sie nicht.
      </p>
      <p>
        Der Server nutzt deine IP-Adresse nur kurzzeitig im Arbeitsspeicher, um die Zahl der Anfragen pro Besucher zu
        begrenzen (Schutz vor Missbrauch und Kosten). Sie wird nicht auf die Festplatte geschrieben und ist spätestens
        nach 24 Stunden vergessen. Zugriffsprotokolle mit IP-Adressen führt der Server nicht. Rechtsgrundlage ist mein
        berechtigtes Interesse am Schutz des Dienstes (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>5. KI-Assistent</h2>
      <p>
        Der KI-Assistent unten rechts beantwortet Fragen zu meinem Profil. Er ist ein Computerprogramm und kein Mensch,
        seine Antworten können Fehler enthalten. Er trifft keine Entscheidungen über dich (keine automatisierte
        Entscheidung im Sinne von Art. 22 DSGVO). Die Nutzung ist freiwillig.
      </p>

      <h3>Was passiert mit deinen Nachrichten?</h3>
      <ul>
        <li>
          Deine Frage und der bisherige Verlauf des Gesprächs gehen an meinen Server (siehe Abschnitt 4). Er sucht
          passende Stellen aus meinen öffentlichen Unterlagen heraus.
        </li>
        <li>
          Frage, Verlauf und diese Stellen schickt der Server an das Sprachmodell Claude der Anthropic, PBC, 548 Market
          Street, PMB 90375, San Francisco, CA 94104, USA. Die Antwort kommt von dort zurück. Deine IP-Adresse wird
          dabei nicht an Anthropic übermittelt.
        </li>
        <li>
          Anthropic verarbeitet die Daten als Auftragsverarbeiter auf Grundlage seiner Datenverarbeitungsvereinbarung
          (Art. 28 DSGVO). Die Übermittlung in die USA ist durch die darin enthaltenen EU-Standardvertragsklauseln
          abgesichert (Art. 46 DSGVO). Anthropic nutzt die Daten nach eigenen Angaben nicht zum Training seiner Modelle
          und löscht sie nach kurzer Zeit automatisch, sofern sie nicht wegen eines Verstoßes gegen die
          Nutzungsrichtlinien länger aufbewahrt werden müssen.
        </li>
        <li>
          Den Gesprächsverlauf hält dein Browser nur, solange der Tab geöffnet ist. Der Server versieht ihn mit einer
          Signatur, damit er nicht manipuliert werden kann.
        </li>
      </ul>

      <h3>Speicherung der Gespräche</h3>
      <p>
        Damit ich den Assistenten verbessern kann (z. B. fehlende Informationen ergänzen oder falsche Antworten
        erkennen), speichere ich die Gespräche, also deine Fragen und die Antworten des Assistenten, zusammen mit Datum,
        Sprache der Seite und den genutzten Quellen auf meinem Server. Fragen aus demselben Gespräch ordne ich über
        einen Schlüssel einander zu, der aus der ersten Frage und Antwort berechnet wird. IP-Adressen oder Kennungen
        deines Browsers werden dabei nicht gespeichert. Wenn du eine Antwort mit Daumen hoch oder runter bewertest,
        speichere ich die Bewertung zusammen mit dem Gespräch.
        Nach 30 Tagen werden die Gespräche automatisch gelöscht. Rechtsgrundlage ist mein berechtigtes Interesse an
        einem gut funktionierenden Assistenten (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      <p>
        <strong>Bitte gib im Chat keine sensiblen Daten über dich oder andere ein.</strong> Was du in deine Nachrichten
        schreibst (z. B. deinen Namen oder deine Firma), wird mitgespeichert. Da ich die Gespräche keiner Person zuordnen
        kann, kann ich ein einzelnes Gespräch nur dann vorzeitig löschen, wenn du es mir genau genug beschreibst (etwa
        Datum und Inhalt).
      </p>

      <h3>Rechtsgrundlage</h3>
      <p>
        Die Verarbeitung deiner Nachrichten beruht auf meinem berechtigten Interesse, Fragen zu meinem Profil schnell und
        unkompliziert zu beantworten, und auf deinem Interesse an diesen Antworten (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>6. Schutz vor Bots (Cloudflare Turnstile)</h2>
      <p>
        Um den Chat und das Kontaktformular vor automatisierten Anfragen zu schützen, nutze ich Cloudflare Turnstile der
        Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA. Turnstile wird erst geladen, wenn du den Chat
        öffnest oder das Kontaktformular benutzt, nicht schon beim Aufruf der Seite.
      </p>
      <p>
        Dabei verarbeitet Cloudflare deine IP-Adresse sowie technische Merkmale deines Browsers und Geräts, um Menschen
        von Bots zu unterscheiden. Zur Prüfung des Ergebnisses übermittelt mein Server zusätzlich deine IP-Adresse an
        Cloudflare. Turnstile setzt nach Angaben von Cloudflare keine Cookies zu Tracking- oder Werbezwecken.
      </p>
      <p>
        Rechtsgrundlage ist mein berechtigtes Interesse am Schutz vor Missbrauch und unnötigen Kosten (Art. 6 Abs. 1
        lit. f DSGVO). Der Zugriff auf Informationen in deinem Browser ist für den von dir gewünschten Dienst unbedingt
        erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert (Art.
        45 DSGVO). Weitere Informationen:{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
          Datenschutzerklärung von Cloudflare
        </a>
        .
      </p>

      <h2>7. Kontaktformular und E-Mail</h2>
      <p>
        Wenn du mir über das Kontaktformular schreibst, verarbeite ich deine E-Mail-Adresse, deine Nachricht und,
        falls angegeben, deinen Namen. Mein Server leitet die Nachricht per E-Mail an mein Postfach weiter und speichert
        sie selbst nicht. Für den Schutz vor Missbrauch gelten die Abschnitte 4 und 6. Schreibst du mir direkt eine
        E-Mail, verarbeite ich die darin enthaltenen Angaben.
      </p>
      <p>
        Mein Postfach liegt bei Google (Gmail), Anbieter ist die Google Ireland Limited, Gordon House, Barrow Street,
        Dublin 4, Irland.
      </p>
      <p>
        Ich nutze die Angaben ausschließlich, um deine Anfrage zu beantworten. Geht es um eine mögliche Zusammenarbeit
        oder Anstellung, ist Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen), sonst mein
        berechtigtes Interesse an der Beantwortung von Anfragen (Art. 6 Abs. 1 lit. f DSGVO). Ich lösche die Nachrichten,
        sobald dein Anliegen erledigt ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
      </p>

      <h2>8. Gespeicherte Spracheinstellung</h2>
      <p>
        Wenn du die Sprache der Seite umschaltest, merkt sich dein Browser die Wahl im lokalen Speicher (localStorage,
        Eintrag „lang“). Das ist kein Cookie, wird nicht an mich übertragen und bleibt, bis du die Website-Daten in
        deinem Browser löschst. Die Speicherung ist für die von dir gewünschte Funktion unbedingt erforderlich (§ 25
        Abs. 2 Nr. 2 TDDDG).
      </p>

      <h2>9. Schriftarten und externe Links</h2>
      <p>
        Die Schriftarten werden von dieser Webseite selbst ausgeliefert. Es besteht dabei keine Verbindung zu Google
        Fonts oder anderen Anbietern.
      </p>
      <p>
        Links zu anderen Webseiten (z. B. LinkedIn) sind einfache Links. Erst wenn du einen davon anklickst, verbindet
        sich dein Browser mit dem jeweiligen Anbieter. Dort gilt dessen Datenschutzerklärung.
      </p>

      <h2>10. Verschlüsselung</h2>
      <p>
        Alle Verbindungen zu dieser Webseite und zu meinem Server sind per TLS verschlüsselt (erkennbar an „https://“
        in der Adresszeile).
      </p>

      <h2>11. Deine Rechte</h2>
      <p>Du hast gegenüber mir folgende Rechte hinsichtlich deiner personenbezogenen Daten:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
      </ul>
      <div className="legal__box">
        <p>
          <strong>Widerspruchsrecht:</strong> Soweit ich deine Daten auf Grundlage meines berechtigten Interesses
          verarbeite (Art. 6 Abs. 1 lit. f DSGVO), kannst du dieser Verarbeitung aus Gründen, die sich aus deiner
          besonderen Situation ergeben, jederzeit widersprechen. Eine formlose Nachricht an die oben genannte
          E-Mail-Adresse genügt.
        </p>
      </div>
      <p>
        Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), insbesondere in dem
        Mitgliedstaat deines Aufenthaltsorts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
      </p>
      <p>
        Du bist nicht verpflichtet, mir Daten bereitzustellen. Ohne die technisch nötigen Zugriffsdaten lässt sich die
        Seite allerdings nicht anzeigen, und ohne E-Mail-Adresse kann ich dir auf eine Nachricht nicht antworten.
      </p>

      <p className="legal__updated">Stand: Oktober 2026</p>
    </LegalPage>
  )
}
