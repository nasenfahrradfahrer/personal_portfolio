"""Konfiguration aus Umgebungsvariablen bzw. backend/.env (geladen mit python-dotenv)."""

from __future__ import annotations

import logging
import os
import secrets
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Privates Repo mit Wissensbasis und Tech-Stack. Lokal über die eigenen Git-Zugangsdaten (HTTPS),
# auf dem Server per Deploy Key: KNOWLEDGE_REPO=git@github.com:nasenfahrradfahrer/portfolio_website_private_files.git
DEFAULT_KNOWLEDGE_REPO = "https://github.com/nasenfahrradfahrer/portfolio_website_private_files.git"

log = logging.getLogger(__name__)

# Preise in USD pro 1 Mio. Tokens: (Input, Output, Cache schreiben (5 Min.), Cache lesen).
# Stand der Anthropic-Preisliste bei Erstellung; Abweichungen per PRICE_* in der .env überschreiben.
MODEL_PRICES: dict[str, tuple[float, float, float, float]] = {
    "claude-opus-5-5": (4.00, 20.00, 5.00, 0.20),
    "claude-opus-4-8": (5.00, 25.00, 6.25, 0.50),
    "claude-sonnet-5-5": (2.00, 10.00, 2.50, 0.20),
    "claude-haiku-4-5": (1.00, 5.00, 1.25, 0.10),
}

# Modelle, die serverseitige Fallbacks im Modus "default" unterstützen
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"}
# Modelle, die den Parameter effort nicht kennen (würde einen Fehler 400 auslösen)
NO_EFFORT_MODELS = {"claude-haiku-4-5"}


@dataclass(frozen=True)
class Prices:
    input: float
    output: float
    cache_write: float
    cache_read: float


@dataclass(frozen=True)
class Settings:
    # Sprachmodell
    anthropic_api_key: str | None
    model: str
    effort: str | None
    max_output_tokens: int
    use_fallbacks: bool
    dry_run: bool
    prices: Prices

    # Inhalt der Antworten
    owner_name: str
    owner_pronouns: str | None
    contact_hint: str

    # Wissensbasis (Klon des privaten Repos, siehe app/knowledge/sync.py)
    knowledge_dir: Path
    knowledge_repo: str | None
    knowledge_branch: str
    index_dir: Path
    techstack_path: Path | None
    embedding_model: str | None
    embedding_cache_dir: Path
    retrieval_top_k: int
    retrieval_min_similarity: float
    chunk_max_chars: int
    chunk_overlap_chars: int

    # Schutzmaßnahmen
    allowed_origins: list[str]
    max_message_chars: int
    max_turns: int
    max_body_bytes: int
    rate_limit_per_minute: int
    rate_limit_per_day: int
    max_concurrent_streams: int
    daily_budget_usd: float
    signing_secret: bytes
    trust_proxy_headers: bool
    turnstile_secret: str | None

    # Kontaktformular (Versand per SMTP an das eigene Postfach)
    smtp_host: str | None
    smtp_port: int
    smtp_user: str | None
    smtp_password: str | None
    contact_to: str | None
    contact_from: str | None
    contact_limit_per_day: int

    # Betrieb
    data_dir: Path
    log_chats: bool
    log_retention_days: int
    serve_frontend_dir: Path | None

    @property
    def contact_enabled(self) -> bool:
        return bool(self.smtp_host and self.contact_to and self.contact_from)

    @property
    def documents_dir(self) -> Path:
        return self.knowledge_dir / "documents"

    @property
    def raw_dir(self) -> Path:
        return self.knowledge_dir / "raw"

    def techstack_translation_path(self, language: str) -> Path | None:
        """Übersetzung des Tech-Stacks neben techstack.json, z. B. techstack.en.json."""
        if self.techstack_path is None:
            return None
        return self.techstack_path.with_name(f"{self.techstack_path.stem}.{language}{self.techstack_path.suffix}")


def _str(env: Mapping[str, str], key: str, default: str | None = None) -> str | None:
    value = env.get(key)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


def _int(env: Mapping[str, str], key: str, default: int) -> int:
    value = _str(env, key)
    return int(value) if value is not None else default


def _float(env: Mapping[str, str], key: str, default: float) -> float:
    value = _str(env, key)
    return float(value) if value is not None else default


def _bool(env: Mapping[str, str], key: str, default: bool) -> bool:
    value = _str(env, key)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "ja", "on"}


def _path(env: Mapping[str, str], key: str, default: str | None) -> Path | None:
    value = _str(env, key, default)
    if value is None or value.lower() == "none":
        return None
    path = Path(value)
    return path if path.is_absolute() else (BACKEND_DIR / path).resolve()


def load_settings(environ: Mapping[str, str] | None = None) -> Settings:
    """Liest die Einstellungen. Ohne `environ` wird zuerst backend/.env geladen."""
    if environ is None:
        load_dotenv(BACKEND_DIR / ".env", override=False)
        environ = os.environ
    env = environ

    model = _str(env, "ANTHROPIC_MODEL", "claude-opus-5-5")
    default_prices = MODEL_PRICES.get(model, MODEL_PRICES["claude-opus-5-5"])
    if model not in MODEL_PRICES and _str(env, "PRICE_INPUT") is None:
        log.warning("Keine Preise für %s hinterlegt – Budget rechnet mit Opus-5.5-Preisen. PRICE_* setzen.", model)
    prices = Prices(
        input=_float(env, "PRICE_INPUT", default_prices[0]),
        output=_float(env, "PRICE_OUTPUT", default_prices[1]),
        cache_write=_float(env, "PRICE_CACHE_WRITE", default_prices[2]),
        cache_read=_float(env, "PRICE_CACHE_READ", default_prices[3]),
    )

    effort = _str(env, "ANTHROPIC_EFFORT", "low")
    if effort and model in NO_EFFORT_MODELS:
        log.info("%s unterstützt effort nicht – Parameter wird weggelassen.", model)
        effort = None

    fallbacks = (_str(env, "ANTHROPIC_FALLBACKS", "auto") or "auto").lower()
    use_fallbacks = model in FALLBACK_MODELS if fallbacks == "auto" else fallbacks in {"1", "true", "on", "yes"}

    secret = _str(env, "CHAT_SIGNING_SECRET")
    if secret is None:
        log.warning(
            "CHAT_SIGNING_SECRET fehlt – es wird ein zufälliger Schlüssel genutzt. "
            "Laufende Unterhaltungen werden bei jedem Neustart ungültig."
        )
        signing_secret = secrets.token_bytes(32)
    else:
        signing_secret = secret.encode("utf-8")

    embedding_model = _str(env, "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    if embedding_model and embedding_model.lower() == "none":
        embedding_model = None

    origins = _str(env, "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173") or ""

    knowledge_dir = _path(env, "KNOWLEDGE_DIR", "knowledge/private")
    # Standard: techstack.json im privaten Repo; "none" = Tech-Stack weder indexieren noch ausliefern
    techstack_path = _path(env, "TECHSTACK_PATH", str(knowledge_dir / "techstack.json"))

    return Settings(
        anthropic_api_key=_str(env, "ANTHROPIC_API_KEY"),
        model=model,
        effort=effort,
        max_output_tokens=_int(env, "MAX_OUTPUT_TOKENS", 4096),
        use_fallbacks=use_fallbacks,
        dry_run=_bool(env, "CHAT_DRY_RUN", False),
        prices=prices,
        owner_name=_str(env, "OWNER_NAME", "Felix Möller"),
        owner_pronouns=_str(env, "OWNER_PRONOUNS"),
        contact_hint=_str(env, "CONTACT_HINT", "über den Kontaktbereich der Webseite"),
        knowledge_dir=knowledge_dir,
        knowledge_repo=_str(env, "KNOWLEDGE_REPO", DEFAULT_KNOWLEDGE_REPO),
        knowledge_branch=_str(env, "KNOWLEDGE_BRANCH", "master"),
        index_dir=_path(env, "INDEX_DIR", "knowledge/index"),
        techstack_path=techstack_path,
        embedding_model=embedding_model,
        embedding_cache_dir=_path(env, "EMBEDDING_CACHE_DIR", ".cache/fastembed"),
        retrieval_top_k=_int(env, "RETRIEVAL_TOP_K", 6),
        retrieval_min_similarity=_float(env, "RETRIEVAL_MIN_SIMILARITY", 0.3),
        chunk_max_chars=_int(env, "CHUNK_MAX_CHARS", 2400),
        chunk_overlap_chars=_int(env, "CHUNK_OVERLAP_CHARS", 300),
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
        max_message_chars=_int(env, "MAX_MESSAGE_CHARS", 1000),
        max_turns=_int(env, "MAX_TURNS", 10),
        max_body_bytes=_int(env, "MAX_BODY_BYTES", 64_000),
        rate_limit_per_minute=_int(env, "RATE_LIMIT_PER_MINUTE", 6),
        rate_limit_per_day=_int(env, "RATE_LIMIT_PER_DAY", 60),
        max_concurrent_streams=_int(env, "MAX_CONCURRENT_STREAMS", 4),
        daily_budget_usd=_float(env, "DAILY_BUDGET_USD", 2.0),
        signing_secret=signing_secret,
        trust_proxy_headers=_bool(env, "TRUST_PROXY_HEADERS", False),
        turnstile_secret=_str(env, "TURNSTILE_SECRET_KEY"),
        smtp_host=_str(env, "SMTP_HOST"),
        smtp_port=_int(env, "SMTP_PORT", 587),
        smtp_user=_str(env, "SMTP_USER"),
        smtp_password=_str(env, "SMTP_PASSWORD"),
        contact_to=_str(env, "CONTACT_TO"),
        contact_from=_str(env, "CONTACT_FROM", _str(env, "SMTP_USER")),
        contact_limit_per_day=_int(env, "CONTACT_LIMIT_PER_DAY", 5),
        data_dir=_path(env, "DATA_DIR", "data"),
        # LOG_QUESTIONS: früherer Name, gilt weiter, falls LOG_CHATS fehlt
        log_chats=_bool(env, "LOG_CHATS", _bool(env, "LOG_QUESTIONS", False)),
        log_retention_days=_int(env, "LOG_RETENTION_DAYS", 30),
        serve_frontend_dir=_path(env, "SERVE_FRONTEND_DIR", None),
    )
