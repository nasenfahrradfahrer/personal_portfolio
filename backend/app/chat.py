"""Ablauf einer Chat-Antwort: Suche -> Anfrage an das Modell -> Ereignisse für den Browser.

Aufbau der Anfrage an Claude (für Prompt-Caching und Quellenangaben):
- system:       statischer Systemprompt
- 1. Nachricht: Kontext-Dokumente (immer gleich, mit Cache-Marker) + erste Frage
- …             bisheriger Verlauf als reiner Text
- letzte Nachricht: per Suche gefundene Auszüge + Hinweis auf die Sprache der Webseite + aktuelle Frage

Alle Dokumente haben Zitate aktiviert; so kann die Antwort ihre Quellen nennen.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any

from .config import Settings
from .i18n import DEFAULT_LANGUAGE, MESSAGES, SITE_LANGUAGE_NOTES, message
from .knowledge.documents import ContextDoc
from .knowledge.index import KnowledgeBase, SearchHit
from .llm import ChatLLM, Citation, Finished, LLMError, TextDelta
from .prompts import build_system_prompt
from .security.transcript import sign_transcript

log = logging.getLogger(__name__)

CONTEXT_NOTE = "Fester Bestandteil des Profils."
RETRIEVED_NOTE = "Per Suche ausgewählter Auszug zur aktuellen Frage – kann unpassend sein."
MAX_TITLE_CHARS = 200


@dataclass(frozen=True)
class Source:
    title: str
    kind: str


def _document_block(title: str, text: str, note: str) -> dict:
    return {
        "type": "document",
        "source": {"type": "text", "media_type": "text/plain", "data": text},
        "title": title[:MAX_TITLE_CHARS],
        "context": note,
        "citations": {"enabled": True},
    }


def retrieve(kb: KnowledgeBase, history: list[tuple[str, str]], k: int) -> list[SearchHit]:
    """Sucht zur aktuellen Frage und – schwächer gewichtet – zusammen mit der vorherigen.

    So bekommen Rückfragen ("Und welche Ergebnisse?") Kontext, ohne dass bei einem
    Themenwechsel das alte Thema die Treffer dominiert.
    """
    questions = [content for role, content in history if role == "user"]
    current = kb.search(questions[-1], k)
    if len(questions) < 2:
        return current
    with_context = kb.search(f"{questions[-2]}\n{questions[-1]}", k)

    scores: dict[str, float] = {}
    hits: dict[str, SearchHit] = {}
    for weight, ranking in ((1.0, current), (0.5, with_context)):
        for rank, hit in enumerate(ranking):
            scores[hit.chunk.id] = scores.get(hit.chunk.id, 0.0) + weight / (60 + rank + 1)
            hits.setdefault(hit.chunk.id, hit)
    best = sorted(scores, key=scores.__getitem__, reverse=True)[:k]
    return [hits[chunk_id] for chunk_id in best]


def build_request(
    system_prompt: str,
    context_docs: list[ContextDoc],
    hits: list[SearchHit],
    history: list[tuple[str, str]],
    site_note: str | None = None,
) -> tuple[list[dict], list[dict], list[Source]]:
    """Gibt (system, messages, Quellen in Dokumentreihenfolge) zurück.

    site_note steht als eigener Textblock vor der aktuellen Frage (hinter der Cache-Grenze).
    """
    sources: list[Source] = []
    context_blocks = []
    for doc in context_docs:
        context_blocks.append(_document_block(doc.title, doc.text, CONTEXT_NOTE))
        sources.append(Source(doc.title, doc.type))

    retrieved_blocks = []
    for hit in hits:
        retrieved_blocks.append(_document_block(hit.chunk.title, hit.chunk.text, RETRIEVED_NOTE))
        sources.append(Source(hit.chunk.title, hit.chunk.doc_type))

    system: list[dict] = [{"type": "text", "text": system_prompt}]
    if context_blocks:
        context_blocks[-1]["cache_control"] = {"type": "ephemeral"}
    else:
        system[0]["cache_control"] = {"type": "ephemeral"}

    messages: list[dict] = []
    last_index = len(history) - 1
    for index, (role, content) in enumerate(history):
        if role == "assistant":
            messages.append({"role": "assistant", "content": content})
            continue
        blocks: list[dict] = []
        if index == 0:
            blocks.extend(context_blocks)
        if index == last_index:
            blocks.extend(retrieved_blocks)
            if site_note:
                blocks.append({"type": "text", "text": site_note})
        blocks.append({"type": "text", "text": content})
        messages.append({"role": "user", "content": blocks})
    return system, messages, sources


async def run_chat(
    *,
    history: list[tuple[str, str]],
    kb: KnowledgeBase,
    llm: ChatLLM,
    settings: Settings,
    on_usage: Callable[[Any], None],
    on_complete: Callable[[str, list[Source], str | None], None] | None = None,
    language: str = DEFAULT_LANGUAGE,
) -> AsyncIterator[tuple[str, dict]]:
    """Erzeugt die Ereignisse delta, replace, sources, done bzw. error.

    language: Sprache der Webseite, für Fehlermeldungen, feste Antworten und als Hinweis an das Modell.
    """
    hits = await asyncio.to_thread(retrieve, kb, history, settings.retrieval_top_k)
    system, messages, sources = build_request(
        build_system_prompt(settings), kb.context_docs, hits, history, SITE_LANGUAGE_NOTES.get(language)
    )

    parts: list[str] = []
    cited: dict[str, Source] = {}
    stop_reason: str | None = None
    try:
        async for event in llm.stream(system=system, messages=messages, on_usage=on_usage):
            if isinstance(event, TextDelta):
                parts.append(event.text)
                yield "delta", {"text": event.text}
            elif isinstance(event, Citation):
                source = None
                if event.document_index is not None and 0 <= event.document_index < len(sources):
                    source = sources[event.document_index]
                elif event.document_title:
                    source = Source(event.document_title, "Dokument")
                if source:
                    cited.setdefault(source.title, source)
            elif isinstance(event, Finished):
                stop_reason = event.stop_reason
    except LLMError as exc:
        key = f"llm_{exc.code}" if f"llm_{exc.code}" in MESSAGES[DEFAULT_LANGUAGE] else "internal"
        yield "error", {"code": exc.code, "message": message(language, key)}
        return

    text = "".join(parts)
    if stop_reason == "refusal":
        # Teilantwort verwerfen, wie für abgelehnte Anfragen vorgesehen
        text = message(language, "refusal")
        cited.clear()
        yield "replace", {"text": text}
    elif not text.strip():
        text = message(language, "empty")
        yield "replace", {"text": text}
    elif stop_reason == "max_tokens":
        suffix = message(language, "truncated")
        text += suffix
        yield "delta", {"text": suffix}

    used_sources = list(cited.values())
    yield "sources", {"sources": [{"title": s.title, "kind": s.kind} for s in used_sources]}
    token = sign_transcript(settings.signing_secret, [*history, ("assistant", text)])
    # Vor "done", damit das Protokoll auch dann geschrieben ist, wenn der Browser direkt danach trennt
    if on_complete:
        on_complete(text, used_sources, stop_reason)
    yield "done", {"history_token": token}
