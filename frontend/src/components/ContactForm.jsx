import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import useTurnstile from '../hooks/useTurnstile'
import { ContactError, sendContactMessage } from '../utils/contactApi'
import { PAGES } from '../utils/routes'
import './ContactForm.css'

// Grenzen wie im Backend (app/schemas.py, ContactRequest)
const MAX = { name: 100, email: 254, message: 5000 }
const EMPTY = { name: '', email: '', message: '' }

// Kontaktformular (zweiter Kontaktweg neben der E-Mail im Impressum).
export default function ContactForm() {
  const { t, i18n } = useTranslation()
  const [values, setValues] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const [engaged, setEngaged] = useState(false)
  const honeypotRef = useRef(null)
  const turnstileRef = useRef(null)
  // Turnstile lädt erst, wenn jemand das Formular benutzt: Das Impressum selbst bleibt ohne Cloudflare erreichbar
  const turnstile = useTurnstile(engaged, turnstileRef)

  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      const turnstileToken = await turnstile.getToken()
      await sendContactMessage({
        ...values,
        turnstileToken,
        honeypot: honeypotRef.current?.value ?? '',
        lang: i18n.resolvedLanguage,
      })
      setValues(EMPTY)
      setStatus('sent')
    } catch (failure) {
      setError(
        failure instanceof ContactError
          ? failure.message
          : failure.message === 'turnstile-timeout'
            ? t('contactForm.errors.turnstile')
            : t('contactForm.errors.generic'),
      )
      setStatus('error')
    } finally {
      turnstile.reset()
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} onFocus={() => setEngaged(true)} lang={i18n.resolvedLanguage}>
      {/* Honeypot gegen einfache Bots: ausgeblendet (display: none) und mit nichtssagendem Namen, damit
          Browser und Passwort-Manager es beim automatischen Ausfüllen nicht mitbefüllen. */}
      <input
        ref={honeypotRef}
        className="contact-form__honeypot"
        type="text"
        name="cf_extra"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
      />

      <div className="contact-form__row">
        <label className="contact-form__field">
          <span>{t('contactForm.name')}</span>
          <input type="text" name="name" autoComplete="name" maxLength={MAX.name} value={values.name} onChange={update('name')} />
        </label>
        <label className="contact-form__field">
          <span>{t('contactForm.email')}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={MAX.email}
            value={values.email}
            onChange={update('email')}
          />
        </label>
      </div>

      <label className="contact-form__field">
        <span>{t('contactForm.message')}</span>
        <textarea name="message" rows={6} required maxLength={MAX.message} value={values.message} onChange={update('message')} />
      </label>

      <p className="contact-form__privacy">
        <Trans i18nKey="contactForm.privacy" components={{ privacy: <a href={PAGES.privacy} /> }} />
      </p>

      <div ref={turnstileRef} className="contact-form__turnstile" />

      <div className="contact-form__actions">
        <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
          {status === 'sending' ? t('contactForm.sending') : t('contactForm.send')}
        </button>
        <p className={`contact-form__status${status === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {status === 'sent' && t('contactForm.sent')}
          {status === 'error' && error}
        </p>
      </div>
    </form>
  )
}
