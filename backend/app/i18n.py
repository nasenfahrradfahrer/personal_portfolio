"""Sprache der Meldungen an Besucher (Fehler, feste Antworten).

Das Frontend schickt die Sprache der Webseite als `lang` im Anfrage-Inhalt und zusätzlich im
Header Accept-Language. Der Header gilt, bis der Inhalt gelesen ist (z. B. beim Rate-Limit),
danach `lang`. Unbekannte Sprachen fallen auf DEFAULT_LANGUAGE zurück.

Neue Sprache: Eintrag in MESSAGES (alle Schlüssel wie bei "de") und in SITE_LANGUAGE_NOTES.
"""

from __future__ import annotations

DEFAULT_LANGUAGE = "de"

MESSAGES: dict[str, dict[str, str]] = {
    "de": {
        # Anfrage abgelehnt
        "content_type": "Anfrage muss JSON sein.",
        "too_large": "Anfrage zu groß.",
        "rate_limited": "Du hast gerade viele Fragen gestellt. Bitte warte einen Moment.",
        "invalid": "Ungültige Anfrage.",
        "rejected": "Anfrage abgelehnt.",
        "history": "Die Unterhaltung konnte nicht fortgesetzt werden. Bitte starte sie neu.",
        "bot_check": "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte lade die Seite neu.",
        "not_ready": "Der Assistent ist gerade nicht verfügbar.",
        "budget": "Der Assistent macht für heute Pause. Morgen geht es weiter.",
        "busy": "Der Assistent ist gerade ausgelastet. Bitte versuch es gleich noch einmal.",
        "internal": "Da ist etwas schiefgelaufen. Bitte versuch es erneut.",
        # Prüfung des Gesprächsverlaufs
        "invalid_order": "Ungültiger Gesprächsverlauf.",
        "last_not_question": "Die letzte Nachricht muss eine Frage sein.",
        "too_many_turns": "Das Gespräch ist zu lang (maximal {max_turns} Fragen). Bitte starte eine neue Unterhaltung.",
        "empty_message": "Leere Nachricht.",
        "message_too_long": "Die Nachricht ist zu lang (maximal {max_chars} Zeichen).",
        # Kontaktformular
        "invalid_email": "Bitte gib eine gültige E-Mail-Adresse an.",
        "contact_rate_limited": "Du hast gerade mehrere Nachrichten geschickt. Bitte versuch es später erneut.",
        "contact_unavailable": "Das Kontaktformular ist gerade nicht verfügbar. Bitte schreib mir direkt per E-Mail.",
        # Tech-Stack der Webseite
        "techstack_unavailable": "Der Tech-Stack ist gerade nicht verfügbar.",
        "contact_failed": (
            "Die Nachricht konnte nicht verschickt werden. Bitte versuch es später erneut oder schreib mir direkt "
            "per E-Mail."
        ),
        # Fehler des Sprachmodells (Code aus LLMError)
        "llm_config": "Der Assistent ist gerade nicht verfügbar.",
        "llm_bad_request": "Diese Anfrage konnte nicht verarbeitet werden.",
        "llm_busy": "Der Assistent ist gerade stark ausgelastet. Bitte versuch es gleich noch einmal.",
        "llm_unavailable": "Der Assistent ist gerade nicht erreichbar. Bitte versuch es später erneut.",
        # Feste Antworten
        "refusal": (
            "Diese Frage kann ich leider nicht beantworten. Gern erzähle ich dir etwas über Qualifikationen, "
            "Projekte oder Erfahrung."
        ),
        "empty": "Dazu kann ich gerade nichts sagen. Versuch es gern mit einer anderen Formulierung.",
        "truncated": "\n\n(Die Antwort wurde gekürzt.)",
    },
    "en": {
        "content_type": "Request must be JSON.",
        "too_large": "Request too large.",
        "rate_limited": "You have asked a lot of questions just now. Please wait a moment.",
        "invalid": "Invalid request.",
        "rejected": "Request rejected.",
        "history": "The conversation could not be continued. Please start a new one.",
        "bot_check": "The security check failed. Please reload the page.",
        "not_ready": "The assistant is currently unavailable.",
        "budget": "The assistant is taking a break for today. It will be back tomorrow.",
        "busy": "The assistant is busy right now. Please try again in a moment.",
        "internal": "Something went wrong. Please try again.",
        "invalid_order": "Invalid conversation history.",
        "last_not_question": "The last message must be a question.",
        "too_many_turns": "The conversation is too long (at most {max_turns} questions). Please start a new one.",
        "empty_message": "Empty message.",
        "message_too_long": "The message is too long (at most {max_chars} characters).",
        "invalid_email": "Please enter a valid email address.",
        "contact_rate_limited": "You have sent several messages just now. Please try again later.",
        "contact_unavailable": "The contact form is currently unavailable. Please email me directly.",
        # Tech stack of the website
        "techstack_unavailable": "The tech stack is currently unavailable.",
        "contact_failed": "The message could not be sent. Please try again later or email me directly.",
        "llm_config": "The assistant is currently unavailable.",
        "llm_bad_request": "This request could not be processed.",
        "llm_busy": "The assistant is very busy right now. Please try again in a moment.",
        "llm_unavailable": "The assistant cannot be reached right now. Please try again later.",
        "refusal": (
            "Unfortunately, I can't answer this question. I'm happy to tell you about qualifications, "
            "projects or experience."
        ),
        "empty": "I can't say anything about that right now. Feel free to try rephrasing your question.",
        "truncated": "\n\n(The answer was shortened.)",
    },
}

SUPPORTED_LANGUAGES = tuple(MESSAGES)

# Hinweis an das Modell bei der aktuellen Frage (nicht im Systemprompt, damit der Prompt-Cache
# für alle Sprachen derselbe bleibt). Auf Deutsch wie der Systemprompt.
SITE_LANGUAGE_NOTES: dict[str, str] = {
    "de": "Hinweis der Webseite (nicht vom Besucher): Die Seite wird auf Deutsch angezeigt.",
    "en": "Hinweis der Webseite (nicht vom Besucher): Die Seite wird auf Englisch angezeigt.",
}


def normalize_language(value: str | None) -> str | None:
    """'en-US' -> 'en'. Gibt None zurück, wenn die Sprache nicht unterstützt wird."""
    if not value:
        return None
    code = value.strip().lower().replace("_", "-").split("-")[0]
    return code if code in MESSAGES else None


def language_from_header(header: str | None) -> str | None:
    """Beste unterstützte Sprache aus Accept-Language (z. B. 'en-US,en;q=0.9,de;q=0.8')."""
    best, best_quality = None, 0.0
    for part in (header or "").split(","):
        tag, _, params = part.partition(";")
        quality = 1.0
        params = params.strip()
        if params.startswith("q="):
            try:
                quality = float(params[2:])
            except ValueError:
                quality = 0.0
        language = normalize_language(tag)
        if language and quality > best_quality:
            best, best_quality = language, quality
    return best


def resolve_language(requested: str | None = None, accept_language: str | None = None) -> str:
    return normalize_language(requested) or language_from_header(accept_language) or DEFAULT_LANGUAGE


def message(language: str, key: str, **values: object) -> str:
    """Meldung in der gewünschten Sprache, sonst in der Standardsprache."""
    catalog = MESSAGES.get(language, MESSAGES[DEFAULT_LANGUAGE])
    text = catalog.get(key) or MESSAGES[DEFAULT_LANGUAGE][key]
    return text.format(**values) if values else text
