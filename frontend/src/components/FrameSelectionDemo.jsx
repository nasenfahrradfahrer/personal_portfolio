import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { datasets, K_MAX, randomGflops } from '../data/frameSelection'
import { fixed } from '../utils/format'
import { DemoTabs, ResultPanel } from './DemoParts'
import FrameGlyph from './FrameGlyph'
import Icon from './Icon'
import './FrameSelectionDemo.css'

// Interaktive Demo zur Masterarbeit: Datensatz, Störungen und K wählen. Oben eine schematische
// Bildserie, in der die K Bilder mit dem höchsten Sampler-Score markiert sind, darunter die
// echten Ergebnisse aus der Arbeit (Daten und Quellen in src/data/frameSelection.js, Texte in
// src/locales/<sprache>/demos.js unter frameSelection).

const SETTINGS = ['dirty', 'clean']

// Kachelbreite: mindestens TILE_MIN, höchstens TILE_MAX px. Die Spaltenzahl verteilt die Bilder
// gleichmäßig auf möglichst wenige Zeilen.
const TILE_MIN = 52
const TILE_MAX = 104
const TILE_GAP = 8

const fmt1 = fixed(1)
const fmt2 = fixed(2)
const fmt0 = fixed(0)

// Vorzeichen mit echtem Minuszeichen; Rundung vorher, damit −0,0 als ±0,0 erscheint
function signed(value, format) {
  const text = format(Math.abs(value))
  if (text === format(0)) return `±${text}`
  return `${value > 0 ? '+' : '−'}${text}`
}

// Bilder der Serie für die gewählte Einstellung: ohne Störungen fehlen Fremdbilder, und jedes
// Bild ist im Originalzustand. Der Score eines ungestörten Bildes ist in beiden Fällen gleich,
// weil der Sampler jedes Bild für sich bewertet.
function buildSeries(dataset, setting) {
  const frames = dataset.series
    .map((frame, id) => ({ ...frame, id }))
    .filter((frame) => setting === 'dirty' || !frame.ood)
    .map((frame) => {
      const dirty = setting === 'dirty' ? frame.dirty : null
      return {
        ...frame,
        state: frame.ood ? 'ood' : (dirty?.state ?? 'clean'),
        score: dirty?.score ?? frame.score,
        box: dirty?.box,
      }
    })

  const ranking = [...frames].sort((a, b) => b.score - a.score || a.id - b.id)
  const rankById = new Map(ranking.map((frame, i) => [frame.id, i + 1]))
  return frames.map((frame) => ({ ...frame, rank: rankById.get(frame.id) }))
}

function useColumns(ref, count) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const available = Math.floor(entry.contentRect.width)
      if (available > 0) setWidth(available)
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  if (!width) return Math.min(count, 4)
  const maxColumns = Math.max(1, Math.floor((width + TILE_GAP) / (TILE_MIN + TILE_GAP)))
  const rows = Math.ceil(count / maxColumns)
  return Math.ceil(count / rows)
}

export default function FrameSelectionDemo() {
  const { t } = useTranslation('demos', { keyPrefix: 'frameSelection' })
  const { t: tDemos } = useTranslation('demos')
  const [datasetId, setDatasetId] = useState(datasets[0].id)
  const [setting, setSetting] = useState('dirty')
  const [chosenK, setK] = useState(2)
  const framesRef = useRef(null)
  const kId = useId()

  const dataset = datasets.find((d) => d.id === datasetId)
  const text = t(`datasets.${dataset.id}`, { returnObjects: true })
  const percent = (value) => tDemos('percent', { value })
  // Gewähltes K bleibt beim Wechsel erhalten, wird aber auf das Maximum des Datensatzes begrenzt
  const kMax = dataset.kMax ?? K_MAX
  const k = Math.min(chosenK, kMax)
  const series = useMemo(() => buildSeries(dataset, setting), [dataset, setting])
  // Spalten nach der längsten Variante (mit Fremdbildern), damit beim Umschalten nichts springt
  const columns = useColumns(framesRef, dataset.series.length)

  const results = dataset.results[setting]
  const [topAcc, topSd] = results.topK[k - 1]
  const [randomAcc, randomSd] = results.random[k - 1]
  const [allAcc, allSd] = results.all
  const accDelta = Math.round((topAcc - allAcc) * 10) / 10

  const topFlops = dataset.gflops.topK[k - 1]
  const allFlops = dataset.gflops.all
  const flopDelta = Math.round(((topFlops - allFlops) / allFlops) * 100)
  const flopMax = Math.max(allFlops, dataset.gflops.topK[kMax - 1], randomGflops[kMax - 1])

  const randomLabel = t('random', { count: k })
  const topLabel = t('topK', { k })

  const n = series.length
  const caption = [
    dataset.excerpt ? t('captionExcerpt', { length: fmt1(dataset.length) }) : null,
    k >= n ? t('captionAll', { k, n }) : t('captionSelected', { count: k, n }),
  ]
    .filter(Boolean)
    .join(' ')

  const summary = t('summary', {
    dataset: text.name,
    setting: t(`settingsInline.${setting}`),
    k,
    top: fmt1(topAcc),
    all: fmt1(allAcc),
    compute: signed(flopDelta, fmt0),
  })

  return (
    <div className="demo-box frame-demo">
      <div className="frame-demo__controls">
        <DemoTabs
          label={t('datasetLabel')}
          options={datasets.map((d) => ({ id: d.id, label: t(`datasets.${d.id}.name`) }))}
          value={datasetId}
          onChange={setDatasetId}
        />
        <div className="frame-demo__setting" role="group" aria-label={t('testDataLabel')}>
          {SETTINGS.map((id) => (
            <button key={id} type="button" aria-pressed={id === setting} onClick={() => setSetting(id)}>
              {t(`settings.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="frame-demo__about">
        <strong>{dataset.source}</strong> · {text.about}
      </p>

      <div ref={framesRef}>
        <ol
          className="frame-demo__frames"
          style={{
            '--tint': `var(--c-${dataset.tint})`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            maxWidth: columns * (TILE_MAX + TILE_GAP),
          }}
          aria-label={t('seriesLabel')}
        >
          {series.map((frame, i) => {
            const selected = frame.rank <= k
            const label =
              frame.state === 'clean' ? frame.note && t(`notes.${frame.note}`) : t(`states.${frame.state}`)
            return (
              <li key={`${dataset.id}-${frame.id}`} className={`frame${selected ? ' is-selected' : ''}`}>
                <span className="demo-sr-only">
                  {t('frameStatus', {
                    frame: label ? t('frameLabeled', { number: i + 1, label }) : t('frame', { number: i + 1 }),
                    score: fmt2(frame.score),
                    status: selected ? t('selectedAs', { rank: frame.rank }) : t('notSelected'),
                  })}
                </span>
                <div
                  aria-hidden="true"
                  className={`frame__img frame__img--${frame.state}${frame.scan ? ' frame__img--scan' : ''}`}
                >
                  <FrameGlyph name={frame.glyph} pose={frame.pose} scene={dataset.scene && !frame.ood} />
                  {frame.state === 'noise' && <span className="frame__noise" />}
                  {frame.box && (
                    <span
                      className="frame__box"
                      style={{
                        left: `${frame.box[0]}%`,
                        top: `${frame.box[1]}%`,
                        width: `${frame.box[2]}%`,
                        height: `${frame.box[3]}%`,
                      }}
                    />
                  )}
                  {selected && <span className="frame__rank">{frame.rank}</span>}
                </div>
                <span className="frame__meter" aria-hidden="true">
                  <span style={{ width: `${frame.score * 100}%` }} />
                </span>
                <span className="frame__score" aria-hidden="true">
                  {fmt2(frame.score)}
                </span>
                <span className="frame__state" aria-hidden="true">
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="frame-demo__caption">{caption}</p>
      </div>

      <div className="frame-demo__k">
        <div className="frame-demo__k-head">
          <label htmlFor={kId}>{t('kLabel')}</label>
          <output htmlFor={kId} className="frame-demo__k-value">
            {k}
          </output>
        </div>
        <input
          id={kId}
          className="demo-range"
          type="range"
          min="1"
          max={kMax}
          step="1"
          value={k}
          style={{ '--fill': `${((k - 1) / (kMax - 1)) * 100}%` }}
          onChange={(event) => setK(Number(event.target.value))}
        />
        <div className="frame-demo__ticks" aria-hidden="true">
          {Array.from({ length: kMax }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      </div>

      <div className="frame-demo__results">
        <ResultPanel
          title={tDemos('accuracy')}
          subtitle={t('balancedAccuracy')}
          delta={tDemos('points', { value: signed(accDelta, fmt1) })}
          deltaNote={t('vsAll')}
          max={100}
          rows={[
            { label: topLabel, value: topAcc, sd: topSd, emphasis: true },
            { label: randomLabel, value: randomAcc, sd: randomSd },
            { label: t('all'), value: allAcc, sd: allSd },
          ]}
          format={(value) => percent(fmt1(value))}
          tooltip={(row) => t('accuracyTooltip', { value: fmt1(row.value), sd: fmt1(row.sd) })}
        />
        <ResultPanel
          title={t('compute')}
          subtitle={t('gflopsPerSeries')}
          delta={percent(signed(flopDelta, fmt0))}
          deltaNote={t('vsAll')}
          max={flopMax}
          rows={[
            { label: topLabel, value: topFlops, emphasis: true },
            { label: randomLabel, value: randomGflops[k - 1] },
            { label: t('all'), value: allFlops },
          ]}
          format={(value) => fmt1(value)}
          tooltip={(row) => t('gflops', { value: fmt2(row.value) })}
        />
      </div>

      <p className="frame-demo__insight">
        <Icon name="sparkle" size={16} />
        <span>{text.insight}</span>
      </p>

      <p className="demo-note">{t('note')}</p>

      <p className="demo-sr-only" aria-live="polite">
        {summary}
      </p>
    </div>
  )
}
