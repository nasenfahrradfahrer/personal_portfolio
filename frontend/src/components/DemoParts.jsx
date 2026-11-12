import './DemoParts.css'

// Gemeinsame Bausteine der interaktiven Projekt-Demos (z. B. FrameSelectionDemo).
// Der Rahmen selbst ist die Klasse .demo-box, Text nur für Screenreader .demo-sr-only.

// Umschalter als Pillen-Buttons; options: [{ id, label }]
export function DemoTabs({ label, options, value, onChange }) {
  return (
    <div className="demo-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="demo-tab"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Ergebnis als Balken: die hervorgehobene Zeile (emphasis) in der Akzentfarbe, die Vergleiche
// grau. Der Kopf zeigt eine Kennzahl (delta) mit kurzer Erläuterung (deltaNote).
export function ResultPanel({ title, subtitle, delta, deltaNote, max, rows, format, tooltip }) {
  return (
    <section className="result-panel">
      <header className="result-panel__head">
        <div>
          <h4 className="result-panel__title">{title}</h4>
          <p className="result-panel__sub">{subtitle}</p>
        </div>
        <p className="result-panel__delta">
          <strong>{delta}</strong>
          <span>{deltaNote}</span>
        </p>
      </header>
      <ul className="result-panel__bars">
        {rows.map((row) => (
          <li key={row.label} className={`result-bar${row.emphasis ? ' is-emphasis' : ''}`} title={tooltip?.(row)}>
            <span className="result-bar__label">{row.label}</span>
            <span className="result-bar__value">{format(row.value)}</span>
            <span className="result-bar__track" aria-hidden="true">
              <span style={{ width: `${(row.value / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
