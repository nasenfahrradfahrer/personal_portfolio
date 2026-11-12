import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { arc, descending, interpolate, partition, select, stratify } from 'd3'
import { formatYears } from '../utils/experience'
import ExperienceBar from './ExperienceBar'
import './TechStackSunburst.css'

import { fetchTechStack } from '../utils/techstackApi'

// Die Daten ({ projects, entries, texts }) liegen im privaten Repo (techstack.json und
// techstack.<sprache>.json) und kommen vom Backend (GET /api/techstack, siehe utils/techstackApi.js).
// parent: null markiert eine Wurzel-Kategorie. texts enthält die übersetzten Namen, Beschreibungen
// und Projektnamen je Sprache; fehlt ein Text, bleibt der deutsche.

// Diagrammfarben aus tokens.css (--viz-*), validiert für Flächen mit dunkler Beschriftung.
// Kategorien ohne eigene Farbe werden grau dargestellt statt Farben zu wiederholen.
const DEFAULT_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)']
const OTHER_COLOR = 'var(--viz-other)'

const ROOT_ID = '__root'
const LINE_HEIGHT_EM = 1.1
const RING_GAP = 2
const LABEL_PADDING = 8

// "\n" im Namen steuert nur den Zeilenumbruch im Diagramm
const plainName = (name) => String(name).replace(/\/\n/g, '/').replace(/\n/g, ' ')

// Zeilenvarianten eines Labels: Manuelle Umbrüche ("\n") gelten immer. Ohne sie gibt es
// zusätzlich eine zweizeilige Variante für Segmente, in die der Name einzeilig nicht passt.
function labelVariants(name) {
  const text = String(name)
  if (text.includes('\n')) return [text.split('\n')]

  // Umbruch an Leerzeichen (nicht vor "&"), nach Bindestrich/Schrägstrich oder vor einem
  // Großbuchstaben im Wort ("SegmentAnything" → "Segment" / "Anything")
  const splits = []
  for (let i = 1; i < text.length - 1; i++) {
    if (text[i] === ' ' && text[i + 1] !== '&') splits.push([text.slice(0, i), text.slice(i + 1)])
    else if (text[i] === '-' || text[i] === '/') splits.push([text.slice(0, i + 1), text.slice(i + 1)])
    else if (/[a-z]/.test(text[i - 1]) && /[A-Z]/.test(text[i])) splits.push([text.slice(0, i), text.slice(i)])
  }
  if (!splits.length) return [[text]]

  const longest = (lines) => Math.max(...lines.map((line) => line.length))
  const balanced = splits.reduce((best, lines) => (longest(lines) < longest(best) ? lines : best))
  return [[text], balanced]
}

// Setzt die Zeilen eines SVG-Textes als <tspan>, vertikal um die Mitte zentriert
function renderLines(textElement, lines) {
  const offset = (lines.length - 1) / 2
  select(textElement)
    .selectAll('tspan')
    .data(lines)
    .join('tspan')
    .attr('x', 0)
    .attr('dy', (_, i) => `${i === 0 ? 0.35 - offset * LINE_HEIGHT_EM : LINE_HEIGHT_EM}em`)
    .text((line) => line)
}

const topAncestor = (d) => {
  let a = d
  while (a.depth > 1) a = a.parent
  return a
}

function buildHierarchy(data, rootName, rootHint) {
  const nodes = [{ id: ROOT_ID, name: rootName, parent: null, content: rootHint }].concat(
    data.map((d) => ({ ...d, parent: d.parent === null ? ROOT_ID : d.parent })),
  )
  const root = stratify()
    .id((d) => d.id)
    .parentId((d) => d.parent)(nodes)
  root.count()
  root.sort((a, b) => descending(a.value, b.value))
  partition().size([2 * Math.PI, root.height + 1])(root)
  return root
}

/**
 * Tech-Stack-Grafik: lädt die Daten vom Backend und zeigt bis dahin einen Platzhalter bzw. bei
 * einem Fehler einen Hinweis mit „Erneut versuchen“. Mit `data` werden feste Daten angezeigt.
 */
export default function TechStackSunburst({ data: fixedData, ...props }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const data = fixedData ?? loaded

  useEffect(() => {
    if (fixedData) return undefined
    let active = true
    fetchTechStack()
      .then((result) => active && setLoaded(result))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [fixedData, attempt])

  if (data) return <SunburstChart data={data} {...props} />

  const retry = () => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <div className="card tech-stack tech-stack--status" aria-busy={!failed}>
      <p>{t(failed ? 'techstack.unavailable' : 'techstack.loading')}</p>
      {failed && (
        <button type="button" className="btn" onClick={retry}>
          {t('techstack.retry')}
        </button>
      )}
    </div>
  )
}

/**
 * Interaktive Zoomable-Sunburst-Darstellung eines Tech-Stacks.
 *
 * @param {Object} data - { projects, entries, texts }.
 *   projects: [{ id, name, hidden? }] – Projekte, auf die Einträge verweisen. hidden: true blendet
 *   ein Projekt überall aus; die Reihenfolge bestimmt die Reihenfolge in der Detailansicht.
 *   entries: flache Liste von Knoten { id, name, years, parent, content (HTML-String), projects (IDs) }.
 *   years: Erfahrung in Jahren (Kommazahlen erlaubt), erscheint als Leiste in der Detailansicht.
 *   parent: null kennzeichnet eine Wurzel-Kategorie. Der HTML-Inhalt wird ungefiltert
 *   gerendert und darf daher nur aus eigenen, vertrauenswürdigen Daten stammen.
 *   texts: { <sprache>: { projects: { <id>: name }, entries: { <id>: { name?, content } } } }.
 * @param {number} [width] - Maximale Breite/Höhe des quadratischen Diagramms in px.
 * @param {string[]} [colors] - Farben (auch als CSS var(...)-Strings) für die Wurzelkategorien,
 *   in der Reihenfolge, in der die Kategorien in den Daten stehen.
 */
function SunburstChart({ data, width = 520, colors = DEFAULT_COLORS }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const chartRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const detailRef = useRef(null)
  const apiRef = useRef(null)
  const focusRef = useRef(ROOT_ID)
  const experienceLabelId = useId()

  const [size, setSize] = useState(0)
  const [view, setView] = useState('chart')
  const [selectedId, setSelectedId] = useState(ROOT_ID)
  const [focusId, setFocusId] = useState(ROOT_ID)

  // Namen, Beschreibungen und Projektnamen in der aktuellen Sprache; fehlt ein Text, bleibt der deutsche
  const { localized, projectNames } = useMemo(() => {
    const texts = data.texts?.[lang] ?? {}
    return {
      localized: data.entries.map((d) => ({ ...d, ...texts.entries?.[d.id] })),
      projectNames: new Map(
        data.projects.filter((p) => !p.hidden).map((p) => [p.id, texts.projects?.[p.id] ?? p.name]),
      ),
    }
  }, [data, lang])
  const root = useMemo(
    () => buildHierarchy(localized, t('techstack.rootName'), t('techstack.rootHint')),
    [localized, t],
  )
  const nodeById = useMemo(() => new Map(root.descendants().map((d) => [d.id, d])), [root])
  const categoryIds = useMemo(() => data.entries.filter((d) => d.parent === null).map((d) => d.id), [data])
  const colorFor = useMemo(() => {
    const map = new Map(categoryIds.map((id, i) => [id, colors[i] ?? OTHER_COLOR]))
    return (id) => map.get(id) ?? OTHER_COLOR
  }, [categoryIds, colors])

  // Diagrammgröße folgt der verfügbaren Breite (ausgeblendet = Breite 0 → ignorieren)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const available = Math.floor(entry.contentRect.width)
      if (available > 0) setSize(Math.min(available, width))
    })
    observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [width])

  useEffect(() => {
    if (!size) return
    const container = chartRef.current
    const tooltip = tooltipRef.current
    const radius = size / 6
    const fontSize = size < 400 ? 9 : 10.5
    const titleSize = size < 400 ? 11 : 14
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600
    const colorOf = (d) => colorFor(topAncestor(d).id)

    const arcVisible = (d) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0

    // Label nur zeigen, wenn es ins Segment passt: radial oder entlang des Bogens, erst
    // einzeilig, dann umbrochen. node trägt die gemessenen Textgrößen je Zeilenvariante,
    // geo die (aktuelle oder Ziel-)Geometrie.
    const fitLabel = (node, geo) => {
      if (!arcVisible(geo) || !node.labelSizes) return null
      const thickness = (geo.y1 - geo.y0) * radius - RING_GAP
      const arcLength = (geo.x1 - geo.x0) * ((geo.y0 + geo.y1) / 2) * radius
      for (const [variant, { width, height }] of node.labelSizes.entries()) {
        if (width <= thickness - LABEL_PADDING && height <= arcLength - 2) return { mode: 'radial', variant }
        if (width <= arcLength - LABEL_PADDING * 2 && height <= thickness - LABEL_PADDING)
          return { mode: 'tangential', variant }
      }
      return null
    }

    const labelTransform = (d, mode) => {
      const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI)
      const r = ((d.y0 + d.y1) / 2) * radius
      const turn =
        mode === 'tangential' ? (angle > 90 && angle < 270 ? -90 : 90) : angle < 180 ? 0 : 180
      return `rotate(${angle - 90}) translate(${r},0) rotate(${turn})`
    }

    const setTargets = (p) => {
      root.each((d) => {
        d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        }
      })
    }

    const arcGen = arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, RING_GAP / (radius * 1.5)))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - RING_GAP))
      .cornerRadius(4)

    // Startzustand: aktueller Fokus (bleibt bei Größenänderungen erhalten)
    let focus = nodeById.get(focusRef.current) ?? root
    setTargets(focus)
    root.each((d) => (d.current = d.target))

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    const g = svg.append('g')

    const showTooltip = (event, d) => {
      if (event.pointerType !== 'mouse') return
      const trail = d
        .ancestors()
        .reverse()
        .slice(1, -1)
        .map((a) => plainName(a.data.name))
      tooltip.firstChild.textContent = plainName(d.data.name)
      tooltip.lastChild.textContent = d.children
        ? t('techstack.children', { count: d.children.length })
        : trail.join(' › ') || t('techstack.area')
      const box = container.getBoundingClientRect()
      let x = event.clientX - box.left + 14
      const y = event.clientY - box.top + 14
      if (x + tooltip.offsetWidth > box.width) x = event.clientX - box.left - tooltip.offsetWidth - 14
      tooltip.style.transform = `translate(${x}px, ${y}px)`
      tooltip.classList.add('is-visible')
    }
    const hideTooltip = () => tooltip.classList.remove('is-visible')

    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().filter((d) => d.depth))
      .join('path')
      .attr('class', 'tech-stack__arc')
      .style('fill', colorOf)
      .attr('fill-opacity', (d) => +arcVisible(d.current))
      .attr('pointer-events', (d) => (arcVisible(d.current) ? 'auto' : 'none'))
      .attr('d', (d) => arcGen(d.current))
      .on('click', (event, p) => choose(p))
      .on('pointermove', showTooltip)
      .on('pointerleave', hideTooltip)

    const label = g
      .append('g')
      .attr('class', 'tech-stack__labels')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('font-size', `${fontSize}px`)
      .selectAll('text')
      .data(root.descendants().filter((d) => d.depth))
      .join('text')
      .attr('class', (d) => (d.children ? 'is-parent' : null))
      .attr('fill-opacity', 0)
      .each(function (d) {
        d.labelVariants = labelVariants(d.data.name)
        renderLines(this, d.labelVariants[0])
      })

    // Passende Variante je Label wählen und deren Zeilen setzen
    const fitLabels = (selection, geometry) =>
      selection.each(function (d) {
        d.labelFit = fitLabel(d, geometry(d))
        if (d.labelFit) renderLines(this, d.labelVariants[d.labelFit.variant])
      })

    const placeLabels = () => {
      fitLabels(label, (d) => d.current)
        .attr('fill-opacity', (d) => +!!d.labelFit)
        .attr('transform', (d) => labelTransform(d.current, d.labelFit?.mode))
    }

    // Textgrößen je Zeilenvariante messen (nach dem Laden der Webfonts erneut)
    let cancelled = false
    const measure = () => {
      label.each(function (d) {
        d.labelSizes = d.labelVariants.map((lines) => {
          renderLines(this, lines)
          const widths = [...this.querySelectorAll('tspan')].map((t) => t.getComputedTextLength())
          return { width: Math.max(...widths), height: lines.length * fontSize * LINE_HEIGHT_EM }
        })
      })
      placeLabels()
    }
    measure()
    document.fonts?.ready.then(() => !cancelled && measure())

    // Mitte: aktueller Fokus, Klick führt eine Ebene zurück
    const center = g.append('g').attr('class', 'tech-stack__center')
    center
      .append('circle')
      .attr('r', radius - RING_GAP * 2)
      .on('click', () => focus.parent && choose(focus.parent))
    const centerTitle = center
      .append('text')
      .attr('class', 'tech-stack__center-title')
      .style('font-size', `${titleSize}px`)
    const centerHint = center.append('text').attr('class', 'tech-stack__center-hint')

    const updateCenter = (p) => {
      const lines = p.depth ? String(p.data.name).split('\n') : [t('techstack.rootName')]
      const lineHeight = titleSize * 1.15
      const hintSize = 11
      const blockHeight = lines.length * lineHeight + 6 + hintSize
      const firstBaseline = -blockHeight / 2 + titleSize * 0.8
      center.classed('is-root', !p.parent)
      centerTitle
        .selectAll('tspan')
        .data(lines)
        .join('tspan')
        .attr('x', 0)
        .attr('y', (_, i) => firstBaseline + i * lineHeight)
        .text((line) => line)
      centerHint
        .attr('y', firstBaseline + (lines.length - 1) * lineHeight + 6 + hintSize + 2)
        .text(p.parent ? t('techstack.back') : t('techstack.areas', { count: p.children.length }))
    }
    updateCenter(focus)

    function zoomTo(p) {
      focus = p
      focusRef.current = p.id
      setFocusId(p.id)
      setTargets(p)
      updateCenter(p)
      hideTooltip()

      const t = g.transition().duration(duration)
      path
        .transition(t)
        .tween('data', (d) => {
          const i = interpolate(d.current, d.target)
          return (tt) => (d.current = i(tt))
        })
        .attr('fill-opacity', (d) => +arcVisible(d.target))
        .attr('pointer-events', (d) => (arcVisible(d.target) ? 'auto' : 'none'))
        .attrTween('d', (d) => () => arcGen(d.current))

      fitLabels(label, (d) => d.target)
        .transition(t)
        .attr('fill-opacity', (d) => +!!d.labelFit)
        .attrTween('transform', (d) => () => labelTransform(d.current, d.labelFit?.mode))
    }

    function choose(p) {
      setSelectedId(p.id)
      if (p.children && p !== focus) zoomTo(p)
    }

    apiRef.current = {
      // toggle: erneuter Klick auf den fokussierten Bereich führt zur Übersicht zurück
      focus(id, { toggle = false } = {}) {
        const p = nodeById.get(id)
        if (!p) return
        if (toggle && p === focus) {
          setSelectedId(root.id)
          zoomTo(root)
          return
        }
        setSelectedId(p.id)
        const target = p.children ? p : p.parent
        if (target !== focus) zoomTo(target)
      },
    }

    return () => {
      cancelled = true
      apiRef.current = null
      svg.selectAll('*').interrupt().remove()
    }
  }, [root, nodeById, colorFor, size, t])

  // Ausgewähltes Segment hervorheben
  useEffect(() => {
    select(svgRef.current)
      .selectAll('.tech-stack__arc')
      .classed('is-selected', (d) => d.id === selectedId)
  }, [selectedId, size, root])

  const selectNode = (id, { scroll = false, toggle = false } = {}) => {
    if (apiRef.current) apiRef.current.focus(id, { toggle })
    else setSelectedId(id)
    if (scroll) detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const selected = nodeById.get(selectedId) ?? root
  const selectedColor = selected.depth ? colorFor(topAncestor(selected).id) : 'var(--c-violet)'
  const focusCategory = focusId !== ROOT_ID && nodeById.has(focusId) ? topAncestor(nodeById.get(focusId)).id : null
  const breadcrumb = selected
    .ancestors()
    .reverse()
    .slice(0, -1)
    .map((d) => plainName(d.data.name))
    .join(' › ')
  const years = selected.depth && typeof selected.data.years === 'number' ? selected.data.years : null
  // Sichtbare Projekte des Eintrags, in der Reihenfolge von data.projects
  const selectedProjects = [...projectNames].filter(([id]) => selected.data.projects?.includes(id))

  return (
    <div className="card tech-stack">
      <div className="tech-stack__toolbar">
        <ul className="tech-stack__legend" aria-label={t('techstack.legend')}>
          {categoryIds.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="tech-stack__legend-btn"
                style={{ '--swatch': colorFor(id) }}
                aria-pressed={focusCategory === id}
                onClick={() => selectNode(id, { toggle: true })}
              >
                <span className="tech-stack__swatch" aria-hidden="true" />
                {plainName(nodeById.get(id).data.name)}
              </button>
            </li>
          ))}
        </ul>

        <div className="tech-stack__views" role="group" aria-label={t('techstack.views')}>
          <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
            {t('techstack.chart')}
          </button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            {t('techstack.list')}
          </button>
        </div>
      </div>

      <div className="tech-stack__body">
        <div className="tech-stack__chart" ref={chartRef} style={{ maxWidth: width }} hidden={view !== 'chart'}>
          {size > 0 && (
            <svg
              ref={svgRef}
              width={size}
              height={size}
              viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
              role="img"
              aria-label={t('techstack.chartLabel')}
            />
          )}
          <div ref={tooltipRef} className="tech-stack__tooltip" aria-hidden="true">
            <strong />
            <span />
          </div>
        </div>

        {view === 'list' && (
          <div className="tech-stack__list">
            {categoryIds.map((id) => (
              <section key={id} className="tech-stack__group" style={{ '--accent': colorFor(id) }}>
                <button
                  type="button"
                  className="tech-stack__group-title"
                  aria-pressed={selectedId === id}
                  onClick={() => selectNode(id, { scroll: true })}
                >
                  <span className="tech-stack__swatch" style={{ '--swatch': colorFor(id) }} aria-hidden="true" />
                  {plainName(nodeById.get(id).data.name)}
                </button>
                <NodeChips
                  node={nodeById.get(id)}
                  selectedId={selectedId}
                  onSelect={(childId) => selectNode(childId, { scroll: true })}
                />
              </section>
            ))}
          </div>
        )}

        <aside
          ref={detailRef}
          className="tech-stack__detail"
          style={{ '--accent': selectedColor }}
          aria-live="polite"
        >
          <p className="tech-stack__breadcrumb">{breadcrumb || t('techstack.overview')}</p>
          <h4 className="tech-stack__name">{selected.depth ? plainName(selected.data.name) : t('techstack.title')}</h4>
          {years !== null && (
            <div className="tech-stack__experience">
              <div className="tech-stack__experience-head">
                <span id={experienceLabelId}>{t('techstack.experience')}</span>
                <span>{formatYears(years)}</span>
              </div>
              <ExperienceBar years={years} labelledBy={experienceLabelId} />
            </div>
          )}
          <div
            className="tech-stack__content"
            dangerouslySetInnerHTML={{ __html: selected.data.content || t('techstack.noDescription') }}
          />
          {selectedProjects.length > 0 && (
            <div className="tech-stack__projects">
              <p className="tech-stack__projects-label">{t('techstack.projects')}</p>
              <ul className="chip-list">
                {selectedProjects.map(([id, name]) => (
                  <li key={id} className="chip">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// Listenansicht: alle Einträge als Chips, Unterpunkte gruppiert unter ihrem Elternknoten
function NodeChips({ node, selectedId, onSelect }) {
  const parents = node.children.filter((child) => child.children)

  return (
    <>
      <ul className="chip-list">
        {node.children.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              className="chip tech-stack__chip"
              aria-pressed={selectedId === child.id}
              onClick={() => onSelect(child.id)}
            >
              {plainName(child.data.name)}
            </button>
          </li>
        ))}
      </ul>
      {parents.map((parent) => (
        <div key={parent.id} className="tech-stack__sub">
          <p className="tech-stack__sub-label">{plainName(parent.data.name)}</p>
          <NodeChips node={parent} selectedId={selectedId} onSelect={onSelect} />
        </div>
      ))}
    </>
  )
}
