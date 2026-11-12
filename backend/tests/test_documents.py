import pytest

from app.knowledge.chunking import chunk_document, pack_paragraphs, split_sections
from app.knowledge.documents import DocumentError, load_documents, parse_document, slugify

from .conftest import write_doc


def test_parse_document_reads_front_matter_and_strips_comments(tmp_path):
    path = write_doc(tmp_path, "a.md", "title: Titel\ntype: Projekt\nmode: context\npublic: true", "Text <!-- weg --> bleibt\n")
    doc = parse_document(path)
    assert (doc.title, doc.type, doc.mode, doc.public) == ("Titel", "Projekt", "context", True)
    assert doc.body == "Text  bleibt"


def test_defaults_are_safe(tmp_path):
    doc = parse_document(write_doc(tmp_path, "b.md", "type: Projekt", "# Überschrift\n\nText"))
    assert doc.public is False  # ohne ausdrückliche Freigabe nie öffentlich
    assert doc.mode == "retrieve"
    assert doc.title == "Überschrift"


@pytest.mark.parametrize(
    "front_matter, message",
    [
        ("public: 'true'", "public"),
        ("mode: immer", "mode"),
        ("- liste", "Schlüssel"),
    ],
)
def test_invalid_front_matter_is_rejected(tmp_path, front_matter, message):
    with pytest.raises(DocumentError, match=message):
        parse_document(write_doc(tmp_path, "c.md", front_matter, "Text"))


def test_missing_front_matter(tmp_path):
    path = tmp_path / "d.md"
    path.write_text("Nur Text", encoding="utf-8")
    with pytest.raises(DocumentError, match="Front Matter fehlt"):
        parse_document(path)


def test_load_documents_skips_underscore_files_and_collects_errors(tmp_path):
    write_doc(tmp_path, "ok.md", "public: true", "Text")
    write_doc(tmp_path, "_notiz.md", "public: true", "Text")
    (tmp_path / "kaputt.md").write_text("ohne Front Matter", encoding="utf-8")
    documents, errors = load_documents(tmp_path)
    assert [d.slug for d in documents] == ["ok"]
    assert [p.name for p, _ in errors] == ["kaputt.md"]


def test_slugify():
    assert slugify("Masterarbeit Größe & Übung") == "masterarbeit-groesse-uebung"


def test_split_sections_builds_heading_paths():
    body = "# A\n\nText A\n\n## B\n\nText B\n\n### C\n\nText C\n\n## D\n\nText D"
    assert split_sections(body) == [
        (["A"], "Text A"),
        (["A", "B"], "Text B"),
        (["A", "B", "C"], "Text C"),
        (["A", "D"], "Text D"),
    ]


def test_pack_paragraphs_respects_limit_and_overlaps_short_paragraphs():
    text = "\n\n".join(["a" * 30, "kurz", "b" * 50])
    chunks = pack_paragraphs(text, max_chars=60, overlap_chars=10)
    assert chunks == [f"{'a' * 30}\n\nkurz", f"kurz\n\n{'b' * 50}"]  # "kurz" wird als Überlappung übernommen


def test_pack_paragraphs_does_not_carry_long_paragraphs():
    text = "\n\n".join(["a" * 30, "b" * 20, "c" * 50])
    chunks = pack_paragraphs(text, max_chars=60, overlap_chars=10)
    assert chunks == [f"{'a' * 30}\n\n{'b' * 20}", "c" * 50]


def test_pack_paragraphs_splits_overlong_paragraphs_at_sentences():
    text = " ".join(f"Satz Nummer {i} ist hier." for i in range(40))
    chunks = pack_paragraphs(text, max_chars=200, overlap_chars=0)
    assert len(chunks) > 1 and all(len(chunk) <= 200 for chunk in chunks)
    assert chunks[0].endswith(".")


def test_chunk_document_uses_section_titles(tmp_path):
    path = write_doc(tmp_path, "m.md", "title: Masterarbeit\npublic: true", "# Masterarbeit\n\n## 2 Ergebnisse\n\nGut.\n")
    chunks = chunk_document(parse_document(path))
    assert len(chunks) == 1
    assert chunks[0].title == "Masterarbeit › 2 Ergebnisse"  # oberste Überschrift = Titel, nicht doppelt
    assert chunks[0].search_text.startswith("Masterarbeit › 2 Ergebnisse\nGut.")
