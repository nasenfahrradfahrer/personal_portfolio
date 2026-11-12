import i18n from '../i18n'

// Anbindung an das Chat-Backend (FastAPI). Antworten kommen als Server-Sent Events.
export const API_BASE = import.meta.env.VITE_CHAT_API_URL ?? '/api'

export class ChatError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export async function fetchChatConfig(signal) {
  const response = await fetch(`${API_BASE}/chat/config`, { signal })
  if (!response.ok) throw new ChatError(i18n.t('chat.errors.unavailable'), 'unavailable')
  return response.json()
}

// Bewertung einer Antwort. conversation, turn und token stammen aus dem done-Ereignis
// (nur vorhanden, wenn das Backend Gespräche speichert).
export async function sendFeedback({ conversation, turn, token, rating, lang }) {
  const response = await fetch(`${API_BASE}/chat/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
    body: JSON.stringify({ conversation, turn, token, rating }),
  })
  if (!response.ok) throw new ChatError(i18n.t('chat.errors.generic'), 'feedback')
}

function parseEvent(block) {
  let name = null
  const data = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (!name) return null
  try {
    return { name, data: JSON.parse(data.join('\n')) }
  } catch {
    return null
  }
}

// Schickt den Verlauf und ruft onEvent für jedes Ereignis auf (delta, replace, sources, done, error).
// lang: Sprache der Seite. Das Backend formuliert Fehlermeldungen und feste Antworten darin; der
// Header deckt Fehler ab, die schon vor dem Lesen des Inhalts entstehen (z. B. Rate-Limit).
export async function streamChat({ messages, historyToken, turnstileToken, honeypot, lang, signal, onEvent }) {
  let response
  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
      body: JSON.stringify({
        messages,
        lang,
        history_token: historyToken ?? null,
        turnstile_token: turnstileToken ?? null,
        website: honeypot ?? '',
      }),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ChatError(i18n.t('chat.errors.network'), 'network')
  }

  if (!response.ok) {
    let detail = i18n.t('chat.errors.generic')
    let code = 'http'
    try {
      const body = await response.json()
      detail = body.detail ?? detail
      code = body.code ?? code
    } catch {
      // keine JSON-Antwort, z. B. vom Proxy
    }
    throw new ChatError(detail, code)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const event = parseEvent(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      if (event) onEvent(event)
    }
  }
}
