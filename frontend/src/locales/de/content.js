// Inhalte der Seite auf Deutsch. Struktur, Farben, Links und Zahlenwerte stehen in
// src/data/content.js; die Schlüssel hier (z. B. experience.bmw) entsprechen den ids dort.
// {{name}} und {{firstName}} werden automatisch durch den Namen aus profile.name ersetzt.

export default {
  profile: {
    role: 'AI & Software Engineer',
    tagline:
      'Ich bin Informatiker mit Schwerpunkt auf Künstlicher Intelligenz, Machine Learning und Computer Vision. Ich entwickle intelligente Systeme, von der Datenaufbereitung und dem Training neuronaler Netze bis hin zur Integration der Modelle in praktische Anwendungen.',
    availability: 'Offen für neue Herausforderungen',
    location: 'Erfurt, Deutschland',
    facts: {
      years: 'Jahre Erfahrung',
      projects: 'Projekte',
      certificates: 'Zertifikate',
    },
  },

  chat: {
    title: 'KI-Assistent',
    launcherLabel: 'Frag meinen KI-Assistenten',
    greeting: 'Hallo! Ich beantworte Fragen zu Qualifikationen, Projekten und Erfahrung von {{name}}.',
    notice:
      'Du chattest mit einer KI. Die Antworten beruhen auf meinen Unterlagen, können aber Fehler enthalten. ' +
      'Verbindliches klärst du am besten direkt mit mir.',
    suggestions: [
      'Welche Erfahrung hat {{firstName}} mit Computer Vision?',
      'Welche Web-Technologien kennt {{firstName}}?',
      'Hat {{firstName}} Erfahrung mit Explainable AI?',
    ],
  },

  sections: {
    profil: {
      nav: 'Profil',
    },
    erfahrung: {
      nav: 'Erfahrung',
      title: 'Beruflicher Werdegang',
      lead:
        'Von Webentwicklung für den Public Sector über AI Engineering bei BMW bis zu Research ' +
        'an verschiedenen Computer Vision Themen an der TU Ilmenau.',
    },
    skills: {
      nav: 'Skills',
      title: 'Skills & Projekte',
      lead:
        'Womit ich arbeite, welche Sprachen ich spreche und woran ich zuletzt gebaut habe: ' +
        'vom RAG-Chatbot für diese Seite bis zur Bildserien-Klassifikation aus meiner Masterarbeit.',
    },
    kontakt: {
      nav: 'Kontakt',
      title: 'Lass uns sprechen',
      lead:
        'Am einfachsten erreichst du mich per Mail. Ich freu mich über jede Nachricht, auch wenn es ' +
        'erstmal nur eine kurze Frage ist.',
    },
  },

  experience: {
    master: {
      title: 'Master Informatik',
      org: 'TU Ilmenau · Ilmenau',
      description:
        '<dl>' +
        '<dt>Schwerpunkt</dt><dd>Data Science / Maschinelles Lernen</dd>' +
        '<dt>Abschlussnote</dt><dd>1,3 (sehr gut)</dd>' +
        '<dt>Masterarbeit</dt><dd><em>Learning to Select Informative Views for Efficient Multi-View Object ' +
        'Recognition</em>, Note 1,0</dd>' +
        '</dl>',
      tags: ['Computer Vision', 'Deep Learning', 'Multi-View-Learning'],
    },
    bmw: {
      title: 'Praktikum Data Analytics',
      org: 'BMW AG · München',
      description:
        '<p>Weiterentwicklung eines KI-Modells, das Fehlerursachen anhand von Fahrzeugdaten klassifiziert.</p>' +
        '<ul>' +
        '<li>Embedding-Modell für verschachtelte JSON-Daten mit Set Transformer und Nested Tensors gebaut: ' +
        '<strong>+2 Prozentpunkte F1</strong> in den betroffenen Anwendungsfällen</li>' +
        '<li>Kalibrierung verbessert: MetaCal senkte den Expected Calibration Error in Tests um fast eine Größenordnung</li>' +
        '<li>Inferenz-Dashboard (Streamlit auf Snowflake) neu geschrieben: keine mehrsekündigen Wartezeiten mehr durch gezieltes Caching</li>' +
        '</ul>',
      tags: ['PyTorch', 'Set Transformer', 'Kalibrierung', 'Streamlit', 'Snowflake', 'AWS'],
    },
    ibykus: {
      title: 'Werkstudent in der Webentwicklung',
      org: 'IBYKUS AG · Erfurt',
      description:
        '<p>Mitentwicklung am Webportal für die Verwaltung von Fördermitteln im Scrum-Team, ' +
        'für die hessische Agrarförderung, u. a. HALM2.</p>' +
        '<ul>' +
        '<li>Frontend und Backend mit JSF/PrimeFaces, XHTML, CSS, JavaScript und SQL entwickelt</li>' +
        '<li><strong>Frontend-Taskforce geleitet</strong> und Templates erstellt, die Entwickler im Team weiterverwenden</li>' +
        '<li>Unit- und Integrationstests, Bugfixing und Einarbeitung von Praktikanten</li>' +
        '</ul>',
      tags: ['JSF', 'PrimeFaces', 'JavaScript', 'SQL', 'Testing'],
    },
    bachelor: {
      title: 'Bachelor Informatik',
      org: 'TU Ilmenau · Ilmenau',
      description:
        '<dl>' +
        '<dt>Bachelorarbeit</dt><dd><em>Bee Wing Segmentation and Pattern Analysis</em>: Mit Explainable AI ' +
        'untersucht, ob neuronale Netze zur Bestimmung von Wildbienen die Flügel nutzen</dd>' +
        '</dl>',
      tags: ['Computer Vision', 'Segmentierung', 'Explainable AI'],
    },
  },

  // Projekt-Karten und ihre Detailansicht. Alle Felder in details sind optional:
  //   meta       kleine Zeile über dem Titel
  //   summary    Einleitung
  //   facts      Kennzahlen [{ value, label }]
  //   demoTitle  Überschrift der interaktiven Demo (Demo selbst: details.demo in src/data/content.js)
  //   flow       Ablauf { title, steps: [{ title, text }] }, Symbole: details.flowIcons in src/data/content.js
  //   sections   Kacheln [{ title, points: [...] }]
  //   stack      verwendete Technologien [{ group, items: [...] }]
  projects: {
    assistant: {
      title: 'KI-Assistent für dieses Portfolio',
      description:
        'Ein Chatbot, der Fragen zu meinem Profil beantwortet: auf Basis meiner Unterlagen und mit Quellenangaben. Unten rechts ausprobieren!',
      details: {
        meta: 'Eigenes Projekt · Full-Stack',
        summary:
          'Recruiterinnen und Recruiter können mir hier direkt Fragen stellen. Der Assistent sucht die passenden ' +
          'Stellen in meinen Unterlagen und lässt Claude daraus eine Antwort mit Quellenangaben formulieren. ' +
          'Steht etwas nicht in den Unterlagen, sagt er das, statt etwas zu erfinden. Backend, Chat-Oberfläche, ' +
          'Wissensbasis und Tests habe ich konzipiert und umgesetzt.',
        facts: [
          { value: 'Hybrid', label: 'Stichwort- und Bedeutungssuche' },
          { value: '1–4 ct', label: 'API-Kosten pro Antwort' },
          { value: '70+', label: 'automatische Tests' },
          { value: '0', label: 'gespeicherte IP-Adressen' },
        ],
        flow: {
          title: 'So entsteht eine Antwort',
          steps: [
            {
              title: 'Frage',
              text: 'Der Browser schickt die Frage samt signiertem Gesprächsverlauf an das Backend.',
            },
            {
              title: 'Prüfung',
              text: 'Rate-Limit, Tagesbudget, Eingabe- und Signaturprüfung halten Missbrauch und Kosten im Rahmen.',
            },
            {
              title: 'Suche',
              text: 'Stichwort- und Bedeutungssuche finden die passenden Abschnitte in der Wissensbasis.',
            },
            {
              title: 'Antwort',
              text: 'Claude formuliert daraus die Antwort. Sie erscheint Wort für Wort, darunter die Quellen.',
            },
          ],
        },
        sections: [
          {
            title: 'Wissensbasis & Suche',
            points: [
              'Zwei Ebenen: Kurzes wie Profil und FAQ geht bei jeder Frage mit, lange Texte wie Abschlussarbeiten werden in Abschnitte zerlegt und gezielt durchsucht.',
              'BM25 findet exakte Begriffe wie „LayerCAM“, ein mehrsprachiges Embedding-Modell auch Umschreibungen. Beide Ranglisten kombiniert Reciprocal Rank Fusion.',
              'Das Embedding-Modell läuft lokal auf der CPU. Meine Texte gehen dafür an keinen externen Dienst.',
              'Der Tech-Stack dieser Seite fließt automatisch ein: Webseite und Chatbot nutzen dieselbe Quelle.',
            ],
          },
          {
            title: 'Antworten mit Quellen',
            points: [
              'Claude bekommt die Unterlagen mit aktivierten Zitaten. Der Chat zeigt, auf welche Dokumente sich die Antwort stützt.',
              'Streaming per Server-Sent Events: Die Antwort erscheint, während sie entsteht.',
              'Prompt-Caching: Die immer gleichen Teile der Anfrage kosten ab der zweiten Frage nur noch einen Bruchteil.',
              'Rückfragen wie „Und welche Ergebnisse?“ werden mit dem Kontext der vorherigen Frage gesucht.',
            ],
          },
          {
            title: 'Sicherheit & Datenschutz',
            points: [
              'Signierter Gesprächsverlauf (HMAC): Untergeschobene Antworten im Verlauf werden abgelehnt.',
              'Strenger Systemprompt: nur Fragen zum Profil, nichts erfinden, Dokumente gelten als Daten und nicht als Anweisungen.',
              'Rate-Limits pro IP, begrenzte parallele Antworten und ein Tagesbudget, das auch Neustarts übersteht.',
              'Dokumente sind erst öffentlich, wenn sie ausdrücklich freigegeben sind. Beim Import warnt eine Prüfung vor persönlichen Daten und Sperrvermerken.',
            ],
          },
          {
            title: 'Qualitätssicherung',
            points: [
              'Über 70 automatische Tests mit pytest, ohne Netzwerk und ohne API-Kosten.',
              'Testfragen mit typischen Recruiter-Fragen und Fangfragen, etwa nach Gehalt oder dem Systemprompt, bei denen der Bot ablehnen oder Nichtwissen zugeben muss.',
              'Kommandozeilen-Werkzeuge zum Aufbereiten von PDFs, Prüfen der Suche und Testen einzelner Fragen.',
            ],
          },
        ],
        stack: [
          { group: 'Frontend', items: ['React', 'CSS', 'Server-Sent Events'] },
          { group: 'Backend', items: ['Python', 'FastAPI', 'Pydantic'] },
          { group: 'KI & Suche', items: ['Claude (Anthropic API)', 'fastembed', 'BM25', 'NumPy'] },
          { group: 'Qualität', items: ['pytest', 'Evals'] },
        ],
      },
    },

    thesis: {
      title: 'Masterarbeit: Effiziente Klassifikation von Bildserien',
      description:
        'Ein kleines Netz lernt, welche Bilder einer Serie informativ sind; nur diese klassifiziert ein großes Netz. ' +
        'Bei Bienen-Videos spart das 88 % Rechenaufwand bei fast gleicher Genauigkeit. Mit interaktiver Demo.',
      details: {
        meta: 'Masterarbeit Informatik · TU Ilmenau · 2026',
        summary:
          'Meine Masterarbeit „Learning to Select Informative Views for Efficient Multi-View Object Recognition“ ' +
          'beschäftigt sich mit Bildserien und Videos, die meist Bild für Bild durch ein großes Netz laufen, obwohl ' +
          'viele Bilder redundant, unscharf oder verdeckt sind. Ein leichtes Netz (Sampler) bewertet deshalb jedes ' +
          'Bild, und nur die K besten klassifiziert ein großes Multi-View-Netz. Die Trainingsziele für den Sampler ' +
          'erzeugt der Klassifikator selbst, als eine Form von Teacher-Student-Lernen ohne zusätzliche Annotationen. ' +
          'Methode, Implementierung und Auswertung auf vier Datensätzen habe ich selbst umgesetzt.',
        facts: [
          { value: '−88 %', label: 'Rechenaufwand bei Bienen-Videos, Genauigkeit fast gleich' },
          { value: '+28 Pkt.', label: 'Genauigkeit gegenüber Zufallsauswahl (Ameisen, 1 Bild)' },
          { value: '4', label: 'Datensätze: Videos, Fotoserien und 3D-Renderings' },
          { value: '0', label: 'manuell annotierte Labels für die Bildqualität' },
        ],
        demoTitle: 'Ausprobieren: Welche Bilder wählt der Sampler?',
        flow: {
          title: 'Zwei Netze, getrennt trainiert',
          steps: [
            {
              title: 'Klassifikator',
              text: 'ConvNeXt Tiny lernt auf vollständigen Serien, Mean-Pooling fasst beliebig viele Bilder zusammen. Temperature Scaling kalibriert die Wahrscheinlichkeiten.',
            },
            {
              title: 'Labels',
              text: 'Der Klassifikator bewertet jedes Bild einzeln. Seine höchste Klassenwahrscheinlichkeit wird zum Gütelabel, ganz ohne Annotation.',
            },
            {
              title: 'Sampler',
              text: 'Ein leichtes EfficientNet Lite 0 lernt per Regression, diesen Score direkt aus dem Bild vorherzusagen.',
            },
            {
              title: 'Top-K',
              text: 'Im Einsatz bewertet der Sampler alle Bilder, nur die K besten laufen durch den teuren Klassifikator.',
            },
          ],
        },
        sections: [
          {
            title: 'Problem & Idee',
            points: [
              'Der Aufwand klassischer Multi-View- und Video-Modelle wächst linear mit der Zahl der Bilder, auch wenn viele davon kaum Information beitragen.',
              'Ein gemeinsam trainierter Ansatz aus Bewertung und Klassifikation erwies sich in Vorversuchen als instabil. Deshalb trenne ich beides: Ein kleines Netz bewertet, ein großes klassifiziert.',
              'Kein Reinforcement Learning, keine zusätzlichen Annotationen: Die Trainingsziele liefert der kalibrierte Klassifikator.',
              'Top-K statt Schwellenwert: Die Zahl der verarbeiteten Bilder und damit der Rechenaufwand bleibt planbar.',
            ],
          },
          {
            title: 'Training & Daten',
            points: [
              'Vier Datensätze mit unterschiedlichem Charakter: Wildbienen-Videos, Ameisen unter dem Mikroskop (AntWeb), Pflanzenfotos (PlantCLEF) und gerenderte 3D-Modelle (ModelNet40).',
              'Künstliche Unschärfe, Rauschen und Verdeckungen sowie eingestreute Fremdbilder geben dem Sampler ein breites Spektrum an Bildqualität. Ohne sie fällt sein R² etwa bei ModelNet40 von 0,66 auf 0,42.',
              'Eigener Kalibrierungs-Split für Temperature Scaling mit net:cal, getrennt von Training und Test.',
              'Jede Konfiguration dreimal trainiert, berichtet als Mittelwert und Standardabweichung. Experimente mit Hydra konfiguriert und in Weights & Biases protokolliert.',
            ],
          },
          {
            title: 'Ergebnisse',
            points: [
              'Mit Störungen schlägt die gelernte Auswahl die zufällige fast durchgehend, am deutlichsten bei wenigen Bildern: bis zu 28 Prozentpunkte.',
              'Dabei wirkt sie als Filter: Bei Ameisen und Pflanzen erreichen drei gewählte Bilder mehr Genauigkeit als alle zusammen.',
              'Je stärker ein Bild gestört ist, desto niedriger sein Score; die Korrelation liegt je nach Datensatz zwischen 0,46 und 0,79.',
              'Künstlich gestörte Bilder erkennt der Sampler mit einem Recall von 97 %.',
              'Der Sampler ist klein genug fürs Endgerät. Auf dem Server laufen dann nur noch K Bilder durch den Klassifikator.',
            ],
          },
          {
            title: 'Grenzen & Ausblick',
            points: [
              'Der Sampler bewertet jedes Bild für sich. Ergänzen sich Ansichten wie Blüte, Blatt und Frucht, kann Top-K wichtige, aber einzeln schwächere Bilder verwerfen.',
              'Die Kalibrierung brachte hier kaum etwas: Durch Label Smoothing war der Klassifikator bereits gut kalibriert (Temperatur nahe 1).',
              'Nächste Schritte: mehr Vielfalt in der Auswahl, etwa per Clustering, und eine Fusion, die gemeinsam mit dem Sampler nachtrainiert wird.',
            ],
          },
        ],
        stack: [
          { group: 'Modelle', items: ['ConvNeXt Tiny', 'EfficientNet Lite 0', 'Multi-View-CNN'] },
          { group: 'Training', items: ['Python', 'PyTorch', 'torchvision', 'RandAugment', 'net:cal'] },
          { group: 'Experimente', items: ['Hydra', 'Weights & Biases', 'Scikit-Learn', 'Matplotlib'] },
          { group: 'Auswertung', items: ['Balanced Accuracy', 'R²', 'SSIM', 'PCA'] },
        ],
      },
    },
  },

  contact: {
    heading: 'Klingt nach dem, was du suchst? Dann meld dich doch einfach.',
    text:
      'Seit meinem Master halte ich Ausschau nach einer Stelle, bei der ich mit Computer Vision und ' +
      'Machine Learning arbeiten kann. Am liebsten da, wo die Modelle am Ende auch wirklich eingesetzt ' +
      'werden und nicht in der Schublade landen. Ich antworte meistens innerhalb von ein, zwei Tagen. ' +
      'Und falls du vorher noch was wissen willst, frag ruhig den KI-Assistenten unten rechts, der kennt ' +
      'meine Unterlagen ziemlich gut.',
  },
}
