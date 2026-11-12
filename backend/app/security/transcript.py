"""Signierter Gesprächsverlauf.

Der Server ist zustandslos: Der Browser schickt bei jeder Frage den bisherigen Verlauf mit.
Damit niemand erfundene Antworten des Assistenten in den Verlauf schmuggeln kann (ein
gängiger Trick, um Modelle zu manipulieren), signiert der Server nach jeder Antwort den
gesamten Verlauf mit einem geheimen Schlüssel. Bei der nächsten Frage muss der Verlauf
genau zu dieser Signatur passen.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Iterable


def sign_transcript(secret: bytes, messages: Iterable[tuple[str, str]]) -> str:
    payload = json.dumps([[role, content] for role, content in messages], ensure_ascii=False, separators=(",", ":"))
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def sign_feedback(secret: bytes, conversation: str, turn: int) -> str:
    """Token, mit dem genau eine Antwort bewertet werden kann (nur echte Antworten, keine erfundenen)."""
    payload = f"feedback:{conversation}:{turn}"
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_feedback(secret: bytes, conversation: str, turn: int, token: str) -> bool:
    return hmac.compare_digest(sign_feedback(secret, conversation, turn), token)


def verify_transcript(secret: bytes, messages: Iterable[tuple[str, str]], token: str | None) -> bool:
    if not token:
        return False
    return hmac.compare_digest(sign_transcript(secret, messages), token)
