"""Index der Wissensbasis: Aufbau (build-index) und Suche (zur Laufzeit).

Gespeichert wird in knowledge/index/:
- meta.json      Zeitpunkt, Embedding-Modell, Dokumentliste
- context.json   Dokumente mit mode: context (gehen immer vollständig mit)
- chunks.json    Abschnitte der Dokumente mit mode: retrieve
- vectors.npy    Embeddings der Suchfenster (optional)
- windows.npy    Zuordnung Suchfenster -> Chunk
"""

from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from ..config import Settings
from .chunking import Chunk, chunk_document
from .documents import ContextDoc, load_documents
from .embeddings import Embedder, make_windows
from .privacy import find_confidentiality_notice, find_personal_data
from .techstack import load_techstack

INDEX_VERSION = 1
RRF_K = 60
DENSE_CANDIDATES = 50

log = logging.getLogger(__name__)

STOPWORDS = set(
    """
    der die das den dem des ein eine einer eines einem einen und oder aber auch als am an auf aus bei bin bis
    da dass du er es für hat hatte hast habe haben ich ihr im in ist ja kann mit nach nicht noch nur ob ohne sein
    sich sie sind so über um uns von vor war was welche welcher welches wer wie wir wird wo zu zum zur sehr mehr
    the a an and or of to in on for with is are was were be been has have had do does did what which who how
    his her their its it this that these those at by from as about any
    """.split()
)


def tokenize(text: str) -> list[str]:
    """Wörter für die Stichwortsuche; zusammengesetzte Namen zusätzlich in Teilen (GroundingDINO -> grounding, dino)."""
    tokens: list[str] = []
    for word in re.findall(r"\w+", text):
        lower = word.lower()
        if len(lower) > 1 and lower not in STOPWORDS:
            tokens.append(lower)
        parts = re.findall(r"[A-ZÄÖÜ]?[a-zäöüß]+|[A-ZÄÖÜ]+(?![a-zäöüß])|\d+", word)
        if len(parts) > 1:
            tokens.extend(p.lower() for p in parts if len(p) > 1 and p.lower() not in STOPWORDS)
    return tokens


class BM25:
    """Stichwortsuche nach BM25 mit der IDF-Variante von Lucene.

    Die IDF ist immer positiv – auch in kleinen Wissensbasen, in denen ein Begriff in mehr
    als der Hälfte der Abschnitte vorkommt (dort liefert die klassische Formel negative Werte).
    Ab einer gewissen Größe werden solche Allerweltswörter (z. B. "Erfahrung", das in jedem
    Tech-Stack-Eintrag steht) bei der Suche ignoriert, damit sie die Rangfolge nicht verrauschen.
    """

    COMMON_TERM_SHARE = 0.5
    COMMON_TERM_MIN_DOCS = 10

    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.term_counts = [Counter(doc) for doc in corpus]
        self.doc_len = np.array([len(doc) for doc in corpus], dtype=np.float64)
        avgdl = float(self.doc_len.mean()) if len(corpus) else 1.0
        self.norm = k1 * (1 - b + b * self.doc_len / max(avgdl, 1e-9))
        self.doc_freq = Counter(term for doc in corpus for term in set(doc))
        n = len(corpus)
        self.idf = {term: math.log(1 + (n - freq + 0.5) / (freq + 0.5)) for term, freq in self.doc_freq.items()}
        self.common = (
            {term for term, freq in self.doc_freq.items() if freq / n > self.COMMON_TERM_SHARE}
            if n >= self.COMMON_TERM_MIN_DOCS
            else set()
        )

    def scores(self, query: list[str]) -> np.ndarray:
        result = np.zeros(len(self.term_counts), dtype=np.float64)
        for term in set(query):
            idf = self.idf.get(term)
            if idf is None or term in self.common:
                continue
            tf = np.array([counts.get(term, 0) for counts in self.term_counts], dtype=np.float64)
            result += idf * tf * (self.k1 + 1) / (tf + self.norm)
        return result


@dataclass
class BuildReport:
    context_docs: list[str] = field(default_factory=list)
    retrieve_docs: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    chunks: int = 0
    windows: int = 0
    context_chars: int = 0

    @property
    def context_tokens_estimate(self) -> int:
        return self.context_chars // 3


def build_index(
    settings: Settings,
    embedder: Embedder | None = None,
    progress: Callable[[str], None] = print,
) -> BuildReport:
    report = BuildReport()
    documents, errors = load_documents(settings.documents_dir)
    report.errors = [f"{path.name}: {message}" for path, message in errors]

    context_docs: list[ContextDoc] = []
    chunks: list[Chunk] = []

    for doc in documents:
        if not doc.public:
            report.skipped.append(f"{doc.path.name} (public: false)")
            continue
        if not doc.body:
            report.skipped.append(f"{doc.path.name} (leer)")
            continue
        for finding in find_confidentiality_notice(doc.body):
            report.warnings.append(f"{doc.path.name}:{finding.line} Hinweis auf Vertraulichkeit: {finding.excerpt}")
        for finding in find_personal_data(doc.body):
            report.warnings.append(f"{doc.path.name}:{finding.line} {finding.kind}? {finding.excerpt}")
        if doc.mode == "context":
            context_docs.append(ContextDoc(slug=doc.slug, title=doc.title, type=doc.type, text=doc.body))
            report.context_docs.append(doc.path.name)
        else:
            doc_chunks = chunk_document(doc, settings.chunk_max_chars, settings.chunk_overlap_chars)
            chunks.extend(doc_chunks)
            report.retrieve_docs.append(f"{doc.path.name} ({len(doc_chunks)} Abschnitte)")

    if settings.techstack_path and settings.techstack_path.exists():
        overview, stack_chunks = load_techstack(settings.techstack_path)
        if overview:
            context_docs.append(overview)
            report.context_docs.append(f"{settings.techstack_path.name} (Übersicht)")
        chunks.extend(stack_chunks)
        report.retrieve_docs.append(f"{settings.techstack_path.name} ({len(stack_chunks)} Einträge)")
    elif settings.techstack_path:
        report.warnings.append(f"Tech-Stack nicht gefunden: {settings.techstack_path}")

    report.chunks = len(chunks)
    report.context_chars = sum(len(doc.text) for doc in context_docs)
    if report.context_tokens_estimate > 30_000:
        report.warnings.append(
            f"Dokumente mit mode: context ergeben ca. {report.context_tokens_estimate} Tokens pro Anfrage. "
            "Lange Texte besser auf mode: retrieve umstellen."
        )

    window_texts: list[str] = []
    window_chunk: list[int] = []
    for index, chunk in enumerate(chunks):
        for window in make_windows(chunk.search_text):
            window_texts.append(window)
            window_chunk.append(index)

    vectors = None
    if embedder is not None and window_texts:
        progress(f"Berechne Embeddings für {len(window_texts)} Suchfenster mit {embedder.model_name} …")
        vectors = embedder.embed_passages(window_texts)
        report.windows = len(window_texts)

    index_dir = settings.index_dir
    index_dir.mkdir(parents=True, exist_ok=True)
    for stale in ("vectors.npy", "windows.npy"):
        (index_dir / stale).unlink(missing_ok=True)
    meta = {
        "version": INDEX_VERSION,
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "embedding_model": embedder.model_name if (embedder is not None and vectors is not None) else None,
        "documents": report.context_docs + report.retrieve_docs,
    }
    (index_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (index_dir / "context.json").write_text(
        json.dumps([asdict(doc) for doc in context_docs], ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (index_dir / "chunks.json").write_text(
        json.dumps([chunk.to_dict() for chunk in chunks], ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if vectors is not None:
        np.save(index_dir / "vectors.npy", vectors.astype(np.float32))
        np.save(index_dir / "windows.npy", np.asarray(window_chunk, dtype=np.int32))
    return report


@dataclass(frozen=True)
class SearchHit:
    chunk: Chunk
    score: float
    keyword_score: float
    similarity: float | None


class IndexMissingError(RuntimeError):
    pass


class KnowledgeBase:
    def __init__(
        self,
        context_docs: list[ContextDoc],
        chunks: list[Chunk],
        vectors: np.ndarray | None = None,
        window_chunk: np.ndarray | None = None,
        embedder: Embedder | None = None,
        min_similarity: float = 0.3,
        meta: dict | None = None,
    ):
        self.context_docs = context_docs
        self.chunks = chunks
        self.vectors = vectors
        self.window_chunk = window_chunk
        self.embedder = embedder if vectors is not None else None
        self.min_similarity = min_similarity
        self.meta = meta or {}
        self._bm25 = BM25([tokenize(c.search_text) for c in chunks]) if chunks else None

    @classmethod
    def load(
        cls,
        index_dir: Path,
        embedder_factory: Callable[[str], Embedder] | None = None,
        min_similarity: float = 0.3,
    ) -> KnowledgeBase:
        meta_path = index_dir / "meta.json"
        if not meta_path.exists():
            raise IndexMissingError(f"Kein Index in {index_dir}. Zuerst `python -m app.cli build-index` ausführen.")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        context_docs = [ContextDoc(**doc) for doc in json.loads((index_dir / "context.json").read_text(encoding="utf-8"))]
        chunks = [Chunk(**chunk) for chunk in json.loads((index_dir / "chunks.json").read_text(encoding="utf-8"))]

        vectors = window_chunk = embedder = None
        model_name = meta.get("embedding_model")
        if model_name and (index_dir / "vectors.npy").exists():
            if embedder_factory is None:
                log.warning("Index enthält Embeddings, aber EMBEDDING_MODEL=none – nur Stichwortsuche aktiv.")
            else:
                vectors = np.load(index_dir / "vectors.npy")
                window_chunk = np.load(index_dir / "windows.npy")
                embedder = embedder_factory(model_name)
                if embedder.model_name != model_name:
                    raise IndexMissingError(
                        f"Index wurde mit {model_name} gebaut, konfiguriert ist {embedder.model_name}. "
                        "Index neu bauen (`python -m app.cli build-index`)."
                    )
        return cls(context_docs, chunks, vectors, window_chunk, embedder, min_similarity, meta)

    def search(self, query: str, k: int = 6) -> list[SearchHit]:
        """Hybride Suche: Stichwörter (BM25) und Bedeutung (Embeddings), kombiniert per Reciprocal Rank Fusion."""
        if not self.chunks or not query.strip():
            return []
        n = len(self.chunks)
        fused = np.zeros(n, dtype=np.float64)

        keyword = np.zeros(n)
        tokens = tokenize(query)
        if tokens and self._bm25 is not None:
            keyword = self._bm25.scores(tokens)
            ranked = [i for i in np.argsort(-keyword) if keyword[i] > 0]
            for rank, i in enumerate(ranked):
                fused[i] += 1.0 / (RRF_K + rank + 1)

        similarity = None
        if self.embedder is not None and self.vectors is not None and self.window_chunk is not None:
            query_vector = self.embedder.embed_query(query)
            window_scores = self.vectors @ query_vector
            similarity = np.full(n, -1.0)
            np.maximum.at(similarity, self.window_chunk, window_scores)
            ranked = [i for i in np.argsort(-similarity)[:DENSE_CANDIDATES] if similarity[i] >= self.min_similarity]
            for rank, i in enumerate(ranked):
                fused[i] += 1.0 / (RRF_K + rank + 1)

        order = [i for i in np.argsort(-fused) if fused[i] > 0][:k]
        return [
            SearchHit(
                chunk=self.chunks[i],
                score=float(fused[i]),
                keyword_score=float(keyword[i]),
                similarity=float(similarity[i]) if similarity is not None else None,
            )
            for i in order
        ]
