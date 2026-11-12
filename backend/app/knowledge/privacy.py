"""Warnungen für Inhalte, die nicht öffentlich werden sollten.

Alles in der Wissensbasis kann der Chatbot jedem Besucher wiedergeben. Diese Prüfung
findet typische personenbezogene Daten und Hinweise auf Vertraulichkeit. Sie ist eine
Hilfe, kein Ersatz für das eigene Durchlesen.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

CONFIDENTIAL_RE = re.compile(
    r"sperrvermerk|vertraulich|geheimhaltung|nicht\s+zur\s+veröffentlichung|confidential|non[-\s]?disclosure",
    re.I,
)

PERSONAL_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Geburtsdatum/-ort", re.compile(r"\b(geboren(\s+am)?|geb\.|geburtsdatum|geburtsort|date\s+of\s+birth|born\s+on)\b", re.I)),
    ("Telefonnummer", re.compile(r"(?:\+|\b00)\d{2}[\s/-]?\(?\d{2,5}\)?[\s/-]?\d{3,}|\b0\d{2,5}[\s/-]\d{4,}\b")),
    ("E-Mail-Adresse", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("IBAN", re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b")),
    ("Anschrift", re.compile(r"\b[A-ZÄÖÜ][a-zäöüß-]+(?:straße|strasse|str\.|weg|allee|platz|gasse|ring)\s+\d+", re.I)),
    ("Matrikel-/Ausweisnummer", re.compile(r"matrikel|personalausweis|reisepass|steuer-?id|sozialversicherung", re.I)),
    ("Unterschrift/Unterzeichner", re.compile(r"\b(unterschrift|gez\.|i\.\s?a\.|i\.\s?v\.|ppa\.)", re.I)),
]


@dataclass(frozen=True)
class Finding:
    kind: str
    line: int
    excerpt: str


def _mask(text: str) -> str:
    text = text.strip()
    return text if len(text) <= 60 else text[:57] + "…"


def find_personal_data(text: str) -> list[Finding]:
    findings: list[Finding] = []
    for number, line in enumerate(text.splitlines(), start=1):
        for kind, pattern in PERSONAL_PATTERNS:
            if pattern.search(line):
                findings.append(Finding(kind, number, _mask(line)))
    return findings


def find_confidentiality_notice(text: str) -> list[Finding]:
    return [
        Finding("Vertraulichkeit", number, _mask(line))
        for number, line in enumerate(text.splitlines(), start=1)
        if CONFIDENTIAL_RE.search(line)
    ]
