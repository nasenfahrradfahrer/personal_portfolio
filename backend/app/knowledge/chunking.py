"""Zerlegt Dokumente entlang ihrer Überschriften in Abschnitte (Chunks) für die Suche."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from .documents import Document

HEADING_LINE_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
SENTENCE_END_RE = re.compile(r"(?<=[.!?…])\s+(?=[A-ZÄÖÜ0-9„\"(])")
SEPARATOR = " › "


@dataclass(frozen=True)
class Chunk:
    id: str
    doc_slug: str
    doc_title: str
    doc_type: str
    section: str
    text: str

    @property
    def title(self) -> str:
        return f"{self.doc_title}{SEPARATOR}{self.section}" if self.section else self.doc_title

    @property
    def search_text(self) -> str:
        """Text für Suche und Embeddings – mit Titel und Abschnitt als Kontext."""
        return f"{self.title}\n{self.text}"

    def to_dict(self) -> dict:
        return asdict(self)


def split_sections(body: str) -> list[tuple[list[str], str]]:
    """Liefert (Überschriftenpfad, Text) für jeden Abschnitt mit Inhalt."""
    sections: list[tuple[list[str], str]] = []
    path: list[tuple[int, str]] = []
    lines: list[str] = []

    def flush() -> None:
        text = "\n".join(lines).strip()
        if text:
            sections.append(([title for _, title in path], text))
        lines.clear()

    for line in body.split("\n"):
        match = HEADING_LINE_RE.match(line)
        if match:
            flush()
            level = len(match.group(1))
            path = [(lvl, title) for lvl, title in path if lvl < level]
            path.append((level, match.group(2).strip()))
        else:
            lines.append(line)
    flush()
    return sections


def _split_long(paragraph: str, max_chars: int) -> list[str]:
    if len(paragraph) <= max_chars:
        return [paragraph]
    pieces: list[str] = []
    current = ""
    for sentence in SENTENCE_END_RE.split(paragraph):
        while len(sentence) > max_chars:  # einzelner Riesensatz: hart teilen
            pieces.append(sentence[:max_chars])
            sentence = sentence[max_chars:]
        if current and len(current) + 1 + len(sentence) > max_chars:
            pieces.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        pieces.append(current)
    return pieces


def pack_paragraphs(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    """Fasst Absätze zu Stücken bis max_chars zusammen; ein kurzer letzter Absatz wird als Überlappung übernommen."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    pieces = [piece for p in paragraphs for piece in _split_long(p, max_chars)]

    chunks: list[str] = []
    current: list[str] = []
    size = 0
    has_new = False
    for piece in pieces:
        if current and size + 2 + len(piece) > max_chars:
            chunks.append("\n\n".join(current))
            carry = current[-1] if len(current[-1]) <= overlap_chars else None
            current = [carry] if carry and len(carry) + 2 + len(piece) <= max_chars else []
            size = sum(len(c) + 2 for c in current)
            has_new = False
        current.append(piece)
        size += len(piece) + 2
        has_new = True
    if current and has_new:
        chunks.append("\n\n".join(current))
    return chunks


def chunk_document(document: Document, max_chars: int = 2400, overlap_chars: int = 300) -> list[Chunk]:
    chunks: list[Chunk] = []
    for path, text in split_sections(document.body):
        # Die oberste Überschrift entspricht oft dem Titel – dann nicht doppelt anzeigen
        if path and path[0].strip().lower() == document.title.strip().lower():
            path = path[1:]
        for piece in pack_paragraphs(text, max_chars, overlap_chars):
            chunks.append(
                Chunk(
                    id=f"{document.slug}-{len(chunks) + 1:03d}",
                    doc_slug=document.slug,
                    doc_title=document.title,
                    doc_type=document.type,
                    section=SEPARATOR.join(path),
                    text=piece,
                )
            )
    return chunks
