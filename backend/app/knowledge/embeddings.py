"""Lokale Embeddings mit fastembed (ONNX, läuft auf der CPU, keine Daten an Dritte).

Das Standardmodell liest nur ~128 Tokens pro Text. Damit nichts unbemerkt abgeschnitten
wird, wird jeder Chunk in kurze, überlappende Fenster zerlegt; ein Chunk ist so relevant
wie sein bestes Fenster.
"""

from __future__ import annotations

import os
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Protocol

import numpy as np

if TYPE_CHECKING:
    from ..config import Settings

WINDOW_CHARS = 320
WINDOW_STRIDE = 200


class Embedder(Protocol):
    model_name: str

    def embed_passages(self, texts: list[str]) -> np.ndarray: ...

    def embed_query(self, text: str) -> np.ndarray: ...


def normalize(vectors: np.ndarray) -> np.ndarray:
    vectors = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
    return vectors / np.maximum(norms, 1e-12)


def make_windows(text: str, size: int = WINDOW_CHARS, stride: int = WINDOW_STRIDE) -> list[str]:
    """Zerlegt Text in überlappende Fenster, möglichst an Wortgrenzen."""
    text = " ".join(text.split())
    if len(text) <= size:
        return [text]
    windows = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            space = text.rfind(" ", start + size // 2, end)
            end = space if space > start else end
        windows.append(text[start:end].strip())
        if end >= len(text):
            break
        next_start = start + stride
        space = text.find(" ", next_start)
        start = space + 1 if 0 <= space < end else next_start
    return [w for w in windows if w]


class FastEmbedEmbedder:
    def __init__(self, model_name: str, cache_dir: Path):
        # Windows ohne Entwicklermodus kann keine Symlinks – der Cache funktioniert trotzdem
        os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
        from fastembed import TextEmbedding  # erst hier laden: groß und optional

        cache_dir.mkdir(parents=True, exist_ok=True)
        self.model_name = model_name
        self._model = TextEmbedding(model_name=model_name, cache_dir=str(cache_dir))

    def embed_passages(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 0), dtype=np.float32)
        return normalize(np.array(list(self._model.passage_embed(texts, batch_size=32))))

    def embed_query(self, text: str) -> np.ndarray:
        return normalize(np.array(list(self._model.query_embed(text)))[0])


def embedder_factory(settings: Settings) -> Callable[[str], Embedder] | None:
    """Liefert das konfigurierte Embedding-Modell; KnowledgeBase.load prüft, ob es zum Index passt."""
    if not settings.embedding_model:
        return None
    return lambda _index_model: FastEmbedEmbedder(settings.embedding_model, settings.embedding_cache_dir)
