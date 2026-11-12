"""FastAPI-App: Chat-Endpunkt mit Streaming (Server-Sent Events), Kontaktformular und alle Schutzmaßnahmen.

Start (im Ordner backend):  uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from email.message import EmailMessage
from functools import partial

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .chat import Source, run_chat
from .chat_log import ChatLog, conversation_id
from .config import Settings, load_settings
from .contact import build_contact_mail, send_mail
from .i18n import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, message, resolve_language
from .knowledge.embeddings import embedder_factory
from .knowledge.index import IndexMissingError, KnowledgeBase
from .knowledge.techstack import load_public_techstack
from .llm import ChatLLM, ClaudeLLM, DryRunLLM
from .schemas import (
    ChatRequest,
    ContactRequest,
    FeedbackRequest,
    clean_text,
    validate_contact,
    validate_conversation,
)
from .security.budget import DailyBudget
from .security.rate_limit import ConcurrencyGate, RateLimiter
from .security.transcript import sign_feedback, verify_feedback, verify_transcript
from .security.turnstile import verify_turnstile

log = logging.getLogger("app")

TurnstileVerifier = Callable[[str, str | None, str | None], Awaitable[bool]]
Mailer = Callable[[EmailMessage], None]


class BodySizeLimit:
    """Lehnt Anfragen ab, deren Inhalt größer als max_bytes ist (auch ohne Content-Length)."""

    def __init__(self, app: ASGIApp, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        language = resolve_language(None, headers.get(b"accept-language", b"").decode("latin-1"))
        length = headers.get(b"content-length")
        if length is not None and length.isdigit() and int(length) > self.max_bytes:
            await _too_large(send, language)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await _too_large(send, language)


class _BodyTooLarge(Exception):
    pass


class SecurityHeaders:
    """Setzt einfache Sicherheits-Header auf jede Antwort (reines ASGI, damit Streaming unberührt bleibt)."""

    HEADERS = [(b"x-content-type-options", b"nosniff"), (b"referrer-policy", b"strict-origin-when-cross-origin")]

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                existing = {name.lower() for name, _ in message.get("headers", [])}
                message["headers"] = list(message.get("headers", [])) + [
                    header for header in self.HEADERS if header[0] not in existing
                ]
            await send(message)

        await self.app(scope, receive, send_with_headers)


async def _too_large(send: Send, language: str) -> None:
    body = json.dumps({"detail": message(language, "too_large"), "code": "too_large"}, ensure_ascii=False).encode()
    await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": body})


def _error(status: int, code: str, detail: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse({"detail": detail, "code": code}, status_code=status, headers=headers)


def _rejected(reason: str, endpoint: str) -> None:
    """Abgewiesene Anfragen protokollieren, ohne IP. Auswerten: backend/README.md, „Protokolle auswerten“."""
    log.warning("Abgewiesen: %s (%s)", reason, endpoint)


def _rate_limited(language: str, key: str, retry_after: float) -> JSONResponse:
    return _error(429, "rate_limited", message(language, key), {"Retry-After": str(int(retry_after) + 1)})


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def client_ip(request: Request, trust_proxy: bool) -> str:
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Der eigene Reverse-Proxy hängt die echte Adresse hinten an; vordere Einträge kann der Client fälschen
            return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def _prune_hourly(chat_log: ChatLog) -> None:
    """Hält die Löschfrist auch dann ein, wenn länger niemand chattet (sonst nur beim nächsten Eintrag)."""
    while True:
        await asyncio.to_thread(chat_log.prune)
        await asyncio.sleep(3600)


def _load_knowledge(settings: Settings) -> KnowledgeBase:
    return KnowledgeBase.load(settings.index_dir, embedder_factory(settings), settings.retrieval_min_similarity)


def _load_techstack(settings: Settings) -> dict:
    translations = {
        language: settings.techstack_translation_path(language)
        for language in SUPPORTED_LANGUAGES
        if language != DEFAULT_LANGUAGE
    }
    return load_public_techstack(settings.techstack_path, translations)


def _create_llm(settings: Settings) -> ChatLLM:
    return DryRunLLM() if settings.dry_run else ClaudeLLM(settings)


def create_app(
    settings: Settings | None = None,
    *,
    kb: KnowledgeBase | None = None,
    llm: ChatLLM | None = None,
    turnstile_verifier: TurnstileVerifier | None = None,
    mailer: Mailer | None = None,
) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        state = app.state
        state.kb, state.kb_error = kb, None
        if state.kb is None:
            try:
                state.kb = _load_knowledge(settings)
                log.info(
                    "Wissensbasis geladen: %d Kontext-Dokumente, %d Abschnitte.",
                    len(state.kb.context_docs),
                    len(state.kb.chunks),
                )
            except IndexMissingError as exc:
                state.kb_error = str(exc)
                log.warning("%s", exc)
        state.techstack, state.techstack_error = None, None
        if settings.techstack_path:
            try:
                state.techstack = _load_techstack(settings)
            except (OSError, ValueError, KeyError) as exc:  # fehlt, kein gültiges JSON, unbekannte Projekte
                state.techstack_error = f"Tech-Stack nicht lesbar ({settings.techstack_path}): {exc}"
                log.warning("%s", state.techstack_error)
        state.llm, state.llm_error = llm, None
        if state.llm is None:
            try:
                state.llm = _create_llm(settings)
            except RuntimeError as exc:
                state.llm_error = str(exc)
                log.error("%s", exc)
        pruning = asyncio.create_task(_prune_hourly(state.chats))
        yield
        pruning.cancel()

    app = FastAPI(title="CV-Chatbot", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = settings
    app.state.limiter = RateLimiter(settings.rate_limit_per_minute, settings.rate_limit_per_day)
    app.state.gate = ConcurrencyGate(settings.max_concurrent_streams)
    app.state.budget = DailyBudget(settings.data_dir / "usage.json", settings.daily_budget_usd, settings.prices)
    app.state.chats = ChatLog(settings.data_dir / "chats.jsonl", settings.log_chats, settings.log_retention_days)
    app.state.turnstile = turnstile_verifier or verify_turnstile
    # Eigenes, strengeres Limit fürs Kontaktformular (jede Nachricht landet im Postfach)
    app.state.contact_limiter = RateLimiter(2, settings.contact_limit_per_day)
    app.state.mailer = mailer or partial(send_mail, settings)
    # Bewertungen: großzügig, aber nicht unbegrenzt (zählt nicht gegen das Chat-Limit)
    app.state.feedback_limiter = RateLimiter(20, 200)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        max_age=600,
    )
    app.add_middleware(BodySizeLimit, max_bytes=settings.max_body_bytes)
    app.add_middleware(SecurityHeaders)

    @app.get("/api/health")
    async def health(request: Request) -> dict:
        state = request.app.state
        kb_ready = state.kb is not None
        techstack_ok = state.techstack is not None or not settings.techstack_path
        return {
            "status": "ok" if kb_ready and state.llm is not None and techstack_ok else "degraded",
            "knowledge": {
                "ready": kb_ready,
                "context_documents": len(state.kb.context_docs) if kb_ready else 0,
                "chunks": len(state.kb.chunks) if kb_ready else 0,
                "semantic_search": bool(kb_ready and state.kb.embedder is not None),
                "built_at": state.kb.meta.get("built_at") if kb_ready else None,
                "error": state.kb_error,
            },
            "llm": {"ready": state.llm is not None, "dry_run": settings.dry_run, "error": state.llm_error},
            "techstack": {"ready": state.techstack is not None, "error": state.techstack_error},
        }

    @app.get("/api/techstack")
    async def techstack(request: Request):
        """Tech-Stack für die Grafik der Webseite: { projects, entries, texts: { <sprache>: Übersetzung } }."""
        state = request.app.state
        if state.techstack is None:
            language = resolve_language(None, request.headers.get("accept-language"))
            return _error(503, "techstack_unavailable", message(language, "techstack_unavailable"))
        return JSONResponse(state.techstack, headers={"Cache-Control": "public, max-age=300"})

    @app.get("/api/chat/config")
    async def chat_config(request: Request) -> dict:
        state = request.app.state
        return {
            "ready": state.kb is not None and state.llm is not None,
            "maxMessageChars": settings.max_message_chars,
            "maxTurns": settings.max_turns,
            "turnstile": bool(settings.turnstile_secret),
        }

    @app.post("/api/chat")
    async def chat(request: Request):
        state = request.app.state
        # Sprache der Meldungen: bis der Inhalt gelesen ist aus Accept-Language, danach aus "lang"
        accept_language = request.headers.get("accept-language")
        language = resolve_language(None, accept_language)
        if not request.headers.get("content-type", "").lower().startswith("application/json"):
            return _error(415, "content_type", message(language, "content_type"))

        ip = client_ip(request, settings.trust_proxy_headers)
        retry_after = state.limiter.hit(ip)
        if retry_after is not None:
            _rejected("Rate-Limit", "Chat")
            return _rate_limited(language, "rate_limited", retry_after)

        try:
            payload = ChatRequest.model_validate_json(await request.body())
        except ValidationError:
            return _error(422, "invalid", message(language, "invalid"))
        language = resolve_language(payload.lang, accept_language)

        if payload.website.strip():
            _rejected("Honeypot", "Chat")
            return _error(400, "rejected", message(language, "rejected"))

        problem = validate_conversation(payload.messages, settings.max_message_chars, settings.max_turns, language)
        if problem:
            return _error(422, "invalid", problem)

        history = [
            (m.role, clean_text(m.content) if m.role == "user" else m.content) for m in payload.messages
        ]
        if len(history) > 1 and not verify_transcript(settings.signing_secret, history[:-1], payload.history_token):
            _rejected("Verlauf ungültig", "Chat")
            return _error(409, "history", message(language, "history"))

        if settings.turnstile_secret and not await state.turnstile(
            settings.turnstile_secret, payload.turnstile_token, ip
        ):
            _rejected("Turnstile", "Chat")
            return _error(403, "bot_check", message(language, "bot_check"))

        if state.kb is None or state.llm is None:
            return _error(503, "not_ready", message(language, "not_ready"))

        if state.budget.exhausted():
            _rejected("Tagesbudget erreicht", "Chat")
            return _error(503, "budget", message(language, "budget"))

        ticket = state.gate.try_acquire()
        if ticket is None:
            _rejected("ausgelastet", "Chat")
            return _error(503, "busy", message(language, "busy"), {"Retry-After": "5"})

        question = history[-1][1]
        # Angaben, mit denen der Browser die Antwort bewerten kann (nur bei eingeschaltetem Protokoll)
        feedback: dict = {}

        def on_complete(text: str, sources: list[Source], stop_reason: str | None) -> None:
            first_answer = history[1][1] if len(history) > 1 else text
            conversation, turn = conversation_id(history[0][1], first_answer), (len(history) + 1) // 2
            if settings.log_chats:
                token = sign_feedback(settings.signing_secret, conversation, turn)
                feedback.update(conversation=conversation, turn=turn, token=token)
            state.chats.add(
                conversation=conversation,
                turn=turn,
                language=language,
                question=question,
                answer=text,
                sources=[s.title for s in sources],
                stop_reason=stop_reason,
            )

        async def events():
            try:
                yield ": stream\n\n"
                async for name, data in run_chat(
                    history=history,
                    kb=state.kb,
                    llm=state.llm,
                    settings=settings,
                    on_usage=state.budget.record,
                    on_complete=on_complete,
                    language=language,
                ):
                    if name == "done" and feedback:
                        data = {**data, "feedback": feedback}
                    yield _sse(name, data)
            except Exception:
                log.exception("Unerwarteter Fehler bei der Chat-Antwort.")
                yield _sse("error", {"code": "internal", "message": message(language, "internal")})
            finally:
                state.gate.release(ticket)

        return StreamingResponse(
            events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    @app.post("/api/chat/feedback")
    async def chat_feedback(request: Request):
        state = request.app.state
        language = resolve_language(None, request.headers.get("accept-language"))
        if not request.headers.get("content-type", "").lower().startswith("application/json"):
            return _error(415, "content_type", message(language, "content_type"))

        retry_after = state.feedback_limiter.hit(client_ip(request, settings.trust_proxy_headers))
        if retry_after is not None:
            _rejected("Rate-Limit", "Bewertung")
            return _rate_limited(language, "rate_limited", retry_after)

        try:
            payload = FeedbackRequest.model_validate_json(await request.body())
        except ValidationError:
            return _error(422, "invalid", message(language, "invalid"))

        if not verify_feedback(settings.signing_secret, payload.conversation, payload.turn, payload.token):
            _rejected("Token ungültig", "Bewertung")
            return _error(403, "rejected", message(language, "rejected"))

        state.chats.add_rating(conversation=payload.conversation, turn=payload.turn, rating=payload.rating)
        return {"ok": True}

    @app.post("/api/contact")
    async def contact(request: Request):
        state = request.app.state
        accept_language = request.headers.get("accept-language")
        language = resolve_language(None, accept_language)
        if not request.headers.get("content-type", "").lower().startswith("application/json"):
            return _error(415, "content_type", message(language, "content_type"))

        ip = client_ip(request, settings.trust_proxy_headers)
        retry_after = state.contact_limiter.hit(ip)
        if retry_after is not None:
            _rejected("Rate-Limit", "Kontakt")
            return _rate_limited(language, "contact_rate_limited", retry_after)

        try:
            payload = ContactRequest.model_validate_json(await request.body())
        except ValidationError:
            return _error(422, "invalid", message(language, "invalid"))
        language = resolve_language(payload.lang, accept_language)

        if payload.website.strip():
            _rejected("Honeypot", "Kontakt")
            return _error(400, "rejected", message(language, "rejected"))

        problem = validate_contact(payload, language)
        if problem:
            return _error(422, "invalid", problem)

        if not settings.contact_enabled:
            return _error(503, "contact_unavailable", message(language, "contact_unavailable"))

        if settings.turnstile_secret and not await state.turnstile(
            settings.turnstile_secret, payload.turnstile_token, ip
        ):
            _rejected("Turnstile", "Kontakt")
            return _error(403, "bot_check", message(language, "bot_check"))

        try:
            mail = build_contact_mail(settings, payload.name, payload.email, payload.message, language)
        except ValueError:
            return _error(422, "invalid", message(language, "invalid_email"))

        try:
            await run_in_threadpool(state.mailer, mail)
        except OSError:  # auch smtplib.SMTPException
            log.exception("Kontaktnachricht konnte nicht verschickt werden.")
            return _error(503, "contact_failed", message(language, "contact_failed"))

        # Ohne Inhalt und ohne Adressen: Das Protokoll soll keine personenbezogenen Daten enthalten
        log.info("Kontaktnachricht weitergeleitet.")
        return {"ok": True}

    if settings.serve_frontend_dir and settings.serve_frontend_dir.exists():
        from fastapi.staticfiles import StaticFiles

        app.mount("/", StaticFiles(directory=settings.serve_frontend_dir, html=True), name="frontend")

    return app


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
app = create_app()
