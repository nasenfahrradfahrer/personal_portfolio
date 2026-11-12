import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import useTurnstile from '../hooks/useTurnstile'
import useContent from '../i18n/useContent'
import { ChatError, fetchChatConfig, sendFeedback, streamChat } from '../utils/chatApi'
import { OPEN_CHAT_EVENT } from '../utils/chatEvents'
import { PAGES } from '../utils/routes'
import Icon from './Icon'
import './ChatWidget.css'

const DEFAULT_CONFIG = { ready: true, maxMessageChars: 1000, maxTurns: 10, turnstile: false }
const SEPARATOR = ' › '
let lastId = 0
const nextId = () => ++lastId

// Lange Quellenpfade kürzen: "Tech-Stack › AI & Data Science › LayerCAM" -> "Tech-Stack › LayerCAM"
const shortTitle = (title) => {
  const parts = title.split(SEPARATOR)
  return parts.length > 2 ? `${parts[0]}${SEPARATOR}${parts.at(-1)}` : title
}

// Einfaches, sicheres Markdown: Absätze, Zeilen mit "- " als Liste, **fett**
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

function FormattedText({ text }) {
  const blocks = []
  let paragraph = []
  let list = []
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', lines: paragraph })
    paragraph = []
  }
  const flushList = () => {
    if (list.length) blocks.push({ type: 'ul', lines: list })
    list = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const item = line.match(/^\s*[-•*]\s+(.*)$/)
    if (!line.trim()) {
      flushParagraph()
      flushList()
    } else if (item) {
      flushParagraph()
      list.push(item[1])
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return blocks.map((block, i) =>
    block.type === 'ul' ? (
      <ul key={i}>
        {block.lines.map((line, j) => (
          <li key={j}>{inline(line)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>
        {block.lines.map((line, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(line)}
          </Fragment>
        ))}
      </p>
    ),
  )
}

// Daumen hoch/runter unter einer Antwort; erneutes Klicken ändert die Bewertung
function Rating({ message, onRate }) {
  const { t } = useTranslation()
  return (
    <div className="chat-rating" role="group" aria-label={t('chat.rateLabel')}>
      {[
        ['up', 'thumbsUp', t('chat.rateUp')],
        ['down', 'thumbsDown', t('chat.rateDown')],
      ].map(([rating, icon, label]) => (
        <button
          key={rating}
          type="button"
          className={`chat-rating__btn chat-rating__btn--${rating}`}
          aria-pressed={message.rating === rating}
          aria-label={label}
          title={label}
          onClick={() => onRate(message, rating)}
        >
          <Icon name={icon} size={14} />
        </button>
      ))}
    </div>
  )
}

function Message({ message, onRetry, onReset, onRate }) {
  const { t } = useTranslation()
  if (message.role === 'user') {
    return <div className="chat-msg chat-msg--user">{message.content}</div>
  }
  const { content, status, sources, error, code } = message
  return (
    <div className={`chat-msg chat-msg--assistant${status === 'error' ? ' chat-msg--error' : ''}`} aria-busy={status === 'streaming'}>
      {content ? (
        <FormattedText text={content} />
      ) : (
        status === 'streaming' && (
          <span className="chat-typing" aria-label={t('chat.typing')}>
            <span />
            <span />
            <span />
          </span>
        )
      )}
      {status === 'error' && (
        <div className="chat-msg__error">
          <p>{error}</p>
          {code === 'history' ? (
            <button type="button" onClick={onReset}>
              {t('chat.restart')}
            </button>
          ) : (
            <button type="button" onClick={() => onRetry(message)}>
              {t('chat.retry')}
            </button>
          )}
        </div>
      )}
      {status === 'done' && sources?.length > 0 && (
        <div className="chat-sources">
          <span>{t('chat.sources')}</span>
          {sources.map((source) => (
            <span key={source.title} className="chat-source" title={source.title}>
              {shortTitle(source.title)}
            </span>
          ))}
        </div>
      )}
      {status === 'done' && message.feedback && <Rating message={message} onRate={onRate} />}
    </div>
  )
}

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const { chat, profile } = useContent()
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  // Bestätigter Verlauf (vom Server signiert) – nur er wird bei der nächsten Frage mitgeschickt
  const transcript = useRef([])
  const historyToken = useRef(null)
  const abortRef = useRef(null)
  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const honeypotRef = useRef(null)
  const turnstileRef = useRef(null)
  const stickToBottom = useRef(true)
  const wasOpen = useRef(false)

  const limits = config ?? DEFAULT_CONFIG
  const unavailable = config !== null && !config.ready
  const maxReached = turns >= limits.maxTurns
  const turnstile = useTurnstile(open && limits.turnstile, turnstileRef)

  useEffect(() => {
    if (!open || config) return undefined
    const controller = new AbortController()
    fetchChatConfig(controller.signal)
      .then(setConfig)
      .catch((error) => {
        if (error.name !== 'AbortError') setConfig({ ...DEFAULT_CONFIG, ready: false })
      })
    return () => controller.abort()
  }, [open, config])

  // Öffnen von außen (openChat in utils/chatEvents.js); ist der Chat schon offen, nur fokussieren
  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      inputRef.current?.focus()
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  // Fokus: beim Öffnen ins Eingabefeld, beim Schließen zurück auf den Button
  useEffect(() => {
    if (open) inputRef.current?.focus()
    else if (wasOpen.current) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Mitscrollen, solange man unten ist
  useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages])

  // Eingabefeld wächst mit (bis 8rem)
  useEffect(() => {
    const field = inputRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`
  }, [input, open])

  const patch = (id, changes) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...changes } : m)))

  const send = useCallback(
    async (text) => {
      const question = text.trim()
      if (!question || busy) return
      const botId = nextId()
      setMessages((list) => [
        ...list,
        { id: nextId(), role: 'user', content: question },
        { id: botId, role: 'assistant', content: '', status: 'streaming', sources: [] },
      ])
      setInput('')
      setBusy(true)
      stickToBottom.current = true

      const history = [...transcript.current, { role: 'user', content: question }]
      const controller = new AbortController()
      abortRef.current = controller
      let answer = ''
      let completed = false
      try {
        const turnstileToken = limits.turnstile ? await turnstile.getToken() : null
        await streamChat({
          messages: history,
          historyToken: historyToken.current,
          turnstileToken,
          honeypot: honeypotRef.current?.value ?? '',
          lang: i18n.resolvedLanguage,
          signal: controller.signal,
          onEvent: ({ name, data }) => {
            if (name === 'delta') {
              answer += data.text
              patch(botId, { content: answer })
            } else if (name === 'replace') {
              answer = data.text
              patch(botId, { content: answer })
            } else if (name === 'sources') {
              patch(botId, { sources: data.sources })
            } else if (name === 'done') {
              completed = true
              transcript.current = [...history, { role: 'assistant', content: answer }]
              historyToken.current = data.history_token
              setTurns(transcript.current.filter((m) => m.role === 'user').length)
              patch(botId, { status: 'done', feedback: data.feedback ?? null })
              setAnnouncement(answer)
            } else if (name === 'error') {
              throw new ChatError(data.message, data.code)
            }
          },
        })
        if (!completed) throw new ChatError(t('chat.errors.incomplete'), 'incomplete')
      } catch (error) {
        if (error.name === 'AbortError') return
        const message =
          error instanceof ChatError
            ? error.message
            : error.message === 'turnstile-timeout'
              ? t('chat.errors.turnstile')
              : t('chat.errors.generic')
        patch(botId, { status: 'error', error: message, code: error.code, question })
        setAnnouncement(message)
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setBusy(false)
        }
        if (limits.turnstile) turnstile.reset()
      }
    },
    [busy, limits.turnstile, turnstile, t, i18n],
  )

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    transcript.current = []
    historyToken.current = null
    setTurns(0)
    setMessages([])
    setBusy(false)
    setInput('')
    inputRef.current?.focus()
  }

  // Bewertung sofort anzeigen; schlägt das Senden fehl, wieder zurücknehmen
  const rate = (target, rating) => {
    if (target.rating === rating) return
    patch(target.id, { rating })
    setAnnouncement(t('chat.rated'))
    sendFeedback({ ...target.feedback, rating, lang: i18n.resolvedLanguage }).catch(() =>
      patch(target.id, { rating: target.rating }),
    )
  }

  // Fehlgeschlagene Frage samt Antwort entfernen und neu senden
  const retry = (failed) => {
    setMessages((list) => {
      const index = list.findIndex((m) => m.id === failed.id)
      return list.filter((_, i) => i !== index && i !== index - 1)
    })
    send(failed.question)
  }

  const onScroll = () => {
    const list = listRef.current
    stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(input)
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="chat-launcher"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? 'close' : 'chat'} size={22} />
        <span className="chat-launcher__label">{open ? t('chat.close') : chat.launcherLabel}</span>
      </button>

      {open && (
        <section
          id="chat-panel"
          className="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-title"
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        >
          <header className="chat-panel__header">
            <span className="chat-panel__avatar" aria-hidden="true">
              <Icon name="sparkle" size={18} />
            </span>
            <div className="chat-panel__heading">
              <h2 id="chat-title">{chat.title}</h2>
              <p>
                <span className={`chat-status${unavailable ? ' is-off' : ''}`} aria-hidden="true" />
                {unavailable ? t('chat.statusUnavailable') : t('chat.subtitle', { name: profile.name })}
              </p>
            </div>
            <button
              type="button"
              className="chat-icon-btn"
              onClick={reset}
              disabled={!messages.length}
              aria-label={t('chat.newConversation')}
              title={t('chat.newConversation')}
            >
              <Icon name="refresh" size={18} />
            </button>
            <button type="button" className="chat-icon-btn" onClick={() => setOpen(false)} aria-label={t('chat.close')}>
              <Icon name="close" size={18} />
            </button>
          </header>

          <p className="chat-panel__notice">
            {chat.notice}{' '}
            {/* Neuer Tab, damit das Gespräch erhalten bleibt */}
            <a href={PAGES.privacy} target="_blank" rel="noreferrer">
              {t('chat.privacy')}
            </a>
          </p>

          <div className="chat-messages" ref={listRef} onScroll={onScroll}>
            <div className="chat-msg chat-msg--assistant">
              <p>{chat.greeting}</p>
            </div>
            {unavailable && (
              <p className="chat-hint">
                <Trans i18nKey="chat.unavailableHint" components={{ contact: <a href="#kontakt" /> }} />
              </p>
            )}
            {!messages.length && !unavailable && (
              <div className="chat-suggestions" role="group" aria-label={t('chat.suggestions')}>
                {chat.suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className="chat-suggestion" onClick={() => send(suggestion)} disabled={busy}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <Message key={message.id} message={message} onRetry={retry} onReset={reset} onRate={rate} />
            ))}
            {maxReached && (
              <p className="chat-hint">
                {t('chat.maxReached')}{' '}
                <button type="button" onClick={reset}>
                  {t('chat.startNew')}
                </button>
              </p>
            )}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault()
              send(input)
            }}
          >
            {/* Honeypot gegen einfache Bots: für Menschen unsichtbar und nicht per Tab erreichbar */}
            <input ref={honeypotRef} className="chat-honeypot" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <label htmlFor="chat-input" className="chat-sr-only">
              {t('chat.inputLabel')}
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={limits.maxMessageChars}
              placeholder={maxReached ? t('chat.placeholderMax') : t('chat.placeholder')}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={maxReached || unavailable}
            />
            <button
              type="submit"
              className="chat-send"
              disabled={busy || !input.trim() || maxReached || unavailable}
              aria-label={t('chat.send')}
            >
              <Icon name="arrowUp" size={20} />
            </button>
          </form>
          {input.length > limits.maxMessageChars * 0.8 && (
            <p className="chat-counter">{t('chat.counter', { length: input.length, max: limits.maxMessageChars })}</p>
          )}
          <div ref={turnstileRef} className="chat-turnstile" />
          <div className="chat-sr-only" role="status" aria-live="polite">
            {announcement}
          </div>
        </section>
      )}
    </>
  )
}
