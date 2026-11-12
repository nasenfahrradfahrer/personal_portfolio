"""Holt die Wissensbasis aus dem privaten Git-Repo (KNOWLEDGE_REPO) nach KNOWLEDGE_DIR.

Zwei Betriebsarten:

- **Arbeitskopie** (Standard, lokal): voller Klon. Ein vorhandener Klon wird mit
  `git pull --ff-only` aktualisiert, lokale Änderungen bleiben unangetastet. Darin werden
  Dokumente bearbeitet, committet und gepusht.
- **Spiegel** (`mirror=True`, Server/Container): flacher Klon nur mit `documents/` und den
  Dateien im Wurzelordner (Tech-Stack), ohne `raw/`. Ein vorhandener Spiegel wird hart auf den
  Stand von KNOWLEDGE_BRANCH gesetzt, lokale Änderungen gehen dabei verloren.

Zugangsdaten kommen von Git selbst: lokal die gespeicherten HTTPS-Zugangsdaten, im Container ein
Deploy Key über GIT_SSH_COMMAND (siehe backend/compose.yaml).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

# Im Spiegel ausgecheckte Ordner (Cone-Modus: Dateien im Wurzelordner sind immer dabei)
MIRROR_DIRECTORIES = ["documents"]


class SyncError(RuntimeError):
    pass


def _git(*args: str, cwd: Path | None = None) -> str:
    if shutil.which("git") is None:
        raise SyncError("git ist nicht installiert.")
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8", check=False)
    if result.returncode != 0:
        output = (result.stderr or result.stdout).strip()
        raise SyncError(f"git {' '.join(args)} fehlgeschlagen:\n{output}")
    return result.stdout.strip()


def _is_clone(target: Path) -> bool:
    return (target / ".git").exists()


def _clone(repo: str, branch: str, target: Path, mirror: bool) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if mirror:
        _git("clone", "--depth", "1", "--branch", branch, "--filter=blob:none", "--sparse", repo, str(target))
        _git("sparse-checkout", "set", *MIRROR_DIRECTORIES, cwd=target)
    else:
        _git("clone", "--branch", branch, repo, str(target))


def _is_mirror(target: Path) -> bool:
    try:
        return _git("config", "--get", "core.sparseCheckout", cwd=target) == "true"
    except SyncError:  # Schlüssel fehlt
        return False


def _update(repo: str, branch: str, target: Path, mirror: bool) -> None:
    if mirror and not _is_mirror(target):
        # Schutz für die lokale Arbeitskopie: reset --hard und clean würden ungepushte Arbeit löschen
        raise SyncError(f"{target} ist eine Arbeitskopie, kein Spiegel. --mirror nur für Server-Klone verwenden.")
    if mirror:
        _git("remote", "set-url", "origin", repo, cwd=target)
        _git("fetch", "--depth", "1", "origin", branch, cwd=target)
        _git("reset", "--hard", "FETCH_HEAD", cwd=target)
        _git("clean", "-fdx", cwd=target)
    else:
        _git("pull", "--ff-only", "origin", branch, cwd=target)


def fetch_knowledge(repo: str, branch: str, target: Path, *, mirror: bool = False) -> str:
    """Klont oder aktualisiert das Repo und gibt den ausgecheckten Commit zurück (Kurzform + Betreff)."""
    if _is_clone(target):
        _update(repo, branch, target, mirror)
    elif target.exists() and any(target.iterdir()):
        raise SyncError(f"{target} existiert, ist aber kein Git-Klon. Ordner leeren oder KNOWLEDGE_DIR ändern.")
    else:
        _clone(repo, branch, target, mirror)
    return _git("log", "-1", "--format=%h %s", cwd=target)
