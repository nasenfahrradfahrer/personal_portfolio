import json

import numpy as np
import pytest

from app.knowledge.index import BM25, IndexMissingError, KnowledgeBase, build_index, tokenize
from app.knowledge.techstack import load_techstack

from .conftest import FakeEmbedder, make_settings, write_doc


def test_tokenize_splits_compound_names_and_drops_stopwords():
    tokens = tokenize("Hat er GroundingDINO und PyTorch genutzt?")
    assert {"groundingdino", "grounding", "dino", "pytorch", "py", "torch", "genutzt"} <= set(tokens)
    assert "und" not in tokens and "er" not in tokens


def test_bm25_ignores_terms_found_in_most_sections():
    corpus = [["erfahrung", f"tool{i}"] for i in range(12)] + [["erfahrung", "opencv", "bilder"]]
    bm25 = BM25(corpus)
    assert "erfahrung" in bm25.common
    scores = bm25.scores(["erfahrung", "bilder"])
    assert scores.argmax() == 12 and np.count_nonzero(scores) == 1  # nur der Abschnitt mit "bilder" zählt


def test_bm25_small_corpus_keeps_all_terms():
    bm25 = BM25([["erfahrung", "python"], ["erfahrung", "java"]])
    assert not bm25.common
    assert bm25.scores(["python"])[0] > 0  # IDF bleibt auch hier positiv


def test_build_index_respects_public_and_mode(knowledge):
    settings = make_settings(knowledge, TECHSTACK_PATH=str(knowledge / "techstack.json"))
    report = build_index(settings, progress=lambda _: None)

    assert report.context_docs == ["profil.md", "techstack.json (Übersicht)"]
    assert any(name.startswith("masterarbeit.md") for name in report.retrieve_docs)
    assert report.skipped == ["geheim.md (public: false)"]

    context = json.loads((settings.index_dir / "context.json").read_text(encoding="utf-8"))
    assert "interne Notiz" not in context[0]["text"]  # HTML-Kommentare gehen nicht an das Modell
    chunks = json.loads((settings.index_dir / "chunks.json").read_text(encoding="utf-8"))
    assert all("Noch nicht freigegeben" not in chunk["text"] for chunk in chunks)
    assert not (settings.index_dir / "vectors.npy").exists()  # ohne Embedder nur Stichwortsuche


def test_build_index_warns_about_personal_data(tmp_path):
    settings = make_settings(tmp_path)
    write_doc(settings.documents_dir, "cv.md", "public: true", "Geboren am 1.1.1990 in Musterstadt.\n")
    report = build_index(settings, progress=lambda _: None)
    assert any("Geburtsdatum" in warning for warning in report.warnings)


def test_keyword_search_finds_relevant_section(knowledge):
    settings = make_settings(knowledge)
    build_index(settings, progress=lambda _: None)
    kb = KnowledgeBase.load(settings.index_dir)
    hits = kb.search("Welche Genauigkeit hat das Modell erreicht?", k=3)
    assert hits[0].chunk.title == "Masterarbeit › 2 Ergebnisse"
    assert hits[0].similarity is None


def test_hybrid_search_with_embeddings(knowledge):
    settings = make_settings(knowledge, TECHSTACK_PATH=str(knowledge / "techstack.json"))
    report = build_index(settings, embedder=FakeEmbedder(), progress=lambda _: None)
    assert report.windows > 0

    kb = KnowledgeBase.load(settings.index_dir, lambda _name: FakeEmbedder(), min_similarity=0.1)
    assert kb.embedder is not None
    hits = kb.search("GroundingDINO Objekte finden", k=2)
    assert hits[0].chunk.id == "techstack-dino"  # Stichwort- und Bedeutungssuche treffen beide
    assert hits[0].similarity > 0.3 and hits[0].keyword_score > 0


def test_index_built_with_other_model_is_rejected(knowledge):
    settings = make_settings(knowledge)
    build_index(settings, embedder=FakeEmbedder(), progress=lambda _: None)

    class OtherEmbedder(FakeEmbedder):
        model_name = "other-model"

    with pytest.raises(IndexMissingError, match="neu bauen"):
        KnowledgeBase.load(settings.index_dir, lambda _name: OtherEmbedder())


def test_missing_index(tmp_path):
    with pytest.raises(IndexMissingError):
        KnowledgeBase.load(tmp_path / "nichts")


def test_load_techstack(knowledge):
    overview, chunks = load_techstack(knowledge / "techstack.json")
    assert "## AI & Data Science (3 Jahre)" in overview.text
    assert "  - GroundingDINO (1 Jahr)" in overview.text
    dino = next(chunk for chunk in chunks if chunk.id == "techstack-dino")
    assert dino.section == "AI & Data Science › PyTorch › GroundingDINO"
    assert "Erfahrung: 1 Jahr" in dino.text
    web = next(chunk for chunk in chunks if chunk.id == "techstack-web")
    assert "Frontends & Backends." in web.text  # HTML entfernt, Entities aufgelöst
    assert "Projekte" not in web.text


def test_load_techstack_lists_visible_projects_in_given_order(knowledge):
    _, chunks = load_techstack(knowledge / "techstack.json")
    pytorch = next(chunk for chunk in chunks if chunk.id == "techstack-pytorch")
    assert "Projekte: Masterarbeit, Diese Webseite" in pytorch.text  # Reihenfolge aus "projects"
    dino = next(chunk for chunk in chunks if chunk.id == "techstack-dino")
    assert "Projekte" not in dino.text and "Geheim" not in dino.text  # verstecktes Projekt fehlt


def test_load_techstack_rejects_unknown_project(tmp_path):
    path = tmp_path / "techstack.json"
    data = {"projects": [], "entries": [{"id": "x", "name": "X", "parent": None, "projects": ["tippfehler"]}]}
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError, match="tippfehler"):
        load_techstack(path)
