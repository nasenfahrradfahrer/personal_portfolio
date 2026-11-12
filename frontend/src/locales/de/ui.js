// Feste Beschriftungen der Oberfläche: Buttons, Hinweise, Labels für Screenreader.
// Schlüssel mit _one/_other sind Pluralformen (gewählt über count).

export default {
  app: {
    skipLink: 'Zum Inhalt springen',
  },

  header: {
    nav: 'Hauptnavigation',
    menuOpen: 'Menü öffnen',
    menuClose: 'Menü schließen',
    language: 'Sprache',
  },

  footer: {
    toTop: 'Nach oben',
    legal: 'Rechtliches',
    imprint: 'Impressum',
    privacy: 'Datenschutz',
  },

  legal: {
    back: 'Zur Startseite',
    germanOnly: 'Diese Seite gibt es nur auf Deutsch.',
  },

  units: {
    years_one: '{{value}} Jahr',
    years_other: '{{value}} Jahre',
  },

  hero: {
    greeting: 'Hallo, ich bin',
    contact: 'Kontakt aufnehmen',
    watchVideo: 'Video ansehen',
    watchVideoLabel: 'Vorstellungsvideo ansehen',
    watchVideoLabelDuration: 'Vorstellungsvideo ansehen ({{duration}})',
    career: 'Werdegang ansehen',
    downloadCv: 'Lebenslauf (PDF)',
  },

  video: {
    meta: 'Vorstellungsvideo',
    close: 'Video schließen',
    placeholder: 'Hier erscheint das Vorstellungsvideo',
    placeholderNote: 'Platzhalter · Seitenverhältnis {{ratio}}',
  },

  skills: {
    competencies: 'Kompetenzen',
    languages: 'Programmiersprachen',
    projects: 'Ausgewählte Projekte',
    details: 'Details ansehen',
  },

  project: {
    number: 'Projekt {{number}}',
    close: 'Details schließen',
    stack: 'Technologien',
    tryChat: 'Ausprobieren',
    closeButton: 'Schließen',
    mobileHint: 'Die Detailansicht funktioniert auch auf dem Smartphone, am besten wirkt sie aber am Desktop.',
  },

  contact: {
    email: 'E-Mail',
    location: 'Standort',
    availability: 'Verfügbarkeit',
    writeEmail: 'E-Mail schreiben',
  },

  contactForm: {
    name: 'Name (optional)',
    email: 'Deine E-Mail-Adresse',
    message: 'Nachricht',
    send: 'Nachricht senden',
    sending: 'Wird gesendet …',
    sent: 'Danke, deine Nachricht ist angekommen. Ich melde mich so bald wie möglich.',
    privacy:
      'Deine Angaben nutze ich nur, um deine Nachricht zu beantworten. Sie werden per E-Mail an mich weitergeleitet. ' +
      'Mehr dazu in der <privacy>Datenschutzerklärung</privacy>.',
    errors: {
      network: 'Die Nachricht konnte nicht gesendet werden. Bitte versuch es später erneut oder schreib mir direkt per E-Mail.',
      generic: 'Da ist etwas schiefgelaufen. Bitte versuch es erneut oder schreib mir direkt per E-Mail.',
      turnstile: 'Die Sicherheitsprüfung hat nicht geklappt. Bitte lade die Seite neu.',
    },
  },

  techstack: {
    rootName: 'Tech-Stack',
    rootHint:
      '<p>Wähle ein Segment oder einen Bereich, um Details zu sehen. Bereiche mit Unterpunkten klappen auf, ein Klick in die Mitte führt zurück.</p>',
    children_one: '{{count}} Unterpunkt',
    children_other: '{{count}} Unterpunkte',
    area: 'Bereich',
    areas_one: '{{count}} Bereich',
    areas_other: '{{count}} Bereiche',
    back: '‹ Zurück',
    legend: 'Bereiche',
    views: 'Darstellung',
    chart: 'Diagramm',
    list: 'Liste',
    chartLabel: 'Sunburst-Diagramm des Tech-Stacks. Alle Einträge sind auch in der Listenansicht erreichbar.',
    overview: 'Übersicht',
    title: 'Interaktiver Tech-Stack',
    experience: 'Erfahrung',
    projects: 'Projekte',
    noDescription: '<p>Keine Beschreibung hinterlegt.</p>',
    loading: 'Tech-Stack wird geladen …',
    unavailable: 'Der Tech-Stack konnte gerade nicht geladen werden.',
    retry: 'Erneut versuchen',
  },

  chat: {
    typing: 'Antwort wird geschrieben',
    restart: 'Neu starten',
    retry: 'Erneut versuchen',
    sources: 'Quellen:',
    privacy: 'Datenschutz',
    rateLabel: 'Antwort bewerten',
    rateUp: 'Hilfreiche Antwort',
    rateDown: 'Keine hilfreiche Antwort',
    rated: 'Danke für deine Bewertung.',
    close: 'Chat schließen',
    statusUnavailable: 'Gerade nicht verfügbar',
    subtitle: 'Fragen zum Profil von {{name}}',
    newConversation: 'Neue Unterhaltung',
    unavailableHint:
      'Der Assistent ist gerade nicht erreichbar. Über den <contact>Kontaktbereich</contact> erreichst du mich direkt.',
    suggestions: 'Vorschläge',
    maxReached: 'Diese Unterhaltung hat ihre maximale Länge erreicht.',
    startNew: 'Neue Unterhaltung starten',
    inputLabel: 'Deine Frage',
    placeholder: 'Deine Frage …',
    placeholderMax: 'Bitte neue Unterhaltung starten',
    send: 'Frage senden',
    counter: '{{length}} / {{max}} Zeichen',
    errors: {
      unavailable: 'Der Assistent ist gerade nicht erreichbar.',
      network: 'Der Assistent ist gerade nicht erreichbar. Bitte versuch es später erneut.',
      generic: 'Da ist etwas schiefgelaufen. Bitte versuch es erneut.',
      incomplete: 'Die Antwort wurde unterbrochen. Bitte versuch es erneut.',
      turnstile: 'Die Sicherheitsprüfung hat nicht geklappt. Bitte lade die Seite neu.',
    },
  },
}
