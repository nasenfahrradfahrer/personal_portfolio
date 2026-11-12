"""Tech-Stack der Webseite (techstack.json im privaten Repo): für die Wissensbasis und fürs Frontend.

So stammen Webseite und Chatbot aus derselben Quelle: Eine Übersicht aller Technologien
geht immer mit, die Beschreibungen der einzelnen Einträge werden per Suche gefunden. Das
Frontend holt dieselben Daten samt Übersetzungen (techstack.<sprache>.json) über
GET /api/techstack (siehe load_public_techstack).

Aufbau der Datei: {"projects": [{id, name, hidden?}], "entries": [{id, name, years, parent,
content, projects: [Projekt-IDs]}]}. Projekte mit "hidden": true erscheinen nirgends.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

from .chunking import SEPARATOR, Chunk
from .documents import ContextDoc

TAG_RE = re.compile(r"<[^>]+>")


def html_to_text(value: str) -> str:
    text = re.sub(r"</p>\s*<p>|<br\s*/?>", "\n", value or "", flags=re.I)
    return html.unescape(TAG_RE.sub("", text)).strip()


def plain_name(name: str) -> str:
    return str(name).replace("/\n", "/").replace("\n", " ")


def format_years(years: float | int | None) -> str | None:
    if not isinstance(years, (int, float)):
        return None
    number = f"{years:g}".replace(".", ",")
    return f"{number} {'Jahr' if years == 1 else 'Jahre'}"


def project_names(data: dict) -> dict[str, list[str]]:
    """Ordnet jedem Eintrag die Namen seiner sichtbaren Projekte zu (Reihenfolge wie in "projects")."""
    projects = data.get("projects", [])
    known = {project["id"] for project in projects}
    visible = [project for project in projects if not project.get("hidden")]
    names = {}
    for entry in data["entries"]:
        ids = set(entry.get("projects", []))
        unknown = ids - known
        if unknown:
            raise ValueError(f"Tech-Stack-Eintrag {entry['id']!r}: unbekannte Projekte {sorted(unknown)}")
        names[entry["id"]] = [project["name"] for project in visible if project["id"] in ids]
    return names


def load_techstack(path: Path) -> tuple[ContextDoc | None, list[Chunk]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]
    projects_of = project_names(data)
    by_id = {entry["id"]: entry for entry in entries}
    children: dict[str | None, list[dict]] = {}
    for entry in entries:
        children.setdefault(entry.get("parent"), []).append(entry)

    def trail(entry: dict) -> list[str]:
        names = []
        while entry is not None:
            names.append(plain_name(entry["name"]))
            entry = by_id.get(entry.get("parent"))
        return list(reversed(names))

    lines = [
        "Übersicht aller Technologien aus dem Tech-Stack der Webseite, gegliedert nach Bereichen. "
        "Erfahrung in Jahren, wie im Profil angegeben.",
    ]

    def describe(entry: dict, depth: int) -> None:
        years = format_years(entry.get("years"))
        label = plain_name(entry["name"]) + (f" ({years})" if years else "")
        lines.append(f"{'  ' * depth}- {label}")
        for child in children.get(entry["id"], []):
            describe(child, depth + 1)

    for root in children.get(None, []):
        years = format_years(root.get("years"))
        lines.append(f"\n## {plain_name(root['name'])}" + (f" ({years})" if years else ""))
        for child in children.get(root["id"], []):
            describe(child, 0)

    overview = ContextDoc(slug="techstack", title="Tech-Stack – Übersicht", type="Tech-Stack", text="\n".join(lines).strip())

    chunks = []
    for entry in entries:
        path_names = trail(entry)
        details = [plain_name(entry["name"])]
        if len(path_names) > 1:
            details.append("Bereich: " + SEPARATOR.join(path_names[:-1]))
        years = format_years(entry.get("years"))
        if years:
            details.append(f"Erfahrung: {years}")
        description = html_to_text(entry.get("content", ""))
        if description:
            details.append(description)
        if projects_of[entry["id"]]:
            details.append("Projekte: " + ", ".join(projects_of[entry["id"]]))
        chunks.append(
            Chunk(
                id=f"techstack-{entry['id']}",
                doc_slug="techstack",
                doc_title="Tech-Stack",
                doc_type="Tech-Stack",
                section=SEPARATOR.join(path_names),
                text="\n".join(details),
            )
        )
    return overview, chunks


def public_techstack(data: dict, translations: dict[str, dict]) -> dict:
    """Daten für das Frontend. Versteckte Projekte fehlen ganz, auch in Einträgen und Übersetzungen."""
    project_names(data)  # prüft die Projekt-IDs
    hidden = {project["id"] for project in data.get("projects", []) if project.get("hidden")}
    projects = [
        {key: value for key, value in project.items() if key != "hidden"}
        for project in data.get("projects", [])
        if project["id"] not in hidden
    ]
    entries = []
    for entry in data["entries"]:
        if "projects" in entry:
            entry = {**entry, "projects": [pid for pid in entry["projects"] if pid not in hidden]}
        entries.append(entry)
    texts = {}
    for language, translation in translations.items():
        names = {pid: name for pid, name in translation.get("projects", {}).items() if pid not in hidden}
        texts[language] = {"projects": names, "entries": translation.get("entries", {})}
    return {"projects": projects, "entries": entries, "texts": texts}


def load_public_techstack(path: Path, translation_paths: dict[str, Path]) -> dict:
    """Liest techstack.json und alle vorhandenen Übersetzungen. Fehlende Übersetzungen sind kein Fehler."""
    data = json.loads(path.read_text(encoding="utf-8"))
    translations = {
        language: json.loads(translation.read_text(encoding="utf-8"))
        for language, translation in translation_paths.items()
        if translation.exists()
    }
    return public_techstack(data, translations)
