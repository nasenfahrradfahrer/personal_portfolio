import './Background.css'

// Dekorativer, fixierter Hintergrund mit Farbverläufen und feinem Raster
export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg__blob bg__blob--violet" />
      <div className="bg__blob bg__blob--cyan" />
      <div className="bg__blob bg__blob--pink" />
      <div className="bg__blob bg__blob--amber" />
      <div className="bg__grid" />
    </div>
  )
}
