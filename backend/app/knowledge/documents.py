"""Markdown-Dokumente der Wissensbasis mit Front Matter.

Aufbau einer Datei in knowledge/documents/:

    ---
    title: Masterarbeit – Frame-Auswahl für die Videoklassifikation
    type: Abschlussarbeit
    mode: retrieve      # context = immer im Prompt, retrieve = per Suche in Abschnitten
    public: true        # erst nach Prüfung auf true setzen
    ---
    # Überschrift
    Text …

HTML-Kommentare (<!-- … -->) werden ignoriert und eignen sich für eigene Notizen.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml

Mode = Literal["context", "retrieve"]

FRONT_MATTER_RE = re.compile(r"\A---[ \t]*\n(.*?)\n---[ \t]*(?:\n|\Z)", re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*#*\s*$", re.M)


class DocumentError(ValueError):
    pass


@dataclass(frozen=True)
class Document:
    path: Path
    slug: str
    title: str
    type: str
    mode: Mode
    public: bool
    body: str

    @property
    def chars(self) -> int:
        return len(self.body)


@dataclass(frozen=True)
class ContextDoc:
    """Dokument, das bei jeder Frage vollständig mitgeschickt wird."""

    slug: str
    title: str
    type: str
    text: str


def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "dokument"


def strip_comments(text: str) -> str:
    return COMMENT_RE.sub("", text)


def parse_document(path: Path) -> Document:
    raw = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    match = FRONT_MATTER_RE.match(raw)
    if not match:
        raise DocumentError("Front Matter fehlt (Block zwischen --- am Dateianfang).")
    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:
        raise DocumentError(f"Front Matter ist kein gültiges YAML: {exc}") from exc
    if not isinstance(meta, dict):
        raise DocumentError("Front Matter muss aus Schlüssel-Wert-Paaren bestehen.")

    mode = meta.get("mode", "retrieve")
    if mode not in ("context", "retrieve"):
        raise DocumentError(f"mode muss 'context' oder 'retrieve' sein, nicht {mode!r}.")
    public = meta.get("public", False)
    if not isinstance(public, bool):
        raise DocumentError("public muss true oder false sein (ohne Anführungszeichen).")

    body = strip_comments(raw[match.end() :]).strip()
    title = meta.get("title")
    if not title:
        heading = HEADING_RE.search(body)
        title = heading.group(1) if heading else path.stem
    return Document(
        path=path,
        slug=slugify(path.stem),
        title=str(title).strip(),
        type=str(meta.get("type") or "Dokument").strip(),
        mode=mode,
        public=public,
        body=body,
    )


def load_documents(directory: Path) -> tuple[list[Document], list[tuple[Path, str]]]:
    """Lädt alle .md-Dateien. Dateien, die mit _ beginnen, werden übersprungen."""
    documents: list[Document] = []
    errors: list[tuple[Path, str]] = []
    if not directory.exists():
        return documents, errors
    for path in sorted(directory.glob("*.md")):
        if path.name.startswith("_"):
            continue
        try:
            documents.append(parse_document(path))
        except DocumentError as exc:
            errors.append((path, str(exc)))
    return documents, errors
