// Struktur der Seite und alles, was in jeder Sprache gleich ist: Reihenfolge, IDs, Farben, Links,
// Bilder, Videos, Zahlen und Technologie-Namen. Die Texte stehen in den Sprachdateien unter
// src/locales/<sprache>/content.js, zugeordnet über dieselben Schlüssel (id).
// Zusammengeführt werden beide in src/i18n/useContent.js.
//
// Farben (accent) verweisen auf die Akzentfarben in src/styles/tokens.css:
// 'violet' | 'cyan' | 'pink' | 'amber' | 'emerald'

// Texte: profile in den Sprachdateien (Rolle, Tagline, Verfügbarkeit, Ort, Kennzahlen)
export const profile = {
  name: 'Felix Möller',
  initials: 'FM',
  // E-Mail-Adresse in zwei Teilen, damit sie nicht am Stück im JavaScript steht (Schutz vor
  // Adress-Sammlern). Angezeigt wird sie über components/EmailLink.jsx.
  email: { user: 'felixmoeller', domain: 'felixmoeller.me' },
  // Profilbild: Datei in frontend/public ablegen und z. B. '/profil.jpg' eintragen
  photo: '/headshot.jpg',
  // Vorstellungsvideo (selbst gehostet), eine Fassung je Sprache: Dateien in frontend/public ablegen,
  // z. B. '/video/intro-de.mp4'. Fehlt die Fassung einer Sprache, läuft die deutsche.
  // Solange src leer ist, zeigt das Overlay einen Platzhalter im gleichen Seitenverhältnis.
  // Mit enabled: false (oder video: null) entfallen Play-Button und Overlay komplett, das Profilbild
  // bleibt statisch und statt „Video ansehen“ erscheint der Button zum Werdegang.
  video: {
    enabled: false,
    aspectRatio: '16 / 9', // Hochkant: '9 / 16', quadratisch: '1 / 1'
    sources: {
      de: {
        src: null,
        poster: null, // Vorschaubild, z. B. '/video/intro-de-poster.jpg'
        duration: '1:30',
      },
      en: {
        src: null,
        poster: null,
        duration: '1:30',
      },
    },
  },
  // Lebenslauf als PDF, eine Fassung je Sprache (Dateien in frontend/public). Fehlt die Fassung
  // einer Sprache, wird die deutsche angeboten; mit cv: null entfällt der Download-Button.
  cv: {
    de: '/felix-moeller-cv-de.pdf',
    en: '/felix-moeller-cv-en.pdf',
  },
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/felix-m%C3%B6ller-16a566336/' },
    { label: 'GitHub', href: 'https://github.com/nasenfahrradfahrer' },
  ],
  // Reihenfolge und Werte; die Beschriftungen stehen in den Sprachdateien unter profile.facts
  facts: [
    { id: 'years', value: '02+', accent: 'violet' },
    { id: 'projects', value: '02', accent: 'cyan' },
    { id: 'certificates', value: '02', accent: 'pink' },
  ],
}

// Angaben für Impressum und Datenschutzerklärung (src/pages). Name und E-Mail kommen aus profile.
// Die Seiten selbst sind nur auf Deutsch; auf Englisch erscheint ein kurzer Hinweis darauf.
// PLATZHALTER: ladungsfähige Anschrift eintragen (kein Postfach; alternativ eine c/o-Adresse).
export const legal = {
  address: ['Hofwiese 7', '98593 Floh-Seligenthal', 'Deutschland'],
}

// KI-Assistent unten rechts. Braucht das Backend (backend/README.md); ohne Backend zeigt er
// „gerade nicht verfügbar“. Mit enabled: false wird er komplett ausgeblendet.
// Texte: chat in den Sprachdateien
export const chat = {
  enabled: true,
}

// Reihenfolge hier = Reihenfolge auf der Seite und in der Navigation.
// Die id ist zugleich der Anker in der URL (#kontakt) und bleibt deshalb in allen Sprachen gleich.
// Texte: sections.<id> in den Sprachdateien (nav, title, lead)
// icon: Symbol hinter der Abschnittsüberschrift (Namen aus Icon.jsx); das Profil hat keine Überschrift
export const sections = [
  { id: 'profil', accent: 'violet' },
  { id: 'erfahrung', accent: 'cyan', icon: 'briefcase' },
  { id: 'skills', accent: 'pink', icon: 'code' },
  { id: 'kontakt', accent: 'amber', icon: 'send' },
]

// Neueste Station zuerst. Texte: experience.<id> in den Sprachdateien (title, org, description, tags)
export const experience = [
  // PLATZHALTER: Studienbeginn eintragen
  { id: 'master', period: '04/2024 – 05/2026' },
  { id: 'bmw', period: '04/2025 – 08/2025' },
  { id: 'ibykus', period: '08/2023 – 03/2025' },
  { id: 'bachelor', period: '10/2020 – 06/2024' },
]

// Programmiersprachen als Leisten unter „Skills & Projekte“.
// years: Erfahrung in Jahren, Kommazahlen erlaubt (z. B. 2.5). Volle Leiste = 4,5 Jahre
// (EXPERIENCE_MAX in src/utils/experience.js), Länge und Farbe steigen mit den Jahren.
// detail (optional): Frameworks/Einsatz, erscheint klein unter der Leiste.
// PLATZHALTER: Die Sprachen stammen aus techstack.json, die Jahre bitte selbst eintragen.
export const languages = [
  { name: 'Python', years: 4, detail: 'PyTorch, Pandas, FastAPI, Streamlit' },
  { name: 'Java', years: 2.5, detail: 'JSF, PrimeFaces, Spring Boot' },
  { name: 'SQL', years: 2, detail: 'PostgreSQL, Snowflake' },
  { name: 'JavaScript', years: 2, detail: 'React' },
  // { name: 'Dart', years: 1, detail: 'Flutter' },
  // { name: 'Julia', years: 0.5, detail: 'Datenpipeline mit Python' },
]

// Projekt-Karten unter „Skills & Projekte“. Texte: projects.<id> in den Sprachdateien.
// tags: nur Namen, die genau so in techstack.json vorkommen.
// details (optional): Es gibt ein Overlay hinter „Details ansehen“; dessen Texte stehen in den
// Sprachdateien unter projects.<id>.details. Ohne details führt der Link zu href. Hier nur:
//   flowIcons  Symbole der Ablauf-Schritte (Namen aus Icon.jsx), Reihenfolge wie die Schritte
//   chatDemo   true = Button „Ausprobieren“ öffnet den Chat unten rechts
//   demo       interaktives Element nach den Kennzahlen, Schlüssel in demos (ProjectModal.jsx):
//              z. B. 'frameSelection'; Überschrift in details.demoTitle
export const projects = [
  {
    id: 'assistant',
    tags: ['React', 'LLMs', 'RAG', 'NumPy', 'CSS'],
    image: null,
    accent: 'pink',
    details: {
      flowIcons: ['chat', 'shield', 'search', 'sparkle'],
      chatDemo: true,
    },
  },
  {
    id: 'thesis',
    tags: ['PyTorch/torchvision', 'CNNs', 'ConvNeXt', 'EfficientNet', 'net:cal'],
    image: null,
    accent: 'violet',
    details: {
      flowIcons: ['layers', 'tag', 'gauge', 'filter'],
      demo: 'frameSelection',
    },
  },
]
