// Unterseiten mit eigenem Pfad. Vercel liefert für sie index.html aus (rewrites in vercel.json),
// der Vite-Server macht das von selbst. Gewechselt wird per normalem Link, ohne Router.
export const PAGES = {
  imprint: '/impressum',
  privacy: '/datenschutz',
}

export const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'

export const isHome = currentPath === '/'

// Anker eines Abschnitts der Startseite; von einer Unterseite aus mit Wechsel zur Startseite
export const homeHref = (id) => (isHome ? `#${id}` : `/#${id}`)
