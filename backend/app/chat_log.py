"""Protokoll der Gespräche mit dem Assistenten (LOG_CHATS=true), um ihn zu verbessern.

Gespeichert wird je beantworteter Frage (kind "chat"): Datum, Gespräch (siehe conversation_id), Nummer
der Frage im Gespräch, Sprache der Seite, Frage, Antwort, genutzte Quellen und Abbruchgrund. Bewertet
jemand eine Antwort, kommt eine Zeile mit kind "rating" dazu (Gespräch, Nummer, "up"/"down"; bei
mehreren Bewertungen derselben Antwort gilt die letzte). Keine IP-Adressen.
Einträge älter als LOG_RETENTION_DAYS werden automatisch gelöscht. So steht es in der
Datenschutzerklärung (frontend/src/pages/Privacy.jsx); wer hier etwas ändert, muss sie anpassen.
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

log = logging.getLogger(__name__)


def conversation_id(first_question: str, first_answer: str) -> str:
    """Ordnet die Fragen eines Gesprächs einander zu, ohne dem Browser eine Kennung zu geben.

    Erste Frage und erste Antwort stehen in jedem weiteren (signierten) Verlauf unverändert am Anfang.
    """
    payload = json.dumps([first_question, first_answer], ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _entry_date(line: str) -> str:
    try:
        return json.loads(line).get("date", "")
    except (ValueError, AttributeError):
        return ""  # unlesbare Zeile: wird beim Aufräumen entfernt


class ChatLog:
    def __init__(self, path: Path, enabled: bool, retention_days: int):
        self.path = path
        self.enabled = enabled
        self.retention = timedelta(days=retention_days)
        self._lock = threading.Lock()
        self._pruned_on: str | None = None

    def add(
        self,
        *,
        conversation: str,
        turn: int,
        language: str,
        question: str,
        answer: str,
        sources: list[str],
        stop_reason: str | None,
    ) -> None:
        self._append(
            {
                "kind": "chat",
                "conversation": conversation,
                "turn": turn,
                "language": language,
                "question": question,
                "answer": answer,
                "sources": sources,
                "stop_reason": stop_reason,
            }
        )

    def add_rating(self, *, conversation: str, turn: int, rating: str) -> None:
        self._append({"kind": "rating", "conversation": conversation, "turn": turn, "rating": rating})

    def _append(self, fields: dict) -> None:
        if not self.enabled:
            return
        entry = {"date": datetime.now(UTC).date().isoformat(), **fields}
        with self._lock:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a", encoding="utf-8") as file:
                    file.write(json.dumps(entry, ensure_ascii=False) + "\n")
            except OSError:
                log.exception("Gesprächsprotokoll konnte nicht geschrieben werden.")
        self.prune()

    def prune(self) -> None:
        """Löscht Einträge älter als die Löschfrist; höchstens einmal am Tag, auch wenn das Protokoll aus ist."""
        today = datetime.now(UTC).date()
        if not self.path.exists() or self._pruned_on == today.isoformat():
            return
        cutoff = (today - self.retention).isoformat()
        with self._lock:
            try:
                lines = self.path.read_text(encoding="utf-8").splitlines()
                keep = [line for line in lines if _entry_date(line) >= cutoff]
                self.path.write_text("\n".join(keep) + ("\n" if keep else ""), encoding="utf-8")
            except OSError:
                log.exception("Gesprächsprotokoll konnte nicht aufgeräumt werden.")
                return
            self._pruned_on = today.isoformat()
