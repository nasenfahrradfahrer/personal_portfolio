# CV-Website – Frontend

React 19 + Vite, Mobile First, dunkles Design mit mehreren Akzentfarben, auf Deutsch und Englisch.
Gehostet auf Vercel unter `felixmoeller.me` (Stand und Produktionswerte: [`../README.md`](../README.md)).

## Starten

```bash
npm install
npm run dev       # Entwicklungsserver auf http://localhost:5173
npm run build     # Produktions-Build nach dist/
npm run preview   # Build lokal ansehen
```

`npm run dev` und `npm run preview` leiten `/api` an das Backend auf `http://127.0.0.1:8000`
weiter (`vite.config.js`).

## Aufbau der Seite

| # | Abschnitt | Farbe | Inhalt |
|---|---|---|---|
| 01 | Profil | Violett | Profilbild (optional mit Vorstellungsvideo), Rolle, Text, Buttons inkl. Lebenslauf-Download (PDF je Sprache), drei Kennzahlen |
| 02 | Erfahrung | Cyan | Zeitleiste |
| 03 | Skills & Projekte | Pink | Tech-Stack-Diagramm, Programmiersprachen als Leisten, Projekt-Karten mit Detailansicht |
| 04 | Kontakt | Amber | Karte mit E-Mail- und Social-Buttons |

Unterseiten (nur auf Deutsch, auf Englisch mit Hinweis): `/impressum` mit Kontaktformular und
`/datenschutz`, verlinkt in der Fußzeile und im Chat-Hinweis. Sie laufen ohne Router: `App.jsx`
wählt die Seite anhand des Pfads (`src/utils/routes.js`), `vercel.json` liefert für beide Pfade
`index.html` aus und schließt das Impressum per `X-Robots-Tag: noindex` von Suchmaschinen aus.

Dazu: Kopfzeile mit Sprachumschalter, Hervorhebung des sichtbaren Abschnitts und
Scroll-Fortschritt, auf dem Handy als Hamburger-Menü; der KI-Assistent unten rechts. Inhalte blenden
beim Scrollen ein (nicht bei „weniger Bewegung“ im System), alles ist per Tastatur bedienbar.
Die Seite ist fest dunkel; automatische Dark-Modes von Browsern und Erweiterungen sind abgeschaltet
(`color-scheme: dark`, `darkreader-lock`).

## Inhalte pflegen

Inhalte sind auf zwei Orte verteilt, zusammengeführt in `src/i18n/useContent.js`:

- **`src/data/content.js`**: Struktur und alles, was in jeder Sprache gleich ist: Reihenfolge der
  Abschnitte, IDs, Farben, Links, Profilbild, Video, Zahlen, Projekt-Tags. Die Kommentare dort
  beschreiben die einzelnen Felder.
- **`src/locales/<sprache>/content.js`**: die Texte dazu (Profil, Abschnitte, Werdegang, Projekte,
  Kontakt), zugeordnet über dieselben IDs. Ein neues Projekt bekommt also einen Eintrag in
  `content.js` und je Sprache einen Text unter `projects.<id>`.

Weitere Texte je Sprache: `ui.js` (Buttons, Hinweise, Chat) und `demos.js` (interaktive Demos).
Fehlt ein Text in einer Sprache, erscheint der deutsche. Die Texte des Tech-Stacks kommen vom
Backend (siehe [Tech-Stack-Diagramm](#tech-stack-diagramm)).

Einzelne Punkte:

- **Reihenfolge:** `sections` in `content.js` bestimmt Seite und Navigation zugleich.
- **Profilbild:** Datei in `public/` ablegen und bei `profile.photo` eintragen. Bilder sind per
  `.gitignore` ausgeschlossen, außer `public/headshot.jpg`.
- **Projekte:** `tags` müssen genau so in `techstack.json` (privates Repo) vorkommen. Mit
  `details` öffnet „Details ansehen“ eine Detailansicht, `chatDemo: true` zeigt dort
  „Ausprobieren“ (öffnet den Chat), `demo` bindet ein interaktives Element ein, derzeit
  `'frameSelection'` (Masterarbeit, Daten in `src/data/frameSelection.js`). Neue Demos werden in
  `components/ProjectModal.jsx` unter `demos` registriert.
- **Programmiersprachen:** `languages` mit `name`, `years` (Kommazahlen erlaubt) und optional
  `detail`.
- **Chat:** Unter jeder Antwort lässt sie sich mit Daumen hoch/runter bewerten, sofern das Backend
  Gespräche speichert (`LOG_CHATS=true`); sonst erscheinen die Buttons nicht.
  `chat.enabled: false` blendet den Assistenten aus. Begrüßung, KI-Hinweis und
  Vorschlagsfragen stehen unter `chat` in `src/locales/<sprache>/content.js`, Buttons und
  Meldungen unter `chat` in `ui.js`.
- **E-Mail-Adresse:** `profile.email` steht als `{ user, domain }` in `content.js` und wird nur über
  `components/EmailLink.jsx` angezeigt (Schutz vor Adress-Sammlern, Details im Kommentar dort).
- **Impressum und Datenschutzerklärung:** Anschrift unter `legal` in `content.js`, die Texte direkt
  in `src/pages/Imprint.jsx` und `src/pages/Privacy.jsx`. Das Kontaktformular braucht das Backend
  mit eingerichtetem SMTP (`backend/README.md`, Konfiguration); Turnstile lädt dort erst, wenn
  jemand das Formular benutzt.
- **Farben und Abstände:** `src/styles/tokens.css`. Die Akzentfarben (`violet`, `cyan`, `pink`,
  `amber`, `emerald`) werden dort definiert und in `content.js` per Name zugewiesen.

### Sprache

Beim ersten Besuch gilt die Browsersprache (sonst Deutsch), danach die zuletzt gewählte (gespeichert
in `localStorage`). Ein Link mit `?lang=en` öffnet die Seite direkt auf Englisch. Neue Sprache:
Ordner `src/locales/en` kopieren und übersetzen, in `src/locales/<sprache>/index.js` zusammenfassen
und in `src/i18n/index.js` (Liste `LANGUAGES` und `resources`) eintragen. Damit auch der Chat
Fehlermeldungen in der neuen Sprache liefert, sie zusätzlich in `backend/app/i18n.py` ergänzen.

## Tech-Stack-Diagramm

Interaktives Sunburst-Diagramm (D3). Die Daten sind **nicht** in diesem Repo: Sie liegen im
privaten Repo `portfolio_website_private_files` (`techstack.json` auf Deutsch, `techstack.en.json`
mit den englischen Texten) und kommen zur Laufzeit vom Backend über `GET /api/techstack`
(`src/utils/techstackApi.js`). Dieselben Daten nutzt der Chatbot. Aufbau und Pflege:
[`backend/README.md` → Tech-Stack](../backend/README.md#tech-stack).

- Bis die Daten da sind, zeigt die Karte „Tech-Stack wird geladen …“, ist das Backend nicht
  erreichbar, einen Hinweis mit „Erneut versuchen“. **Lokal** braucht das Diagramm deshalb das
  laufende Backend (Vite leitet `/api` an Port 8000 weiter).
- Versteckte Projekte (`"hidden": true`) liefert das Backend gar nicht erst aus.

- Klick auf einen Bereich klappt ihn auf, Klick in die Mitte führt zurück; die Legende navigiert
  zwischen den Bereichen, die Listenansicht zeigt alle Einträge per Tastatur bedienbar.
- Zu lange Namen werden auf zwei Zeilen umbrochen, mit `\n` im Namen legst du den Umbruch selbst
  fest. Was nicht ins Segment passt, zeigen Tooltip, Detailansicht und Listenansicht.
- Die Bereiche bekommen die Farben `--viz-1` bis `--viz-3` (`tokens.css`) in der Reihenfolge der
  Datei. Ein vierter Bereich wird grau, bis eine weitere geprüfte Farbe ergänzt ist.

## Erfahrungs-Leisten

Programmiersprachen und Detailansicht des Diagramms zeigen die Erfahrung als dieselbe Leiste. Eine
volle Leiste entspricht 4,5 Jahren (`EXPERIENCE_MAX` in `src/utils/experience.js`), mehr füllt sie
ganz. Länge und Farbe (dunkles Violett bis helles Fuchsia, `EXPERIENCE_COLORS`) steigen mit den
Jahren; der Wert steht immer auch als Text daneben.

## Vorstellungsvideo

Derzeit ausgeschaltet (`profile.video.enabled: false`): Das Profilbild ist statisch, statt „Video
ansehen“ erscheint der Button zum Werdegang. Zum Einbinden:

1. Je Sprache ein MP4 und ein Vorschaubild in `public/video/` ablegen.
2. In `content.js` unter `profile.video.sources.<sprache>` `src`, `poster` und `duration` eintragen,
   `aspectRatio` passend setzen und `enabled: true`. Fehlt eine Sprachfassung, läuft die deutsche.

Für schnelles Laden auf dem Handy H.264 mit „faststart“, z. B.:

```bash
ffmpeg -i rohvideo.mov -vf scale=-2:1080 -c:v libx264 -crf 23 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart intro.mp4
```

Das Video lädt erst beim Klick auf Play und kommt vom eigenen Hosting (kein YouTube, keine Cookies).
Videodateien sind groß und gehören nicht direkt in Git (Git LFS oder ein Speicher in der EU).

## Deployment (Vercel)

- Vercel-Projekt mit Root `frontend/`, Framework Vite, Node 24 (`engines` in `package.json`).
  Jeder Push auf `master` baut neu.
- `vercel.json` setzt Sicherheits-Header und lange Cache-Zeiten für `/assets/`, liefert `index.html`
  für `/impressum` und `/datenschutz` aus und setzt `noindex` fürs Impressum.
- Umgebungsvariablen (Vorlage: `.env.example`, lokal in `.env.local`): `VITE_CHAT_API_URL` und
  `VITE_TURNSTILE_SITE_KEY`. Sie landen im öffentlichen JavaScript, also nie Geheimnisse dort
  eintragen. Nach einer Änderung neu deployen.
- Schriften (Inter, Space Grotesk) sind lokal über Fontsource eingebunden, ohne Anfragen an Google
  Fonts (DSGVO).

## Struktur

```
public/                  Favicon, Profilbild, Lebenslauf-PDFs
src/
  data/content.js        Struktur der Inhalte (sprachunabhängig)
  data/frameSelection.js Daten der Masterarbeits-Demo
  locales/de, locales/en Texte je Sprache
  i18n/                  i18next-Einrichtung, useContent (Struktur + Texte zusammenführen)
  sections/              Die 4 Abschnitte: Hero (Profil), Experience, Skills, Contact
  pages/                 Unterseiten: Impressum, Datenschutzerklärung (gemeinsamer Rahmen LegalPage)
  components/            Header, Footer, Hintergrund, Icons, Video-Overlay, Projekt-Detailansicht
                         und Demos, Erfahrungs-Leisten, Tech-Stack-Diagramm, Chat-Fenster,
                         Kontaktformular, geschützte E-Mail-Adresse
  hooks/                 Aktiver Abschnitt, optionaler Bot-Schutz (Turnstile)
  utils/                 Erfahrungs-Leisten, Chat-Verbindung (Streaming), Chat öffnen,
                         Kontaktformular-Verbindung, Tech-Stack laden, Pfade der Unterseiten
  styles/tokens.css      Farben, Schriften, Abstände (Design-Tokens)
  styles/global.css      Basis-Styles, Buttons, Cards, Chips
```
