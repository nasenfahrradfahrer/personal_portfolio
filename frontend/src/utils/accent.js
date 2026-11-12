// Setzt die CSS-Variable --accent auf eine der Akzentfarben aus tokens.css
export const accentStyle = (name) => ({ '--accent': `var(--c-${name})` })
