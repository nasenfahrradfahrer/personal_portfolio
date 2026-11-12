// Schematische Motive für die Beispielserien der Frame-Auswahl-Demo. Linienstil wie Icon.jsx,
// Flächen in Textfarbe mit geringer Deckkraft (.glyph__fill). viewBox 48 × 48, Mitte (24, 24).

const flowerPetals = [0, 60, 120, 180, 240, 300].map((angle) => (
  <ellipse
    key={angle}
    className="glyph__fill"
    cx="24"
    cy="14.5"
    rx="4.2"
    ry="7"
    transform={`rotate(${angle} 24 24)`}
  />
))

const flower = (
  <>
    {flowerPetals}
    <circle cx="24" cy="24" r="4" />
  </>
)

const shapes = {
  bee: (
    <>
      <ellipse className="glyph__wing" cx="25" cy="15" rx="6" ry="3.2" transform="rotate(-28 25 15)" />
      <ellipse className="glyph__wing" cx="30" cy="14.5" rx="5" ry="2.8" transform="rotate(-58 30 14.5)" />
      <ellipse className="glyph__fill" cx="20" cy="25" rx="9" ry="6.5" />
      <path d="M17 19.2v11.6M21.5 18.6v12.8" />
      <circle className="glyph__fill" cx="32" cy="24" r="4.5" />
      <circle cx="38.6" cy="23" r="2.8" />
      <path d="m40.2 20.8 2.6-4.2M11 25H8.5M29 28l-2 5M33 28.4l1 5" />
    </>
  ),
  antProfile: (
    <>
      <circle className="glyph__fill" cx="37" cy="21" r="4.2" />
      <path d="m40 17.5 3.5-5M41 22.5l3 1.5" />
      <ellipse className="glyph__fill" cx="28" cy="23.5" rx="5.2" ry="3" />
      <circle cx="21.3" cy="24.8" r="1.6" />
      <ellipse className="glyph__fill" cx="12.5" cy="25" rx="7" ry="5.5" />
      <path d="m25.5 26.2-4 9M28.5 26.5V36M31.5 25.8l4 9" />
    </>
  ),
  antDorsal: (
    <>
      <circle className="glyph__fill" cx="24" cy="10" r="4" />
      <path d="m22 6.5-4-4M26 6.5l4-4" />
      <ellipse className="glyph__fill" cx="24" cy="19.5" rx="3" ry="5" />
      <circle cx="24" cy="26.6" r="1.6" />
      <ellipse className="glyph__fill" cx="24" cy="36" rx="6.5" ry="7.5" />
      <path d="m21.3 17-8-5M21 20.5l-9 1M21.5 23.5l-7.5 7M26.7 17l8-5M27 20.5l9 1M26.5 23.5l7.5 7" />
    </>
  ),
  antHead: (
    <>
      <path className="glyph__fill" d="M24 11c7 0 11.5 5 11.5 12S31 36 24 36s-11.5-6-11.5-13S17 11 24 11Z" />
      <ellipse cx="16.8" cy="21" rx="2" ry="3.2" />
      <ellipse cx="31.2" cy="21" rx="2" ry="3.2" />
      <path d="m20 12.5-5-8M28 12.5l5-8M20 35l-3.5 6.5 5-3M28 35l3.5 6.5-5-3" />
    </>
  ),
  flower,
  leaf: (
    <>
      <path className="glyph__fill" d="M24 5c11 8 13 25 0 38C11 30 13 13 24 5Z" />
      <path d="M24 9v37M24 18l6-4M24 18l-6-4M24 26l7.5-4.5M24 26l-7.5-4.5M24 34l6-4M24 34l-6-4" />
    </>
  ),
  fruit: (
    <>
      <circle className="glyph__fill" cx="17" cy="33" r="6.5" />
      <circle className="glyph__fill" cx="31" cy="35" r="6.5" />
      <path d="M17 26.5C19 18 23 12 29 8M31 28.5C30.5 20 30 14 29 8" />
      <path className="glyph__fill" d="M29 8c4-3 9-2 11 1-4 2.5-8 2-11-1Z" />
    </>
  ),
  bark: (
    <>
      <rect className="glyph__fill" x="17" y="3" width="14" height="42" stroke="none" />
      <path d="M17 3v42M31 3v42M21 9l2.5 4M27 15l-2 5M21.5 23l3 4.5M26.5 31 24 35M21 38l2 4" />
    </>
  ),
  plant: (
    <>
      <path d="M12 43h24M24 43V17" />
      <path className="glyph__fill" d="M24 33c-6.5-.5-10.5-4.5-12-10.5 6.5 0 10.5 4 12 10.5Z" />
      <path className="glyph__fill" d="M24 26c6.5-.5 10.5-4.5 12-10.5-6.5 0-10.5 4-12 10.5Z" />
      <circle className="glyph__fill" cx="24" cy="13" r="4" />
    </>
  ),
}

// Stuhl als Drahtgitter, orthografisch projiziert: Drehung um die Hochachse, Kamera 25° von oben.
// So entstehen wie bei ModelNet40 Ansichten im 30°-Abstand.
const CHAIR_FACES = [
  [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]],
  [[-1, 0, -1], [1, 0, -1], [1, 1.5, -1], [-1, 1.5, -1]],
]
const CHAIR_LINES = [
  [[-0.85, 0, -0.85], [-0.85, -1.3, -0.85]],
  [[0.85, 0, -0.85], [0.85, -1.3, -0.85]],
  [[0.85, 0, 0.85], [0.85, -1.3, 0.85]],
  [[-0.85, 0, 0.85], [-0.85, -1.3, 0.85]],
  [[-0.35, 0, -1], [-0.35, 1.5, -1]],
  [[0.35, 0, -1], [0.35, 1.5, -1]],
]
const ELEVATION = (25 * Math.PI) / 180
const CHAIR_SCALE = 10

function project([x, y, z], angle) {
  const a = (angle * Math.PI) / 180
  const xr = x * Math.cos(a) + z * Math.sin(a)
  const zr = -x * Math.sin(a) + z * Math.cos(a)
  const yr = y * Math.cos(ELEVATION) - zr * Math.sin(ELEVATION)
  return `${(24 + xr * CHAIR_SCALE).toFixed(2)},${(25 - yr * CHAIR_SCALE).toFixed(2)}`
}

function Chair({ angle = 0 }) {
  return (
    <>
      {CHAIR_FACES.map((face, i) => (
        <polygon key={i} className="glyph__fill" points={face.map((p) => project(p, angle)).join(' ')} />
      ))}
      {CHAIR_LINES.map(([from, to], i) => (
        <polyline key={i} points={`${project(from, angle)} ${project(to, angle)}`} />
      ))}
    </>
  )
}

// Blume als Kulisse der Bienen-Videos, bleibt in jedem Bild an derselben Stelle
const beeScene = (
  <g className="glyph__scene" transform="translate(29 31) scale(0.42)">
    <path d="M24 30v30" />
    {flower}
  </g>
)

export default function FrameGlyph({ name, pose = {}, scene = false }) {
  const { x = 0, y = 0, r = 0, angle = 0 } = pose

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {scene && beeScene}
      {name && (
        <g transform={`translate(${x} ${y}) rotate(${r} 24 24)`}>
          {name === 'chair' ? <Chair angle={angle} /> : shapes[name]}
        </g>
      )}
    </svg>
  )
}
