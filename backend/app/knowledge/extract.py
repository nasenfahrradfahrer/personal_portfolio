"""Wandelt PDFs und Textdateien in einen Markdown-Entwurf für knowledge/documents/ um.

Der Entwurf wird nie automatisch veröffentlicht (public: false). Er soll durchgelesen,
bereinigt und erst dann freigegeben werden.
"""

from __future__ import annotations

import re
import statistics
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from .privacy import find_confidentiality_notice, find_personal_data

NUMBERED_HEADING_RE = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+([A-ZÄÖÜ][^\n]{1,90})$")
PAGE_NUMBER_RE = re.compile(r"^\s*(?:seite\s+|page\s+)?(?:\d{1,4}|[ivxlcdm]{1,6})(?:\s*(?:von|/|of)\s*\d{1,4})?\s*$", re.I)
TOC_LINE_RE = re.compile(r"(?:\.\s?){4,}\s*\d+\s*$|\s\d{1,3}\s*$")
LIST_ITEM_RE = re.compile(r"^\s*(?:[•▪◦·\-–*]|\d{1,2}[.)])\s+")

KNOWN_HEADINGS = {
    "abstract", "kurzfassung", "zusammenfassung", "einleitung", "einführung", "introduction",
    "fazit", "ausblick", "fazit und ausblick", "conclusion", "conclusions", "discussion", "diskussion",
    "inhaltsverzeichnis", "inhalt", "contents", "table of contents",
    "abbildungsverzeichnis", "list of figures", "tabellenverzeichnis", "list of tables",
    "abkürzungsverzeichnis", "abkürzungen", "abbreviations", "acronyms",
    "literaturverzeichnis", "literatur", "quellenverzeichnis", "bibliography", "references",
    "anhang", "appendix", "danksagung", "acknowledgements", "acknowledgments",
    "eidesstattliche erklärung", "selbstständigkeitserklärung", "erklärung", "declaration",
    "sperrvermerk",
}

# Abschnitte, die für Recruiter-Fragen nur stören und deshalb entfernt werden
DROP_SECTIONS = {
    "inhaltsverzeichnis", "inhalt", "contents", "table of contents",
    "abbildungsverzeichnis", "list of figures", "tabellenverzeichnis", "list of tables",
    "abkürzungsverzeichnis", "abkürzungen", "abbreviations", "acronyms",
    "literaturverzeichnis", "literatur", "quellenverzeichnis", "bibliography", "references",
    "anhang", "appendix", "danksagung", "acknowledgements", "acknowledgments",
    "eidesstattliche erklärung", "selbstständigkeitserklärung", "erklärung", "declaration",
}

REFERENCE_HINT_RE = re.compile(r"zeugnis|referenz|reference|arbeitgeber|beurteilung", re.I)


@dataclass
class ExtractResult:
    markdown: str
    pages: int = 0
    warnings: list[str] = field(default_factory=list)
    removed_sections: list[str] = field(default_factory=list)
    confidential: bool = False
    looks_scanned: bool = False


def _normalize_for_repeat(line: str) -> str:
    return re.sub(r"\d+", "#", line.strip().lower())


def remove_headers_footers(pages: list[list[str]]) -> list[list[str]]:
    """Entfernt Zeilen, die oben oder unten auf vielen Seiten gleich sind (Kopf-/Fußzeilen)."""
    if len(pages) < 4:
        return pages
    counter: Counter[str] = Counter()
    for lines in pages:
        edge = {_normalize_for_repeat(line) for line in lines[:3] + lines[-3:] if line.strip()}
        counter.update(edge)
    threshold = max(3, int(len(pages) * 0.4))
    repeated = {line for line, count in counter.items() if count >= threshold}
    cleaned = []
    for lines in pages:
        keep = []
        for index, line in enumerate(lines):
            at_edge = index < 3 or index >= len(lines) - 3
            if at_edge and _normalize_for_repeat(line) in repeated:
                continue
            keep.append(line)
        cleaned.append(keep)
    return cleaned


def _heading_markdown(line: str) -> str | None:
    stripped = line.strip()
    if len(stripped) > 100 or stripped.endswith((".", ",", ";")):
        return None
    if stripped.lower().rstrip(":") in KNOWN_HEADINGS:
        return f"## {stripped.rstrip(':')}"
    match = NUMBERED_HEADING_RE.match(stripped)
    if match and not TOC_LINE_RE.search(stripped):
        depth = match.group(1).count(".") + 1
        return f"{'#' * min(depth + 1, 6)} {match.group(1)} {match.group(2).strip()}"
    return None


def lines_to_markdown(lines: list[str]) -> str:
    """Setzt Zeilen zu Absätzen zusammen, verbindet Silbentrennungen und erkennt Überschriften."""
    content = [line.rstrip() for line in lines]
    lengths = [len(line) for line in content if len(line.strip()) > 20]
    typical = statistics.median(lengths) if lengths else 80

    blocks: list[str] = []
    paragraph = ""

    def flush() -> None:
        nonlocal paragraph
        if paragraph.strip():
            blocks.append(paragraph.strip())
        paragraph = ""

    for raw in content:
        line = raw.strip()
        if not line:
            flush()
            continue
        if PAGE_NUMBER_RE.match(line):
            continue
        if TOC_LINE_RE.search(line) and re.search(r"(?:\.\s?){4,}", line):
            continue  # Inhaltsverzeichnis-Zeile mit Punktlinie
        heading = _heading_markdown(line)
        if heading:
            flush()
            blocks.append(heading)
            continue
        if LIST_ITEM_RE.match(line):
            flush()
            paragraph = "- " + LIST_ITEM_RE.sub("", line)
            continue
        if paragraph.endswith("-") and line[:1].islower():
            paragraph = paragraph[:-1] + line  # Silbentrennung: "Informa-" + "tion"
        elif paragraph.endswith("-"):
            paragraph += line  # Bindestrich-Wort: "Machine-" + "Learning"
        else:
            paragraph = f"{paragraph} {line}".strip()
        # Kurze Zeile mit Satzende beendet in Blocksatz-Texten meist den Absatz
        if line.endswith((".", "!", "?", ":")) and len(line) < typical * 0.7:
            flush()
    flush()
    return "\n\n".join(blocks)


def drop_noise_sections(markdown: str) -> tuple[str, list[str]]:
    """Entfernt Verzeichnisse, Literatur, Anhang usw. bis zur nächsten gleich- oder höherrangigen Überschrift."""
    removed: list[str] = []
    out: list[str] = []
    drop_level: int | None = None
    for block in markdown.split("\n\n"):
        match = re.match(r"^(#{1,6})\s+(.*)$", block)
        if match:
            level = len(match.group(1))
            title = re.sub(r"^\d+(?:\.\d+)*\s+", "", match.group(2)).strip().lower()
            if drop_level is not None and level <= drop_level:
                drop_level = None
            if drop_level is None and title in DROP_SECTIONS:
                drop_level = level
                removed.append(match.group(2))
                continue
        if drop_level is None:
            out.append(block)
    return "\n\n".join(out), removed


def extract_pdf_text(path: Path) -> list[list[str]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append([line for line in text.replace("\r", "").split("\n")])
    return pages


def extract_pdf(path: Path) -> ExtractResult:
    pages = extract_pdf_text(path)
    raw_text = "\n".join("\n".join(lines) for lines in pages)
    result = ExtractResult(markdown="", pages=len(pages))

    chars_per_page = len(raw_text.strip()) / max(len(pages), 1)
    if chars_per_page < 80:
        result.looks_scanned = True
        result.warnings.append(
            "Kaum Text gefunden – vermutlich ein Scan. Die wichtigsten Fakten am besten selbst abtippen "
            "(Vorlagen in knowledge/templates/) oder vorher eine Texterkennung laufen lassen (z. B. OCRmyPDF -l deu)."
        )

    cleaned = remove_headers_footers(pages)
    markdown = lines_to_markdown([line for lines in cleaned for line in lines + [""]])
    markdown, removed = drop_noise_sections(markdown)
    result.markdown = markdown
    result.removed_sections = removed
    _check(result, raw_text)
    return result


def extract_text_file(path: Path) -> ExtractResult:
    data = path.read_bytes()
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("cp1252")
    text = text.replace("\r\n", "\n").strip()
    result = ExtractResult(markdown=text)
    if REFERENCE_HINT_RE.search(path.name) or REFERENCE_HINT_RE.search(text[:500]):
        result.warnings.append(
            "Sieht nach einem Arbeitszeugnis aus. Nicht wörtlich übernehmen: Es enthält Namen Dritter und "
            "die verschlüsselte Zeugnissprache. Besser Aufgaben und Gesamturteil in eigenen Worten "
            "zusammenfassen (Vorlage: knowledge/templates/arbeitszeugnis.md)."
        )
    _check(result, text)
    return result


def _check(result: ExtractResult, text: str) -> None:
    unreadable = result.markdown.count("�")
    if unreadable:
        result.warnings.append(
            f"{unreadable} Zeichen konnten nicht gelesen werden (im Text als �, oft Umlaute). Die PDF enthält "
            "für diese Schrift keine korrekte Zeichenzuordnung – bitte im Entwurf ersetzen."
        )
    confidential = find_confidentiality_notice(text)
    if confidential:
        result.confidential = True
        lines = ", ".join(str(f.line) for f in confidential[:5])
        result.warnings.append(
            f"Hinweis auf Vertraulichkeit/Sperrvermerk gefunden (Zeilen {lines}). Inhalt erst veröffentlichen, "
            "wenn sicher ist, dass er nicht gesperrt ist."
        )
    personal = find_personal_data(result.markdown)
    if personal:
        kinds = sorted({f.kind for f in personal})
        result.warnings.append(f"Mögliche personenbezogene Daten: {', '.join(kinds)} – vor der Freigabe prüfen.")


def build_draft(
    result: ExtractResult,
    *,
    title: str,
    doc_type: str,
    mode: str,
    source_name: str,
) -> str:
    """Erzeugt die Markdown-Datei mit Front Matter und einem Prüfhinweis."""
    notes = [
        f"Automatisch erzeugt aus {source_name}. Bitte vor der Freigabe durchlesen:",
        "- Fehler der Textextraktion korrigieren (Formeln, Tabellen, Zeilenumbrüche)",
        "- Nur Inhalte stehen lassen, die öffentlich sein dürfen",
        "- Dann oben public: true setzen und `python -m app.cli build-index` ausführen",
    ]
    if result.removed_sections:
        notes.append("Entfernte Abschnitte: " + "; ".join(result.removed_sections))
    for warning in result.warnings:
        notes.append("WARNUNG: " + warning)

    title_yaml = title.replace('"', "'")
    front_matter = "\n".join(
        [
            "---",
            f'title: "{title_yaml}"',
            f"type: {doc_type}",
            f"mode: {mode}          # context = immer im Prompt, retrieve = per Suche in Abschnitten",
            "public: false        # erst nach Prüfung auf true setzen",
            "---",
        ]
    )
    comment = "<!--\n" + "\n".join(notes) + "\n-->"
    body = result.markdown.strip() or "<!-- Kein Text erkannt – Inhalt hier selbst eintragen. -->"
    return f"{front_matter}\n{comment}\n\n{body}\n"
