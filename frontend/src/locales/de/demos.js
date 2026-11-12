// Texte der interaktiven Projekt-Demos. Zahlen und Ergebnisse stehen in src/data/frameSelection.js;
// die Schlüssel der Datensätze entsprechen den ids dort.

export default {
  percent: '{{value}} %',
  points: '{{value}} Pkt.',
  accuracy: 'Genauigkeit',

  frameSelection: {
    datasets: {
      modelnet: {
        name: '3D-Objekte',
        about: '3D-Modelle, rundum aus 12 Blickwinkeln gerendert. 40 Klassen.',
        insight:
          'Benachbarte Ansichten ähneln sich stark: Mit zwei gewählten Ansichten sinkt der Rechenaufwand um ' +
          'drei Viertel, die Genauigkeit nur leicht.',
      },
      bees: {
        name: 'Wildbienen',
        about: 'Videos von Wildbienen in freier Natur, auf höchstens 32 Bilder ausgedünnt. 35 Arten.',
        insight:
          'Viele fast gleiche Bilder: Schon ein gut gewähltes Bild erreicht beinahe die Genauigkeit aller 28, ' +
          'bei rund einem Achtel des Rechenaufwands.',
      },
      antweb: {
        name: 'Ameisen',
        about: 'Mikroskopaufnahmen präparierter Ameisen: Rücken, Kopf und Profil. 81 Gattungen.',
        insight:
          'Nur gut drei Bilder pro Serie, deshalb endet K hier bei 3: Dort wird fast jede Serie komplett verarbeitet ' +
          'und die Ersparnis verschwindet. Mit Störungen wirkt die Auswahl dafür als Filter: Top-2 und Top-3 ' +
          'schlagen sogar alle Bilder.',
      },
      plantclef: {
        name: 'Pflanzen',
        about: 'Fotos verschiedener Pflanzenorgane wie Blüte, Blatt und Frucht. 238 Gattungen.',
        insight:
          'Blüte, Blatt und Frucht ergänzen sich, statt sich zu wiederholen. Weil der Sampler jedes Bild einzeln ' +
          'bewertet, ist das der schwierigste Fall. Mit Störungen liegt Top-3 trotzdem gleichauf mit allen Bildern, ' +
          'bei gut halbem Aufwand.',
      },
    },
    states: {
      blur: 'Unscharf',
      noise: 'Rauschen',
      occlusion: 'Verdeckt',
      ood: 'Fremdbild',
    },
    notes: {
      edge: 'Rand',
      empty: 'leer',
    },
    settings: {
      dirty: 'Mit Störungen',
      clean: 'Ohne Störungen',
    },
    // Dieselben Einstellungen innerhalb eines Satzes (Zusammenfassung für Screenreader)
    settingsInline: {
      dirty: 'mit Störungen',
      clean: 'ohne Störungen',
    },
    datasetLabel: 'Datensatz',
    testDataLabel: 'Testdaten',
    seriesLabel: 'Schematische Beispielserie',
    captionExcerpt: 'Ausschnitt aus einer Serie mit durchschnittlich {{length}} Bildern.',
    captionAll: 'K = {{k}}, die Serie hat nur {{n}} Bilder: Alle gehen an den Klassifikator.',
    captionSelected_one: 'Der Sampler bewertet alle {{n}} Bilder, nur das markierte geht an den Klassifikator.',
    captionSelected_other: 'Der Sampler bewertet alle {{n}} Bilder, nur die {{count}} markierten gehen an den Klassifikator.',
    frame: 'Bild {{number}}',
    frameLabeled: 'Bild {{number}} ({{label}})',
    frameStatus: '{{frame}}: Score {{score}}, {{status}}',
    selectedAs: 'ausgewählt als Nummer {{rank}}',
    notSelected: 'nicht ausgewählt',
    kLabel: 'Ausgewählte Bilder K',
    balancedAccuracy: 'Balanced Accuracy',
    vsAll: 'ggü. allen Bildern',
    topK: 'Top-{{k}} (Sampler)',
    random_one: '{{count}} zufälliges',
    random_other: '{{count}} zufällige',
    all: 'Alle Bilder',
    accuracyTooltip: '{{value}} % ± {{sd}} (3 Läufe)',
    compute: 'Rechenaufwand',
    gflopsPerSeries: 'GFLOPs pro Serie',
    gflops: '{{value}} GFLOPs',
    summary:
      '{{dataset}}, {{setting}}, Top-{{k}}: {{top}} % Genauigkeit, mit allen Bildern {{all}} %, Rechenaufwand {{compute}} %.',
    note:
      'Ergebnisse aus der Arbeit: Balanced Accuracy auf den Testdaten, Mittelwert aus je drei Trainingsläufen ' +
      '(Standardabweichung höchstens 1,9 Punkte). Rechenaufwand geschätzt, bei Top-K inklusive der Bewertung ' +
      'aller Bilder durch den Sampler. Die Bildserie ist eine schematische Darstellung.',
  },
}
