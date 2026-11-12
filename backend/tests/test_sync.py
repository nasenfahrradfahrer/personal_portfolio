import shutil
import subprocess
from pathlib import Path

import pytest

from app.knowledge.sync import SyncError, fetch_knowledge

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git nicht installiert")


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def commit_file(repo: Path, name: str, text: str, message: str) -> None:
    path = repo / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    git(repo, "add", name)
    git(repo, "commit", "-q", "-m", message)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    """Privates Repo als lokales Repo mit documents/, raw/ und dem Tech-Stack im Wurzelordner."""
    repo = tmp_path / "source"
    repo.mkdir()
    git(repo, "init", "-q", "-b", "master")
    git(repo, "config", "uploadpack.allowFilter", "true")
    commit_file(repo, "documents/profil.md", "Profil v1\n", "Profil")
    commit_file(repo, "raw/zeugnis.pdf", "PDF\n", "Original")
    commit_file(repo, "techstack.json", "{}\n", "Tech-Stack")
    return repo


@pytest.fixture
def source(repo: Path) -> str:
    return repo.as_uri()  # file://, damit --depth und --filter wie bei GitHub greifen


def update_source(repo: Path, text: str) -> None:
    commit_file(repo, "documents/profil.md", text, "Update")


def test_working_copy_has_everything_and_pulls(repo, source, tmp_path):
    target = tmp_path / "private"
    assert fetch_knowledge(source, "master", target).endswith("Tech-Stack")
    assert (target / "raw" / "zeugnis.pdf").exists() and (target / "techstack.json").exists()

    update_source(repo, "Profil v2\n")
    assert fetch_knowledge(source, "master", target).endswith("Update")
    assert (target / "documents" / "profil.md").read_text(encoding="utf-8") == "Profil v2\n"


def test_mirror_skips_raw_and_discards_local_changes(repo, source, tmp_path):
    target = tmp_path / "mirror"
    target.mkdir()  # leerer Mount-Punkt wie im Container
    fetch_knowledge(source, "master", target, mirror=True)
    assert (target / "documents" / "profil.md").exists() and (target / "techstack.json").exists()
    assert not (target / "raw").exists()

    (target / "documents" / "profil.md").write_text("lokal geändert\n", encoding="utf-8")
    (target / "documents" / "neu.md").write_text("liegen geblieben\n", encoding="utf-8")
    update_source(repo, "Profil v2\n")
    fetch_knowledge(source, "master", target, mirror=True)
    assert (target / "documents" / "profil.md").read_text(encoding="utf-8") == "Profil v2\n"
    assert not (target / "documents" / "neu.md").exists()


def test_mirror_never_touches_a_working_copy(source, tmp_path):
    target = tmp_path / "private"
    fetch_knowledge(source, "master", target)
    (target / "documents" / "profil.md").write_text("ungepushte Arbeit\n", encoding="utf-8")
    with pytest.raises(SyncError, match="Arbeitskopie"):
        fetch_knowledge(source, "master", target, mirror=True)
    assert (target / "documents" / "profil.md").read_text(encoding="utf-8") == "ungepushte Arbeit\n"


def test_refuses_non_empty_folder_without_clone(source, tmp_path):
    target = tmp_path / "private"
    target.mkdir()
    (target / "datei.md").write_text("x", encoding="utf-8")
    with pytest.raises(SyncError, match="kein Git-Klon"):
        fetch_knowledge(source, "master", target)


def test_unknown_branch_is_reported(source, tmp_path):
    with pytest.raises(SyncError, match="fehlgeschlagen"):
        fetch_knowledge(source, "gibt-es-nicht", tmp_path / "private")
