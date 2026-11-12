"""Kommandozeile für die Wissensbasis. Aufruf im Ordner backend:

    python -m app.cli fetch-knowledge
    python -m app.cli extract knowledge/private/raw/masterarbeit.pdf --type Abschlussarbeit
    python -m app.cli build-index
    python -m app.cli search "Welche Erfahrung mit PyTorch?"
    python -m app.cli ask "Worum ging es in der Masterarbeit?"
    python -m app.cli ask "What was the master's thesis about?" --lang en
    python -m app.cli eval
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

import yaml

from .chat import run_chat
from .config import BACKEND_DIR, Settings, load_settings
from .i18n import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES
from .knowledge.documents import slugify
from .knowledge.embeddings import FastEmbedEmbedder, embedder_factory
from .knowledge.extract import build_draft, extract_pdf, extract_text_file
from .knowledge.index import IndexMissingError, KnowledgeBase, build_index
from .knowledge.sync import SyncError, fetch_knowledge
from .llm import ClaudeLLM, DryRunLLM
from .security.budget import usage_cost

CONTEXT_MAX_CHARS = 6000

NO_INFO_PATTERNS = [
    "keine information", "keine angaben", "liegen mir keine", "liegt mir nicht", "nicht bekannt",
    "kann ich leider", "kann ich nicht", "nicht beantworten", "direkten kontakt", "direkt kontakt",
    "no information", "don't have", "do not have", "can't help", "cannot help", "can't answer",
    "cannot answer", "not able to", "reach out", "contact",
]
ENGLISH_HINTS = [" the ", " and ", " has ", " with ", " his ", " their ", " experience "]


def cmd_fetch_knowledge(args: argparse.Namespace, settings: Settings) -> int:
    if not settings.knowledge_repo:
        print("KNOWLEDGE_REPO ist nicht gesetzt.")
        return 1
    print(f"Hole {settings.knowledge_repo} ({settings.knowledge_branch}) nach {settings.knowledge_dir} …")
    try:
        commit = fetch_knowledge(
            settings.knowledge_repo, settings.knowledge_branch, settings.knowledge_dir, mirror=args.mirror
        )
    except SyncError as exc:
        print(f"FEHLER: {exc}")
        return 1
    print(f"Stand: {commit}")
    return 0


def cmd_extract(args: argparse.Namespace, settings: Settings) -> int:
    source = Path(args.file)
    if not source.exists():
        print(f"Datei nicht gefunden: {source}")
        return 1
    suffix = source.suffix.lower()
    if suffix == ".pdf":
        result = extract_pdf(source)
    elif suffix in {".txt", ".md"}:
        result = extract_text_file(source)
    else:
        print("Unterstützt werden .pdf, .txt und .md. Scans als Bild bitte selbst abtippen (siehe README).")
        return 1

    mode = args.mode or ("context" if len(result.markdown) <= CONTEXT_MAX_CHARS else "retrieve")
    title = args.title or source.stem.replace("_", " ").replace("-", " ").strip()
    target = settings.documents_dir / f"{slugify(args.name or source.stem)}.md"
    if target.exists() and not args.force:
        print(f"{target} existiert bereits. Mit --force überschreiben oder --name angeben.")
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        build_draft(result, title=title, doc_type=args.type, mode=mode, source_name=source.name), encoding="utf-8"
    )
    print(f"Entwurf geschrieben: {target.relative_to(BACKEND_DIR) if target.is_relative_to(BACKEND_DIR) else target}")
    if result.pages:
        print(f"  {result.pages} Seiten, {len(result.markdown)} Zeichen, mode: {mode}")
    if result.removed_sections:
        print("  Entfernte Abschnitte: " + "; ".join(result.removed_sections))
    for warning in result.warnings:
        print(f"  WARNUNG: {warning}")
    print("Nächste Schritte: Datei durchlesen und korrigieren, public: true setzen, dann build-index ausführen.")
    return 0


def cmd_build_index(args: argparse.Namespace, settings: Settings) -> int:
    embedder = None
    if settings.embedding_model:
        print(f"Lade Embedding-Modell {settings.embedding_model} (beim ersten Mal ca. 220 MB Download) …")
        embedder = FastEmbedEmbedder(settings.embedding_model, settings.embedding_cache_dir)
    report = build_index(settings, embedder)

    print("\nImmer im Prompt (mode: context):")
    for name in report.context_docs or ["– keine –"]:
        print(f"  {name}")
    print("Per Suche (mode: retrieve):")
    for name in report.retrieve_docs or ["– keine –"]:
        print(f"  {name}")
    if report.skipped:
        print("Nicht aufgenommen:")
        for name in report.skipped:
            print(f"  {name}")
    if report.errors:
        print("FEHLER (Datei übersprungen):")
        for error in report.errors:
            print(f"  {error}")
    if report.warnings:
        print("Bitte prüfen (wird so veröffentlicht!):")
        for warning in report.warnings:
            print(f"  {warning}")

    tokens = report.context_tokens_estimate
    print(
        f"\n{report.chunks} Abschnitte, {report.windows} Suchfenster, Kontext ca. {tokens} Tokens pro Frage."
        f"\nIndex gespeichert in {settings.index_dir}. Backend neu starten, damit er geladen wird."
    )
    return 1 if report.errors else 0


def _load_kb(settings: Settings) -> KnowledgeBase | None:
    try:
        return KnowledgeBase.load(settings.index_dir, embedder_factory(settings), settings.retrieval_min_similarity)
    except IndexMissingError as exc:
        print(exc)
        return None


def cmd_search(args: argparse.Namespace, settings: Settings) -> int:
    kb = _load_kb(settings)
    if kb is None:
        return 1
    hits = kb.search(args.query, args.k)
    if not hits:
        print("Keine Treffer.")
    for rank, hit in enumerate(hits, start=1):
        similarity = f"{hit.similarity:.2f}" if hit.similarity is not None else "–"
        excerpt = " ".join(hit.chunk.text.split())[:160]
        print(f"{rank}. {hit.chunk.title}\n   Stichwort {hit.keyword_score:.2f} · Bedeutung {similarity}\n   {excerpt}…")
    return 0


async def _answer(
    question: str, settings: Settings, kb: KnowledgeBase, llm, language: str = DEFAULT_LANGUAGE
) -> tuple[str, list[str], float, str | None]:
    usages = []
    text_parts: list[str] = []
    sources: list[str] = []
    error = None
    async for event, data in run_chat(
        history=[("user", question)], kb=kb, llm=llm, settings=settings, on_usage=usages.append, language=language
    ):
        if event == "delta":
            text_parts.append(data["text"])
        elif event == "replace":
            text_parts = [data["text"]]
        elif event == "sources":
            sources = [s["title"] for s in data["sources"]]
        elif event == "error":
            error = data["message"]
    cost = sum(usage_cost(u, settings.prices) for u in usages)
    return "".join(text_parts), sources, cost, error


def _make_llm(settings: Settings):
    return DryRunLLM(delay=0) if settings.dry_run else ClaudeLLM(settings)


def cmd_ask(args: argparse.Namespace, settings: Settings) -> int:
    kb = _load_kb(settings)
    if kb is None:
        return 1
    text, sources, cost, error = asyncio.run(  # eine Loop
        _answer(args.question, settings, kb, _make_llm(settings), args.lang)
    )
    if error:
        print(f"FEHLER: {error}")
        return 1
    print(text.strip())
    if sources:
        print("\nQuellen: " + "; ".join(sources))
    print(f"\nKosten ca. {cost:.4f} USD")
    return 0


def check_answer(case: dict, text: str) -> list[str]:
    """Einfache Plausibilitätsprüfung. Ersetzt nicht das eigene Durchlesen der Antworten."""
    problems = []
    lower = f" {text.lower()} "
    expect = case.get("expect", "answer")
    for term in case.get("must_include", []):
        if term.lower() not in lower:
            problems.append(f"'{term}' fehlt")
    for term in case.get("must_not_include", []):
        if term.lower() in lower:
            problems.append(f"'{term}' sollte nicht vorkommen")
    says_no_info = any(pattern in lower for pattern in NO_INFO_PATTERNS)
    if expect in {"no_info", "decline"} and not says_no_info:
        problems.append("sollte ablehnen bzw. auf fehlende Informationen hinweisen")
    if case.get("language") == "en" and sum(hint in lower for hint in ENGLISH_HINTS) < 2:
        problems.append("Antwort ist vermutlich nicht auf Englisch")
    return problems


def cmd_eval(args: argparse.Namespace, settings: Settings) -> int:
    cases = yaml.safe_load(Path(args.file).read_text(encoding="utf-8")) or []
    kb = _load_kb(settings)
    if kb is None:
        return 1
    if not settings.dry_run and not args.yes:
        answer = input(
            f"{len(cases)} Fragen an {settings.model} senden (ca. 0,01–0,05 USD pro Frage)? [j/N] "
        ).strip().lower()
        if answer not in {"j", "ja", "y", "yes"}:
            return 1
    return asyncio.run(_run_eval(cases, settings, kb))


async def _run_eval(cases: list[dict], settings: Settings, kb: KnowledgeBase) -> int:
    llm = _make_llm(settings)  # ein Client für alle Fragen, in einer Event-Loop
    failures = 0
    total_cost = 0.0
    for number, case in enumerate(cases, start=1):
        # Sprache der Webseite wie beim Besucher: Testfragen mit language: en kommen von der englischen Seite
        text, sources, cost, error = await _answer(
            case["question"], settings, kb, llm, case.get("language", DEFAULT_LANGUAGE)
        )
        total_cost += cost
        problems = [error] if error else check_answer(case, text)
        status = "OK    " if not problems else "PRÜFEN"
        failures += bool(problems)
        print(f"\n[{status}] {number}. {case['question']}")
        print("   " + re.sub(r"\s+", " ", text).strip()[:600])
        if sources:
            print("   Quellen: " + "; ".join(sources))
        for problem in problems:
            print(f"   -> {problem}")
    print(f"\n{len(cases) - failures}/{len(cases)} unauffällig, Kosten ca. {total_cost:.3f} USD.")
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    # Umgeleitete Ausgabe (Git Bash, Pipes) unter Windows sonst in cp1252 -> Umlaute kaputt
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure") and not stream.isatty():
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="Wissensbasis des CV-Chatbots verwalten.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("fetch-knowledge", help="Wissensbasis aus dem privaten Repo klonen bzw. aktualisieren")
    p.add_argument(
        "--mirror",
        action="store_true",
        help="für Server: flacher Klon ohne raw/, lokale Änderungen werden verworfen",
    )
    p.set_defaults(func=cmd_fetch_knowledge)

    p = sub.add_parser("extract", help="PDF/TXT in einen Markdown-Entwurf umwandeln")
    p.add_argument("file")
    p.add_argument("--title", help="Titel des Dokuments (Standard: Dateiname)")
    p.add_argument("--type", default="Dokument", help="z. B. Abschlussarbeit, Arbeitszeugnis, Zertifikat")
    p.add_argument("--mode", choices=["context", "retrieve"], help="Standard: kurz = context, lang = retrieve")
    p.add_argument("--name", help="Dateiname des Entwurfs (Standard: wie die Quelldatei)")
    p.add_argument("--force", action="store_true", help="vorhandenen Entwurf überschreiben")
    p.set_defaults(func=cmd_extract)

    p = sub.add_parser("build-index", help="Index aus documents/ und dem Tech-Stack im privaten Repo bauen")
    p.set_defaults(func=cmd_build_index)

    p = sub.add_parser("search", help="Suche testen, ohne das Sprachmodell aufzurufen (kostenlos)")
    p.add_argument("query")
    p.add_argument("-k", type=int, default=6)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser("ask", help="Eine Frage komplett beantworten lassen (kostet API-Guthaben)")
    p.add_argument("question")
    p.add_argument("--lang", choices=SUPPORTED_LANGUAGES, default=DEFAULT_LANGUAGE, help="Sprache der Webseite")
    p.set_defaults(func=cmd_ask)

    p = sub.add_parser("eval", help="Testfragen aus evals/questions.yaml durchlaufen (kostet API-Guthaben)")
    p.add_argument("--file", default=str(BACKEND_DIR / "evals" / "questions.yaml"))
    p.add_argument("--yes", action="store_true", help="ohne Rückfrage starten")
    p.set_defaults(func=cmd_eval)

    args = parser.parse_args(argv)
    return args.func(args, load_settings())


if __name__ == "__main__":
    raise SystemExit(main())
