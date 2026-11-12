import { useCallback, useEffect, useRef } from 'react'

// Optionaler Bot-Schutz mit Cloudflare Turnstile. Aktiv nur, wenn VITE_TURNSTILE_SITE_KEY gesetzt ist
// und das Backend einen Secret Key hat. Das Skript wird erst geladen, wenn der Chat geöffnet wird.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TOKEN_TIMEOUT_MS = 15000

let scriptPromise

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => {
      scriptPromise = undefined
      reject(new Error('Turnstile konnte nicht geladen werden.'))
    }
    document.head.append(script)
  })
  return scriptPromise
}

export default function useTurnstile(active, containerRef) {
  const widgetId = useRef(null)
  const token = useRef(null)
  const waiting = useRef([])

  useEffect(() => {
    if (!active || !SITE_KEY || !containerRef.current) return undefined
    let cancelled = false
    loadScript()
      .then((turnstile) => {
        if (cancelled || widgetId.current !== null) return
        widgetId.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          callback: (value) => {
            token.current = value
            waiting.current.splice(0).forEach((resolve) => resolve(value))
          },
          'expired-callback': () => {
            token.current = null
          },
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (widgetId.current !== null) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
      token.current = null
    }
  }, [active, containerRef])

  // Wartet auf ein gültiges Token (jedes Token gilt nur für eine Anfrage)
  const getToken = useCallback(() => {
    if (!SITE_KEY) return Promise.resolve(null)
    if (token.current) return Promise.resolve(token.current)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('turnstile-timeout')), TOKEN_TIMEOUT_MS)
      waiting.current.push((value) => {
        clearTimeout(timer)
        resolve(value)
      })
    })
  }, [])

  const reset = useCallback(() => {
    token.current = null
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current)
  }, [])

  return { getToken, reset }
}
