import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as base from '../data/content'
import { DEFAULT_LANGUAGE } from '.'

// Führt die Struktur aus src/data/content.js mit den Texten der aktuellen Sprache
// (src/locales/<sprache>/content.js) zusammen. Ergebnis hat dieselbe Form, die die Komponenten
// erwarten, z. B. project.details.flow.steps[i] = { icon, title, text }.

const TEXT_GROUPS = ['profile', 'chat', 'sections', 'experience', 'projects', 'contact']
const interpolation = { name: base.profile.name, firstName: base.profile.name.split(' ')[0] }

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// Ergänzt fehlende Texte der aktuellen Sprache aus der Standardsprache. Listen gelten als Ganzes.
function withFallback(local, fallback) {
  if (!isObject(local) || !isObject(fallback)) return local ?? fallback
  const merged = { ...fallback }
  for (const [key, value] of Object.entries(local)) merged[key] = withFallback(value, fallback[key])
  return merged
}

function textGroup(t, key) {
  const options = { returnObjects: true, ...interpolation }
  const merged = withFallback(t(key, options), t(key, { ...options, lng: DEFAULT_LANGUAGE }))
  return isObject(merged) ? merged : {}
}

function buildDetails({ flowIcons = [], demo, chatDemo }, texts) {
  const { demoTitle, flow, ...rest } = texts
  return {
    ...rest,
    chatDemo,
    demo: demo ? { type: demo, title: demoTitle } : undefined,
    flow: flow && { ...flow, steps: (flow.steps ?? []).map((step, i) => ({ ...step, icon: flowIcons[i] })) },
  }
}

// Videofassung der aktuellen Sprache; ohne eigene Datei läuft die der Standardsprache
function videoFor(video, lang) {
  if (!video?.enabled) return null
  const own = video.sources[lang]
  const source = own?.src ? own : (video.sources[DEFAULT_LANGUAGE] ?? own)
  return { aspectRatio: video.aspectRatio, ...source }
}

function buildContent(t, lang) {
  const texts = Object.fromEntries(TEXT_GROUPS.map((key) => [key, textGroup(t, key)]))
  const { facts } = base.profile

  const profile = {
    ...base.profile,
    ...texts.profile,
    video: videoFor(base.profile.video, lang),
    cv: base.profile.cv?.[lang] ?? base.profile.cv?.[DEFAULT_LANGUAGE] ?? null,
    facts: facts.map((fact) => ({ ...fact, label: texts.profile.facts?.[fact.id] ?? fact.id })),
  }

  const projects = base.projects.map((project) => {
    const { details: detailTexts, ...projectTexts } = texts.projects[project.id] ?? {}
    return {
      ...project,
      ...projectTexts,
      details: project.details && buildDetails(project.details, detailTexts ?? {}),
    }
  })

  return {
    profile,
    chat: { ...base.chat, suggestions: [], ...texts.chat },
    sections: base.sections.map((section) => ({ ...section, ...texts.sections[section.id] })),
    experience: base.experience.map((item) => ({ tags: [], ...item, ...texts.experience[item.id] })),
    languages: base.languages,
    projects,
    contact: texts.contact,
  }
}

export default function useContent() {
  const { t, i18n } = useTranslation('content')
  const lang = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE
  return useMemo(() => buildContent(t, lang), [t, lang])
}
