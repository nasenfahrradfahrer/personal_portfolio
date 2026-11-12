"""Anbindung an Claude (Anthropic API) mit Streaming, Zitaten und Refusal-Fallbacks.

Der Rest des Backends sieht nur die Ereignisse TextDelta, Citation und Finished. Dadurch
lassen sich in Tests und im Testmodus (CHAT_DRY_RUN) andere Implementierungen einsetzen.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any, Protocol

import anthropic

from .config import Settings

log = logging.getLogger(__name__)

FALLBACK_BETA = "server-side-fallback-2026-07-01"


@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class Citation:
    document_index: int | None
    document_title: str | None


@dataclass(frozen=True)
class Finished:
    stop_reason: str | None
    model: str | None


class LLMError(Exception):
    """Fehler beim Sprachmodell. Die Meldung für Besucher steht je Sprache in app/i18n.py (llm_<code>)."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


UsageSink = Callable[[Any], None]


class ChatLLM(Protocol):
    def stream(self, *, system: list[dict], messages: list[dict], on_usage: UsageSink) -> AsyncIterator[Any]: ...


class ClaudeLLM:
    def __init__(self, settings: Settings):
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY fehlt in backend/.env (oder CHAT_DRY_RUN=true setzen).")
        self.settings = settings
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=60.0, max_retries=2)

    def _request_kwargs(self, system: list[dict], messages: list[dict]) -> dict:
        s = self.settings
        kwargs: dict[str, Any] = {
            "model": s.model,
            "max_tokens": s.max_output_tokens,
            "system": system,
            "messages": messages,
        }
        if s.effort:
            kwargs["output_config"] = {"effort": s.effort}
        if s.use_fallbacks:
            # Lehnen die Sicherheitsfilter eine Anfrage ab, beantwortet sie serverseitig ein Ersatzmodell
            kwargs["betas"] = [FALLBACK_BETA]
            kwargs["fallbacks"] = "default"
        return kwargs

    async def stream(self, *, system: list[dict], messages: list[dict], on_usage: UsageSink) -> AsyncIterator[Any]:
        kwargs = self._request_kwargs(system, messages)
        usage_reported = False
        try:
            async with self.client.beta.messages.stream(**kwargs) as stream:
                try:
                    async for event in stream:
                        if event.type == "text":
                            yield TextDelta(event.text)
                        elif event.type == "citation":
                            citation = event.citation
                            yield Citation(
                                document_index=getattr(citation, "document_index", None),
                                document_title=getattr(citation, "document_title", None),
                            )
                    final = await stream.get_final_message()
                    on_usage(final.usage)
                    usage_reported = True
                    log.info(
                        "Antwort von %s (%s), request_id=%s", final.model, final.stop_reason, stream.request_id
                    )
                    yield Finished(stop_reason=final.stop_reason, model=final.model)
                finally:
                    if not usage_reported:
                        # Abbruch (z. B. Browser geschlossen): bisher angefallene Tokens trotzdem verbuchen
                        try:
                            on_usage(stream.current_message_snapshot.usage)
                        except Exception:  # noqa: BLE001 – Snapshot evtl. noch nicht vorhanden
                            pass
        except anthropic.AuthenticationError as exc:
            log.error("Anthropic: API-Schlüssel ungültig (%s).", exc.status_code)
            raise LLMError("config") from exc
        except anthropic.PermissionDeniedError as exc:
            log.error("Anthropic: Keine Berechtigung für Modell/Funktion (%s).", exc.status_code)
            raise LLMError("config") from exc
        except anthropic.NotFoundError as exc:
            log.error("Anthropic: Modell %s nicht gefunden.", self.settings.model)
            raise LLMError("config") from exc
        except anthropic.BadRequestError as exc:
            log.error("Anthropic: Ungültige Anfrage: %s", exc.message)
            raise LLMError("bad_request") from exc
        except anthropic.RateLimitError as exc:
            log.warning("Anthropic: Rate-Limit erreicht.")
            raise LLMError("busy") from exc
        except anthropic.APIStatusError as exc:
            log.warning("Anthropic: Fehler %s.", exc.status_code)
            raise LLMError("unavailable") from exc
        except anthropic.APIConnectionError as exc:
            log.warning("Anthropic: Keine Verbindung.")
            raise LLMError("unavailable") from exc


class DryRunLLM:
    """Testmodus ohne API-Aufruf: zeigt, welche Dokumente die Suche gefunden hat. Kostet nichts."""

    def __init__(self, delay: float = 0.02):
        self.delay = delay

    async def stream(self, *, system: list[dict], messages: list[dict], on_usage: UsageSink) -> AsyncIterator[Any]:
        documents = [
            block
            for message in messages
            if isinstance(message["content"], list)
            for block in message["content"]
            if block.get("type") == "document"
        ]
        retrieved = [i for i, doc in enumerate(documents) if doc.get("context", "").startswith("Per Suche")]
        lines = ["Testmodus (CHAT_DRY_RUN=true): Es wurde kein Sprachmodell aufgerufen."]
        if retrieved:
            lines.append("Die Suche hat für diese Frage diese Auszüge gefunden:")
            lines.extend(f"- {documents[i]['title']}" for i in retrieved)
        else:
            lines.append("Die Suche hat keine passenden Auszüge gefunden.")
        text = "\n".join(lines)
        for word in text.split(" "):
            yield TextDelta(word + " ")
            await asyncio.sleep(self.delay)
        for index in retrieved[:2]:
            yield Citation(document_index=index, document_title=documents[index]["title"])
        on_usage(None)
        yield Finished(stop_reason="end_turn", model="dry-run")
