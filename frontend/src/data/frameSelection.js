// Daten der interaktiven Demo zur Masterarbeit (Projekt „Masterarbeit“, details.demo in content.js).
//
// Ergebnisse stammen aus der Arbeit, Index 0 der Listen entspricht K = 1:
//   results   Balanced Accuracy in % als [Mittelwert, Standardabweichung] aus drei Läufen,
//             dirty = mit Störungen (Tab. 8.1), clean = ohne Störungen (Tab. 8.3)
//   gflops    geschätzter Rechenaufwand pro Serie in GFLOPs (Tab. 8.2); Top-K enthält die
//             Bewertung aller Bilder durch den Sampler
//
// Die Beispielserien sind schematisch: Motive und Scores illustrieren das Verhalten des Samplers
// (Größenordnung wie in Abb. 8.4), stammen aber nicht aus einem echten Modelllauf.
//   glyph     Motiv aus FrameGlyph.jsx (null = leeres Bild), pose verschiebt/dreht es
//   score     Score des Samplers für das ungestörte Bild
//   dirty     nur mit Störungen: { state: 'blur' | 'noise' | 'occlusion', score, box }
//             box = verdeckte Fläche [links, oben, Breite, Höhe] in %
//   ood       Fremdbild aus einem anderen Datensatz, nur mit Störungen enthalten
//   note      kurzer Hinweis unter einem ungestörten Bild: 'edge' (Rand) oder 'empty' (leer)
// excerpt: Serie ist nur ein Ausschnitt (length = mittlere Bildzahl), scene: Blume als Kulisse
// Texte (Name, Beschreibung, Erkenntnis je Datensatz) stehen in src/locales/<sprache>/demos.js.
// kMax: größtes K in der Demo. Bei AntWeb sind die Serien meist kürzer als 4 Bilder; die Schätzung in
// Tab. 8.2 rechnet aber mit K Bildern und ergäbe dort mehr Aufwand als „alle Bilder“.

export const K_MAX = 5

// Ohne Sampler hängt der Aufwand nur von K ab und ist für alle Datensätze gleich
export const randomGflops = [3.28, 6.57, 9.85, 13.14, 16.42]

export const datasets = [
  {
    id: 'modelnet',
    source: 'ModelNet40',
    length: 12,
    tint: 'cyan',
    series: [
      { glyph: 'chair', pose: { angle: 0 }, score: 0.86 },
      { glyph: 'chair', pose: { angle: 30 }, score: 0.81, dirty: { state: 'blur', score: 0.22 } },
      { glyph: 'chair', pose: { angle: 60 }, score: 0.77 },
      { glyph: 'chair', pose: { angle: 90 }, score: 0.89, dirty: { state: 'noise', score: 0.18 } },
      { glyph: 'chair', pose: { angle: 120 }, score: 0.72 },
      { glyph: 'chair', pose: { angle: 150 }, score: 0.66 },
      { glyph: 'bee', ood: true, score: 0.06 },
      {
        glyph: 'chair',
        pose: { angle: 180 },
        score: 0.61,
        dirty: { state: 'occlusion', score: 0.27, box: [12, 22, 60, 56] },
      },
      { glyph: 'chair', pose: { angle: 210 }, score: 0.68 },
      { glyph: 'chair', pose: { angle: 240 }, score: 0.75, dirty: { state: 'blur', score: 0.2 } },
      { glyph: 'chair', pose: { angle: 270 }, score: 0.87 },
      { glyph: 'chair', pose: { angle: 300 }, score: 0.79, dirty: { state: 'noise', score: 0.16 } },
      { glyph: 'chair', pose: { angle: 330 }, score: 0.83 },
    ],
    results: {
      dirty: {
        topK: [[84.9, 0.9], [87.6, 0.4], [88.1, 0.6], [88.5, 0.5], [88.9, 0.6]],
        random: [[65.6, 0.4], [79.3, 0.8], [83.3, 0.3], [86.1, 0.5], [87.0, 0.2]],
        all: [89.3, 0.0],
      },
      clean: {
        topK: [[87.1, 0.4], [88.0, 0.1], [88.5, 0.3], [88.9, 0.2], [89.3, 0.3]],
        random: [[82.8, 0.3], [87.1, 0.5], [89.1, 0.3], [89.0, 0.3], [89.3, 0.6]],
        all: [90.1, 0.3],
      },
    },
    gflops: { all: 39.42, topK: [6.79, 10.08, 13.36, 16.65, 19.93] },
  },
  {
    id: 'bees',
    source: 'Bees',
    length: 28.3,
    excerpt: true,
    scene: true,
    tint: 'amber',
    series: [
      { glyph: 'bee', pose: { x: -15, y: 4, r: -8 }, score: 0.38, note: 'edge' },
      { glyph: 'bee', pose: { x: -8, y: 2, r: -5 }, score: 0.71 },
      { glyph: 'bee', pose: { x: -3, y: 0, r: 0 }, score: 0.88, dirty: { state: 'blur', score: 0.21 } },
      { glyph: 'bee', pose: { x: 0, y: -2, r: 4 }, score: 0.92 },
      { glyph: 'bee', pose: { x: 2, y: -1, r: 2 }, score: 0.9, dirty: { state: 'noise', score: 0.17 } },
      { glyph: 'leaf', ood: true, score: 0.05 },
      { glyph: 'bee', pose: { x: 3, y: 1, r: -3 }, score: 0.86 },
      {
        glyph: 'bee',
        pose: { x: 5, y: 2, r: 0 },
        score: 0.83,
        dirty: { state: 'occlusion', score: 0.33, box: [34, 14, 52, 62] },
      },
      { glyph: 'bee', pose: { x: 9, y: 1, r: 6 }, score: 0.66 },
      { glyph: 'bee', pose: { x: 18, y: 0, r: 10 }, score: 0.29, note: 'edge' },
      { glyph: null, score: 0.12, note: 'empty' },
      { glyph: 'bee', pose: { x: 6, y: 3, r: -6 }, score: 0.8, dirty: { state: 'blur', score: 0.24 } },
    ],
    results: {
      dirty: {
        topK: [[94.9, 0.8], [94.9, 0.1], [95.3, 0.2], [95.4, 0.1], [95.5, 0.1]],
        random: [[88.7, 1.5], [92.3, 1.0], [95.1, 1.3], [95.8, 0.4], [95.8, 0.8]],
        all: [95.6, 0.0],
      },
      clean: {
        topK: [[96.1, 0.7], [95.6, 0.0], [95.6, 0.0], [95.6, 0.0], [95.6, 0.0]],
        random: [[95.6, 0.0], [95.6, 0.1], [96.1, 0.7], [95.6, 0.0], [95.6, 0.0]],
        all: [95.6, 0.0],
      },
    },
    gflops: { all: 92.96, topK: [11.56, 14.84, 18.13, 21.41, 24.7] },
  },
  {
    id: 'antweb',
    source: 'AntWeb',
    length: 3.4,
    kMax: 3,
    tint: 'pink',
    series: [
      { glyph: 'antDorsal', score: 0.64 },
      { glyph: 'antHead', score: 0.52, dirty: { state: 'blur', score: 0.19 } },
      { glyph: 'flower', ood: true, score: 0.07 },
      { glyph: 'antProfile', score: 0.71 },
    ],
    results: {
      dirty: {
        topK: [[80.4, 0.4], [86.0, 0.9], [87.1, 0.9], [86.0, 0.9], [85.6, 1.0]],
        random: [[52.5, 1.2], [70.3, 1.0], [79.6, 0.6], [83.5, 0.8], [85.1, 1.0]],
        all: [85.4, 1.0],
      },
      clean: {
        topK: [[91.4, 0.8], [94.7, 0.4], [94.9, 0.2], [95.0, 0.2], [94.9, 0.1]],
        random: [[81.8, 0.7], [90.6, 0.2], [94.0, 0.0], [94.6, 0.1], [94.8, 0.1]],
        all: [94.8, 0.1],
      },
    },
    gflops: { all: 11.17, topK: [4.28, 7.56, 10.85, 14.13, 17.42] },
  },
  {
    id: 'plantclef',
    source: 'PlantCLEF',
    length: 6.6,
    tint: 'emerald',
    series: [
      { glyph: 'flower', score: 0.82 },
      { glyph: 'leaf', score: 0.69 },
      { glyph: 'fruit', score: 0.74, dirty: { state: 'noise', score: 0.15 } },
      { glyph: 'bark', score: 0.41 },
      { glyph: 'chair', pose: { angle: 60 }, ood: true, score: 0.09 },
      {
        glyph: 'plant',
        score: 0.58,
        dirty: { state: 'occlusion', score: 0.31, box: [38, 8, 52, 70] },
      },
      { glyph: 'leaf', pose: { r: 35 }, scan: true, score: 0.66 },
    ],
    results: {
      dirty: {
        topK: [[72.7, 0.7], [76.8, 1.1], [79.9, 1.2], [80.2, 1.4], [80.3, 0.9]],
        random: [[47.0, 1.9], [61.8, 1.7], [71.2, 1.6], [75.9, 0.4], [77.2, 1.5]],
        all: [79.5, 1.1],
      },
      clean: {
        topK: [[81.4, 0.9], [89.3, 0.3], [91.1, 0.1], [92.2, 0.7], [92.3, 0.6]],
        random: [[72.8, 1.7], [86.6, 0.9], [90.2, 0.3], [91.7, 0.7], [92.3, 0.6]],
        all: [92.3, 0.6],
      },
    },
    gflops: { all: 21.68, topK: [5.21, 8.5, 11.78, 15.07, 18.35] },
  },
]
