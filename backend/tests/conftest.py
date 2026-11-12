"""Gemeinsame Hilfsmittel für die Tests. Kein Test ruft die echte API auf oder lädt Modelle herunter."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import numpy as np
import pytest

from app.config import Settings, load_settings
from app.knowledge.embeddings import normalize
from app.llm import Finished, TextDelta


class FakeEmbedder:
    """Wort-Hashing statt echter Embeddings: gleiche Wörter -> ähnliche Vektoren."""

    model_name = "fake-embedder"
    dim = 256

    def _vector(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dim, dtype=np.float32)
        for word in re.findall(r"\w+", text.lower()):
            vector[int(hashlib.md5(word.encode()).hexdigest(), 16) % self.dim] += 1
        return vector

    def embed_passages(self, texts: list[str]) -> np.ndarray:
        return normalize(np.array([self._vector(t) for t in texts]))

    def embed_query(self, text: str) -> np.ndarray:
        return normalize(self._vector(text))


class FakeLLM:
    """Ersetzt Claude: liefert vorgegebene Ereignisse und merkt sich die Anfragen."""

    def __init__(self, events: list | None = None, usage: dict | None = None):
        self.events = events if events is not None else [TextDelta("Hallo "), TextDelta("Welt."), Finished("end_turn", "fake")]
        self.usage = usage or {"input_tokens": 1000, "output_tokens": 100}
        self.calls: list[dict] = []

    async def stream(self, *, system, messages, on_usage):
        self.calls.append({"system": system, "messages": messages})
        for event in self.events:
            if isinstance(event, Exception):
                raise event
            yield event
        on_usage(self.usage)


def make_settings(tmp_path: Path, **overrides: str) -> Settings:
    env = {
        "ANTHROPIC_API_KEY": "test-key",
        "CHAT_SIGNING_SECRET": "test-secret",
        "KNOWLEDGE_DIR": str(tmp_path / "knowledge"),
        "INDEX_DIR": str(tmp_path / "knowledge" / "index"),
        "DATA_DIR": str(tmp_path / "data"),
        "TECHSTACK_PATH": "none",
        "EMBEDDING_MODEL": "none",
        "OWNER_NAME": "Erika Muster",
        "RATE_LIMIT_PER_MINUTE": "100",
        "RATE_LIMIT_PER_DAY": "1000",
    }
    env.update(overrides)
    return load_settings(environ=env)


def write_doc(directory: Path, name: str, front_matter: str, body: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / name
    path.write_text(f"---\n{front_matter.strip()}\n---\n{body}", encoding="utf-8")
    return path


TECHSTACK = {
    "projects": [
        {"id": "thesis", "name": "Masterarbeit"},
        {"id": "site", "name": "Diese Webseite"},
        {"id": "secret", "name": "Geheimes Paper", "hidden": True},
    ],
    "entries": [
        {"id": "ai", "name": "AI &\nData Science", "years": 3, "parent": None, "content": "<p>Modelle trainieren.</p>"},
        {
            "id": "pytorch",
            "name": "PyTorch",
            "years": 2.5,
            "parent": "ai",
            "content": "<p>Training mit <strong>PyTorch</strong>.</p>",
            "projects": ["site", "secret", "thesis"],
        },
        {
            "id": "dino",
            "name": "GroundingDINO",
            "years": 1,
            "parent": "pytorch",
            "content": "<p>Objekte per Text finden.</p>",
            "projects": ["secret"],
        },
        {"id": "web", "name": "Web-Entwicklung", "years": 1, "parent": None, "content": "<p>Frontends &amp; Backends.</p>"},
    ],
}


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture
def knowledge(tmp_path: Path) -> Path:
    """Kleine Wissensbasis: Profil (context), Masterarbeit (retrieve), privates Dokument, Tech-Stack."""
    documents = tmp_path / "knowledge" / "documents"
    write_doc(
        documents,
        "profil.md",
        "title: Profil\ntype: Profil\nmode: context\npublic: true",
        "# Profil\n\nErika Muster ist Data Scientist in Erfurt.\n<!-- interne Notiz -->\n",
    )
    write_doc(
        documents,
        "masterarbeit.md",
        "title: Masterarbeit\ntype: Abschlussarbeit\nmode: retrieve\npublic: true",
        "# Masterarbeit\n\n## 1 Einleitung\n\nDie Arbeit untersucht die Auswahl informativer Frames in Videos.\n\n"
        "## 2 Ergebnisse\n\nDas Modell erreicht eine Genauigkeit von 91 Prozent auf dem Testdatensatz.\n",
    )
    write_doc(
        documents,
        "geheim.md",
        "title: Entwurf\nmode: retrieve\npublic: false",
        "Noch nicht freigegeben.\n",
    )
    techstack = tmp_path / "techstack.json"
    techstack.write_text(json.dumps(TECHSTACK), encoding="utf-8")
    return tmp_path
