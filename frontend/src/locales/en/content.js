// Page content in English. Same keys as src/locales/de/content.js; anything missing here falls
// back to German. {{name}} and {{firstName}} are replaced with the name from profile.name.

export default {
  profile: {
    role: 'AI & Software Engineer',
    tagline:
      "I'm a computer scientist specializing in artificial intelligence, machine learning and computer vision. I build intelligent systems, from data preparation and training neural networks to integrating the models into real-world applications.",
    availability: 'Open to new opportunities',
    location: 'Erfurt, Germany',
    facts: {
      years: 'Years of experience',
      projects: 'Projects',
      certificates: 'Certificates',
    },
  },

  chat: {
    title: 'AI Assistant',
    launcherLabel: 'Ask my AI assistant',
    greeting: 'Hi! I answer questions about the qualifications, projects and experience of {{name}}.',
    notice:
      "You're chatting with an AI. Its answers are based on my documents but may contain mistakes. " +
      "For anything binding, it's best to contact me directly.",
    suggestions: [
      'What experience does {{firstName}} have with computer vision?',
      'Which web technologies does {{firstName}} know?',
      'Does {{firstName}} have experience with explainable AI?',
    ],
  },

  sections: {
    profil: {
      nav: 'Profile',
    },
    erfahrung: {
      nav: 'Experience',
      title: 'Career',
      lead:
        'From web development for the public sector and AI engineering at BMW to research on ' +
        'various computer vision topics at TU Ilmenau.',
    },
    skills: {
      nav: 'Skills',
      title: 'Skills & Projects',
      lead:
        'The tools I work with, the languages I speak and what I have built recently: ' +
        "from the RAG chatbot on this site to the image-sequence classification from my master's thesis.",
    },
    kontakt: {
      nav: 'Contact',
      title: "Let's talk",
      lead:
        "The easiest way to reach me is by email. I'm happy to hear from you, even if it's just a " +
        'quick question.',
    },
  },

  experience: {
    master: {
      title: "Master's in Computer Science",
      org: 'TU Ilmenau · Ilmenau',
      description:
        '<dl>' +
        '<dt>Focus</dt><dd>Data Science / Machine Learning</dd>' +
        '<dt>Final grade</dt><dd>1.3 (very good)</dd>' +
        "<dt>Master's thesis</dt><dd><em>Learning to Select Informative Views for Efficient Multi-View Object " +
        'Recognition</em>, grade 1.0</dd>' +
        '</dl>',
      tags: ['Computer Vision', 'Deep Learning', 'Multi-view learning'],
    },
    bmw: {
      title: 'Data Analytics Intern',
      org: 'BMW AG · Munich',
      description:
        '<p>Further development of an AI model that classifies vehicle fault causes based on vehicle data.</p>' +
        '<ul>' +
        '<li>Built an embedding model for nested JSON data using a Set Transformer and nested tensors: ' +
        '<strong>+2 percentage points F1</strong> in the affected use cases</li>' +
        '<li>Improved calibration: MetaCal reduced the expected calibration error by almost an order of magnitude in tests</li>' +
        '<li>Rewrote the inference dashboard (Streamlit on Snowflake): targeted caching removed the multi-second waits</li>' +
        '</ul>',
      tags: ['PyTorch', 'Set Transformer', 'Calibration', 'Streamlit', 'Snowflake', 'AWS'],
    },
    ibykus: {
      title: 'Working Student in Web Development',
      org: 'IBYKUS AG · Erfurt',
      description:
        '<p>Further development of the web portal for managing public funding in a Scrum team, including HALM2, ' +
        'the agricultural funding program of the German state of Hesse.</p>' +
        '<ul>' +
        '<li>Developed frontend and backend with JSF/PrimeFaces, XHTML, CSS, JavaScript and SQL</li>' +
        '<li><strong>Led a frontend task force</strong> and created templates that the team reused</li>' +
        '<li>Unit and integration tests, bug fixing and onboarding interns</li>' +
        '</ul>',
      tags: ['JSF', 'PrimeFaces', 'JavaScript', 'SQL', 'Testing'],
    },
    bachelor: {
      title: "Bachelor's in Computer Science",
      org: 'TU Ilmenau · Ilmenau',
      description:
        '<dl>' +
        "<dt>Bachelor's thesis</dt><dd><em>Bee Wing Segmentation and Pattern Analysis</em>: used explainable AI " +
        'to examine whether neural networks rely on the wings when identifying wild bee species</dd>' +
        '</dl>',
      tags: ['Computer Vision', 'Segmentation', 'Explainable AI'],
    },
  },

  projects: {
    assistant: {
      title: 'AI assistant for this portfolio',
      description:
        'A chatbot that answers questions about my profile, based on my documents and with sources. Try it in the bottom right corner!',
      details: {
        meta: 'Personal project · Full stack',
        summary:
          'Recruiters can ask me questions directly here. The assistant finds the relevant passages in my ' +
          'documents and has Claude turn them into an answer with sources. If something is not in the documents, ' +
          'it says so instead of making things up. I designed and built the backend, chat interface, knowledge ' +
          'base and tests.',
        facts: [
          { value: 'Hybrid', label: 'keyword and semantic search' },
          { value: '1–4¢', label: 'API cost per answer' },
          { value: '70+', label: 'automated tests' },
          { value: '0', label: 'stored IP addresses' },
        ],
        flow: {
          title: 'How an answer is created',
          steps: [
            {
              title: 'Question',
              text: 'The browser sends the question along with the signed conversation history to the backend.',
            },
            {
              title: 'Checks',
              text: 'Rate limits, a daily budget, and input and signature checks keep abuse and costs under control.',
            },
            {
              title: 'Search',
              text: 'Keyword and semantic search find the relevant sections in the knowledge base.',
            },
            {
              title: 'Answer',
              text: 'Claude writes the answer from them. It appears word by word, with the sources below.',
            },
          ],
        },
        sections: [
          {
            title: 'Knowledge base & search',
            points: [
              'Two tiers: short documents such as the profile and FAQ are included with every question, while long texts such as theses are split into sections and searched selectively.',
              'BM25 finds exact terms like “LayerCAM”, a multilingual embedding model also finds paraphrases. Reciprocal Rank Fusion combines both rankings.',
              'The embedding model runs locally on the CPU, so my texts are not sent to any external service for it.',
              'The tech stack of this site is included automatically: the website and the chatbot share the same source.',
            ],
          },
          {
            title: 'Answers with sources',
            points: [
              'Claude receives the documents with citations enabled. The chat shows which documents the answer is based on.',
              'Streaming via server-sent events: the answer appears while it is being written.',
              'Prompt caching: from the second question on, the parts of the request that never change cost only a fraction.',
              'Follow-up questions like “And what were the results?” are searched with the context of the previous question.',
            ],
          },
          {
            title: 'Security & privacy',
            points: [
              'Signed conversation history (HMAC): answers smuggled into the history are rejected.',
              'Strict system prompt: only questions about the profile, no making things up, and documents count as data, not as instructions.',
              'Rate limits per IP, a cap on parallel answers and a daily budget that survives restarts.',
              'Documents only become public once they are explicitly approved. On import, a check warns about personal data and confidentiality notices.',
            ],
          },
          {
            title: 'Quality assurance',
            points: [
              'More than 70 automated tests with pytest, without network access or API costs.',
              'Typical recruiter questions plus trick questions, for example about salary or the system prompt, where the bot has to decline or admit that it does not know.',
              'Command-line tools for preparing PDFs, checking the search and testing individual questions.',
            ],
          },
        ],
        stack: [
          { group: 'Frontend', items: ['React', 'CSS', 'Server-Sent Events'] },
          { group: 'Backend', items: ['Python', 'FastAPI', 'Pydantic'] },
          { group: 'AI & search', items: ['Claude (Anthropic API)', 'fastembed', 'BM25', 'NumPy'] },
          { group: 'Quality', items: ['pytest', 'Evals'] },
        ],
      },
    },

    thesis: {
      title: "Master's thesis: Efficient classification of image series",
      description:
        'A small network learns which images in a series are informative; only those are classified by a large network. ' +
        'On bee videos, this saves 88% of the compute at nearly the same accuracy. With an interactive demo.',
      details: {
        meta: "Master's thesis in computer science · TU Ilmenau · 2026",
        summary:
          'My master’s thesis “Learning to Select Informative Views for Efficient Multi-View Object Recognition” ' +
          'deals with image series and videos, which usually run through a large network frame by frame, even ' +
          'though many images are redundant, blurry or occluded. A lightweight network (the sampler) therefore ' +
          'scores every image, and a large multi-view network classifies only the K best. The classifier itself ' +
          'generates the training targets for the sampler, a form of teacher-student learning without additional ' +
          'annotations. I developed the method, implementation and evaluation on four datasets myself.',
        facts: [
          { value: '−88%', label: 'compute on bee videos, nearly the same accuracy' },
          { value: '+28 pts', label: 'accuracy vs. random selection (ants, 1 image)' },
          { value: '4', label: 'datasets: videos, photo series and 3D renderings' },
          { value: '0', label: 'manually annotated labels for image quality' },
        ],
        demoTitle: 'Try it: Which images does the sampler pick?',
        flow: {
          title: 'Two networks, trained separately',
          steps: [
            {
              title: 'Classifier',
              text: 'ConvNeXt Tiny learns on complete series; mean pooling combines any number of images. Temperature scaling calibrates the probabilities.',
            },
            {
              title: 'Labels',
              text: 'The classifier scores each image individually. Its highest class probability becomes the quality label, with no annotation needed.',
            },
            {
              title: 'Sampler',
              text: 'A lightweight EfficientNet Lite 0 learns via regression to predict this score directly from the image.',
            },
            {
              title: 'Top-K',
              text: 'At inference, the sampler scores all images, and only the K best go through the expensive classifier.',
            },
          ],
        },
        sections: [
          {
            title: 'Problem & idea',
            points: [
              'The cost of classic multi-view and video models grows linearly with the number of images, even if many of them add little information.',
              'A jointly trained approach for scoring and classification proved unstable in preliminary experiments. So I separate the two: a small network scores, a large one classifies.',
              'No reinforcement learning, no additional annotations: the calibrated classifier provides the training targets.',
              'Top-K instead of a threshold: the number of processed images, and with it the compute, stays predictable.',
            ],
          },
          {
            title: 'Training & data',
            points: [
              'Four datasets with different characteristics: wild bee videos, ants under the microscope (AntWeb), plant photos (PlantCLEF) and rendered 3D models (ModelNet40).',
              'Artificial blur, noise and occlusions plus mixed-in out-of-distribution images give the sampler a wide range of image quality. Without them, its R² on ModelNet40, for example, drops from 0.66 to 0.42.',
              'A separate calibration split for temperature scaling with net:cal, kept apart from training and test.',
              'Every configuration trained three times, reported as mean and standard deviation. Experiments configured with Hydra and logged in Weights & Biases.',
            ],
          },
          {
            title: 'Results',
            points: [
              'With perturbations, the learned selection beats random selection almost across the board, most clearly with few images: by up to 28 percentage points.',
              'It also acts as a filter: for ants and plants, three selected images achieve higher accuracy than all images together.',
              'The more an image is perturbed, the lower its score; depending on the dataset, the correlation lies between 0.46 and 0.79.',
              'The sampler detects artificially perturbed images with a recall of 97%.',
              'The sampler is small enough for edge devices. The server then only runs K images through the classifier.',
            ],
          },
          {
            title: 'Limitations & outlook',
            points: [
              'The sampler scores each image on its own. When views complement each other, such as flower, leaf and fruit, Top-K can discard images that are important but weaker on their own.',
              'Calibration made little difference here: thanks to label smoothing, the classifier was already well calibrated (temperature close to 1).',
              'Next steps: more diversity in the selection, for example via clustering, and a fusion that is fine-tuned together with the sampler.',
            ],
          },
        ],
        stack: [
          { group: 'Models', items: ['ConvNeXt Tiny', 'EfficientNet Lite 0', 'Multi-view CNN'] },
          { group: 'Training', items: ['Python', 'PyTorch', 'torchvision', 'RandAugment', 'net:cal'] },
          { group: 'Experiments', items: ['Hydra', 'Weights & Biases', 'Scikit-Learn', 'Matplotlib'] },
          { group: 'Evaluation', items: ['Balanced Accuracy', 'R²', 'SSIM', 'PCA'] },
        ],
      },
    },
  },

  contact: {
    heading: 'Sounds like what you are looking for? Then just get in touch.',
    text:
      "Since finishing my master's, I've been looking for a position where I can work with computer vision and " +
      'machine learning, ideally where the models actually end up in use instead of in a drawer. I usually reply ' +
      "within a day or two. And if you'd like to know something first, feel free to ask the AI assistant in the " +
      'bottom right corner; it knows my documents pretty well.',
  },
}
