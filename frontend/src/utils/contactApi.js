import i18n from '../i18n'
import { API_BASE } from './chatApi'

// Kontaktformular: Das Backend leitet die Nachricht per E-Mail weiter und speichert nichts.
export class ContactError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export async function sendContactMessage({ name, email, message, turnstileToken, honeypot, lang }) {
  let response
  try {
    response = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
      body: JSON.stringify({
        name,
        email,
        message,
        lang,
        turnstile_token: turnstileToken ?? null,
        website: honeypot ?? '',
      }),
    })
  } catch {
    throw new ContactError(i18n.t('contactForm.errors.network'), 'network')
  }
  if (response.ok) return

  let detail = i18n.t('contactForm.errors.generic')
  let code = 'http'
  try {
    const body = await response.json()
    detail = body.detail ?? detail
    code = body.code ?? code
  } catch {
    // keine JSON-Antwort, z. B. vom Proxy
  }
  throw new ContactError(detail, code)
}
