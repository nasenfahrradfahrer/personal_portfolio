"""Eingabeprüfung für Chat-Anfragen und das Kontaktformular."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .i18n import DEFAULT_LANGUAGE, message

CONTACT_MAX_CHARS = 5000
# Bewusst einfach: genau ein @, keine Leerzeichen und keine Zeichen, die in Mail-Headern Sonderbedeutung haben
EMAIL_RE = re.compile(r'^[^@\s<>()\[\],;:"\\]+@[^@\s<>()\[\],;:"\\]+\.[^@\s<>()\[\],;:"\\]{2,}$')
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f​-‏‪-‮⁦-⁩]")


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12_000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessage] = Field(min_length=1, max_length=60)
    history_token: str | None = Field(default=None, max_length=128)
    turnstile_token: str | None = Field(default=None, max_length=4096)
    # Honeypot: im Formular unsichtbar. Menschen lassen es leer, einfache Bots füllen es aus.
    website: str = Field(default="", max_length=500)
    # Sprache der Webseite (z. B. "en"); unbekannte Werte fallen auf die Standardsprache zurück
    lang: str | None = Field(default=None, max_length=16)


class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(default="", max_length=100)
    email: str = Field(max_length=254)
    message: str = Field(max_length=CONTACT_MAX_CHARS)
    turnstile_token: str | None = Field(default=None, max_length=4096)
    website: str = Field(default="", max_length=500)
    lang: str | None = Field(default=None, max_length=16)


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation: str = Field(pattern=r"^[0-9a-f]{16}$")
    turn: int = Field(ge=1, le=100)
    rating: Literal["up", "down"]
    token: str = Field(max_length=128)


def clean_text(text: str) -> str:
    """Entfernt Steuer- und unsichtbare Richtungszeichen (beliebt, um Anweisungen zu verstecken)."""
    return CONTROL_CHARS_RE.sub("", text).strip()


def validate_conversation(
    messages: list[ChatMessage], max_message_chars: int, max_turns: int, language: str = DEFAULT_LANGUAGE
) -> str | None:
    """Prüft Reihenfolge und Längen. Gibt eine Fehlermeldung in `language` zurück oder None."""
    for index, item in enumerate(messages):
        expected = "user" if index % 2 == 0 else "assistant"
        if item.role != expected:
            return message(language, "invalid_order")
    if messages[-1].role != "user":
        return message(language, "last_not_question")
    user_messages = [m for m in messages if m.role == "user"]
    if len(user_messages) > max_turns:
        return message(language, "too_many_turns", max_turns=max_turns)
    for item in user_messages:
        if not clean_text(item.content):
            return message(language, "empty_message")
        if len(item.content) > max_message_chars:
            return message(language, "message_too_long", max_chars=max_message_chars)
    return None


def validate_contact(request: ContactRequest, language: str = DEFAULT_LANGUAGE) -> str | None:
    """Prüft E-Mail-Adresse und Nachricht. Gibt eine Fehlermeldung in `language` zurück oder None."""
    if not EMAIL_RE.match(request.email.strip()):
        return message(language, "invalid_email")
    if not clean_text(request.message):
        return message(language, "empty_message")
    return None
