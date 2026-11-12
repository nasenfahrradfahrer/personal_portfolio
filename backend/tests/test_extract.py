from app.knowledge import extract
from app.knowledge.extract import (
    build_draft,
    drop_noise_sections,
    extract_text_file,
    lines_to_markdown,
    remove_headers_footers,
)
from app.knowledge.privacy import find_personal_data


def test_lines_to_markdown_joins_lines_and_dehyphenates():
    lines = [
        "Diese Arbeit untersucht die Klassifika-",
        "tion von Bienen mit Machine-",
        "Learning und erzielt gute Ergebnisse.",
    ]
    assert lines_to_markdown(lines) == "Diese Arbeit untersucht die Klassifikation von Bienen mit Machine-Learning und erzielt gute Ergebnisse."


def test_lines_to_markdown_detects_headings_lists_and_page_numbers():
    lines = ["1 Einleitung", "Ein Satz.", "", "2.1 Daten und Methoden", "• erster Punkt", "• zweiter Punkt", "17", "Seite 3 von 9"]
    markdown = lines_to_markdown(lines)
    assert "## 1 Einleitung" in markdown
    assert "### 2.1 Daten und Methoden" in markdown
    assert "- erster Punkt\n\n- zweiter Punkt" in markdown
    assert "17" not in markdown and "Seite 3" not in markdown


def test_toc_lines_with_dot_leaders_are_removed():
    markdown = lines_to_markdown(["1 Einleitung .......... 3", "2 Ergebnisse . . . . . . 12"])
    assert markdown == ""


def test_drop_noise_sections_removes_bibliography_and_appendix():
    markdown = "## 1 Einleitung\n\nText\n\n## Literaturverzeichnis\n\n[1] Quelle\n\n## Anhang\n\nCode\n\n## 2 Ergebnisse\n\nMehr"
    cleaned, removed = drop_noise_sections(markdown)
    assert "Quelle" not in cleaned and "Code" not in cleaned
    assert "## 2 Ergebnisse" in cleaned
    assert removed == ["Literaturverzeichnis", "Anhang"]


def test_remove_headers_footers():
    topics = ["Daten", "Modelle", "Training", "Ergebnisse", "Fazit", "Ausblick"]
    pages = [["Masterarbeit Felix", f"Kapitel über {topic}", f"Hochschule X – Seite {i}"] for i, topic in enumerate(topics)]
    cleaned = remove_headers_footers(pages)
    assert cleaned == [[f"Kapitel über {topic}"] for topic in topics]


def test_scanned_pdf_is_detected(monkeypatch, tmp_path):
    monkeypatch.setattr(extract, "extract_pdf_text", lambda path: [[""], ["  "], ["3"]])
    result = extract.extract_pdf(tmp_path / "scan.pdf")
    assert result.looks_scanned
    assert any("Scan" in warning for warning in result.warnings)


def test_confidentiality_notice_is_flagged(monkeypatch, tmp_path):
    pages = [["Sperrvermerk", "Diese Arbeit enthält vertrauliche Daten."], ["1 Einleitung", "Text " * 40]]
    monkeypatch.setattr(extract, "extract_pdf_text", lambda path: pages)
    result = extract.extract_pdf(tmp_path / "thesis.pdf")
    assert result.confidential
    draft = build_draft(result, title="Thesis", doc_type="Abschlussarbeit", mode="retrieve", source_name="thesis.pdf")
    assert "public: false" in draft
    assert "WARNUNG" in draft and "Sperrvermerk" in draft


def test_employer_reference_txt_gets_warning(tmp_path):
    path = tmp_path / "arbeitszeugnis_firma.txt"
    path.write_text("Herr Muster war stets zu unserer vollsten Zufriedenheit tätig.\nMax Chef, Geschäftsführer", encoding="cp1252")
    result = extract_text_file(path)
    assert "Zufriedenheit" in result.markdown
    assert any("Arbeitszeugnis" in warning for warning in result.warnings)


def test_find_personal_data():
    text = "Geboren am 01.01.1990\nTel.: +49 361 1234567\nmail@example.com\nMusterstraße 5\nNur Text"
    kinds = {finding.kind for finding in find_personal_data(text)}
    assert {"Geburtsdatum/-ort", "Telefonnummer", "E-Mail-Adresse", "Anschrift"} <= kinds
