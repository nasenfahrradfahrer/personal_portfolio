// Fixed interface labels: buttons, hints, screen reader labels.
// Keys ending in _one/_other are plural forms (selected via count).

export default {
  app: {
    skipLink: 'Skip to content',
  },

  header: {
    nav: 'Main navigation',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    language: 'Language',
  },

  footer: {
    toTop: 'Back to top',
    legal: 'Legal',
    imprint: 'Legal notice',
    privacy: 'Privacy policy',
  },

  legal: {
    back: 'Back to home',
    germanOnly: 'This page is only available in German.',
  },

  units: {
    years_one: '{{value}} year',
    years_other: '{{value}} years',
  },

  hero: {
    greeting: "Hi, I'm",
    contact: 'Get in touch',
    watchVideo: 'Watch video',
    watchVideoLabel: 'Watch introduction video',
    watchVideoLabelDuration: 'Watch introduction video ({{duration}})',
    career: 'View career',
    downloadCv: 'Download CV (PDF)',
  },

  video: {
    meta: 'Introduction video',
    close: 'Close video',
    placeholder: 'The introduction video will appear here',
    placeholderNote: 'Placeholder · aspect ratio {{ratio}}',
  },

  skills: {
    competencies: 'Skills',
    languages: 'Programming languages',
    projects: 'Selected projects',
    details: 'View details',
  },

  project: {
    number: 'Project {{number}}',
    close: 'Close details',
    stack: 'Technologies',
    tryChat: 'Try it',
    closeButton: 'Close',
    mobileHint: 'This view works on mobile too, but it looks best on a desktop.',
  },

  contact: {
    email: 'Email',
    location: 'Location',
    availability: 'Availability',
    writeEmail: 'Send an email',
  },

  contactForm: {
    name: 'Name (optional)',
    email: 'Your email address',
    message: 'Message',
    send: 'Send message',
    sending: 'Sending …',
    sent: "Thanks, your message has arrived. I'll get back to you as soon as possible.",
    privacy:
      'I only use your details to reply to your message. They are forwarded to me by email. ' +
      'More in the <privacy>privacy policy</privacy> (in German).',
    errors: {
      network: 'The message could not be sent. Please try again later or email me directly.',
      generic: 'Something went wrong. Please try again or email me directly.',
      turnstile: 'The security check failed. Please reload the page.',
    },
  },

  techstack: {
    rootName: 'Tech stack',
    rootHint:
      '<p>Select a segment or an area to see details. Areas with sub-items expand; a click in the center takes you back.</p>',
    children_one: '{{count}} sub-item',
    children_other: '{{count}} sub-items',
    area: 'Area',
    areas_one: '{{count}} area',
    areas_other: '{{count}} areas',
    back: '‹ Back',
    legend: 'Areas',
    views: 'View',
    chart: 'Chart',
    list: 'List',
    chartLabel: 'Sunburst chart of the tech stack. All entries are also available in the list view.',
    overview: 'Overview',
    title: 'Interactive tech stack',
    experience: 'Experience',
    projects: 'Projects',
    noDescription: '<p>No description available.</p>',
    loading: 'Loading tech stack …',
    unavailable: 'The tech stack could not be loaded right now.',
    retry: 'Try again',
  },

  chat: {
    typing: 'Writing answer',
    restart: 'Start over',
    retry: 'Try again',
    sources: 'Sources:',
    privacy: 'Privacy',
    rateLabel: 'Rate this answer',
    rateUp: 'Helpful answer',
    rateDown: 'Not a helpful answer',
    rated: 'Thanks for your feedback.',
    close: 'Close chat',
    statusUnavailable: 'Currently unavailable',
    subtitle: 'Questions about the profile of {{name}}',
    newConversation: 'New conversation',
    unavailableHint:
      'The assistant is currently unavailable. You can reach me directly via the <contact>contact section</contact>.',
    suggestions: 'Suggestions',
    maxReached: 'This conversation has reached its maximum length.',
    startNew: 'Start a new conversation',
    inputLabel: 'Your question',
    placeholder: 'Your question …',
    placeholderMax: 'Please start a new conversation',
    send: 'Send question',
    counter: '{{length}} / {{max}} characters',
    errors: {
      unavailable: 'The assistant is currently unavailable.',
      network: 'The assistant is currently unavailable. Please try again later.',
      generic: 'Something went wrong. Please try again.',
      incomplete: 'The answer was interrupted. Please try again.',
      turnstile: 'The security check failed. Please reload the page.',
    },
  },
}
