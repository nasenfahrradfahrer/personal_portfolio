// Texts of the interactive project demos. Numbers and results live in src/data/frameSelection.js;
// dataset keys match the ids there.

export default {
  percent: '{{value}}%',
  points: '{{value}} pts',
  accuracy: 'Accuracy',

  frameSelection: {
    datasets: {
      modelnet: {
        name: '3D objects',
        about: '3D models, rendered all around from 12 viewpoints. 40 classes.',
        insight:
          'Neighboring views are very similar: with two selected views, the compute drops by three quarters ' +
          'while accuracy drops only slightly.',
      },
      bees: {
        name: 'Wild bees',
        about: 'Videos of wild bees in the field, thinned out to at most 32 frames. 35 species.',
        insight:
          'Many nearly identical frames: a single well-chosen frame almost matches the accuracy of all 28, ' +
          'at about an eighth of the compute.',
      },
      antweb: {
        name: 'Ants',
        about: 'Microscope images of mounted ants: dorsal, head and profile views. 81 genera.',
        insight:
          'Only about three images per series, so K stops at 3 here: at that point almost every series is processed ' +
          'in full and the savings disappear. With perturbations, however, the selection acts as a filter: ' +
          'Top-2 and Top-3 even beat all images.',
      },
      plantclef: {
        name: 'Plants',
        about: 'Photos of different plant organs such as flower, leaf and fruit. 238 genera.',
        insight:
          'Flower, leaf and fruit complement each other instead of repeating. Since the sampler scores each image ' +
          'on its own, this is the hardest case. With perturbations, Top-3 still matches all images at just over ' +
          'half the compute.',
      },
    },
    states: {
      blur: 'Blurred',
      noise: 'Noise',
      occlusion: 'Occluded',
      ood: 'Foreign image',
    },
    notes: {
      edge: 'edge',
      empty: 'empty',
    },
    settings: {
      dirty: 'With perturbations',
      clean: 'Without perturbations',
    },
    settingsInline: {
      dirty: 'with perturbations',
      clean: 'without perturbations',
    },
    datasetLabel: 'Dataset',
    testDataLabel: 'Test data',
    seriesLabel: 'Schematic example series',
    captionExcerpt: 'Excerpt from a series with {{length}} images on average.',
    captionAll: 'K = {{k}}, the series has only {{n}} images: all of them go to the classifier.',
    captionSelected_one: 'The sampler scores all {{n}} images; only the highlighted one goes to the classifier.',
    captionSelected_other: 'The sampler scores all {{n}} images; only the {{count}} highlighted ones go to the classifier.',
    frame: 'Image {{number}}',
    frameLabeled: 'Image {{number}} ({{label}})',
    frameStatus: '{{frame}}: score {{score}}, {{status}}',
    selectedAs: 'selected as number {{rank}}',
    notSelected: 'not selected',
    kLabel: 'Selected images K',
    balancedAccuracy: 'Balanced accuracy',
    vsAll: 'vs. all images',
    topK: 'Top-{{k}} (sampler)',
    random_one: '{{count}} random',
    random_other: '{{count}} random',
    all: 'All images',
    accuracyTooltip: '{{value}}% ± {{sd}} (3 runs)',
    compute: 'Compute',
    gflopsPerSeries: 'GFLOPs per series',
    gflops: '{{value}} GFLOPs',
    summary:
      '{{dataset}}, {{setting}}, Top-{{k}}: {{top}}% accuracy, {{all}}% with all images, compute {{compute}}%.',
    note:
      'Results from the thesis: balanced accuracy on the test data, mean of three training runs each ' +
      '(standard deviation at most 1.9 points). Compute is estimated; for Top-K it includes the sampler scoring ' +
      'all images. The image series is a schematic illustration.',
  },
}
