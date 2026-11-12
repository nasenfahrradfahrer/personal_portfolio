import { API_BASE } from './chatApi'

// Tech-Stack für die Sunburst-Grafik. Die Daten liegen im privaten Repo und kommen vom Backend
// (GET /api/techstack): { projects, entries, texts: { <sprache>: { projects, entries } } }.
// Eine Anfrage pro Seitenaufruf; schlägt sie fehl, startet der nächste Aufruf eine neue.
let pending = null

export function fetchTechStack() {
  if (!pending) {
    pending = fetch(`${API_BASE}/techstack`)
      .then((response) => {
        if (!response.ok) throw new Error(`Tech-Stack: HTTP ${response.status}`)
        return response.json()
      })
      .catch((error) => {
        pending = null
        throw error
      })
  }
  return pending
}
