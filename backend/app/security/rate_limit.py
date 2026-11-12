"""Anfragelimits pro Besucher (IP) und gleichzeitige Antworten insgesamt.

Beides liegt nur im Arbeitsspeicher: IP-Adressen werden nicht gespeichert und sind
nach spätestens einem Tag vergessen. Läuft das Backend mit mehreren Prozessen,
zählt jeder Prozess für sich – daher mit einem einzigen Worker betreiben.
"""

from __future__ import annotations

import itertools
import time
from collections import deque
from collections.abc import Callable

MINUTE = 60.0
DAY = 86_400.0


class RateLimiter:
    """Gleitende Fenster: höchstens `per_minute` Anfragen pro Minute und `per_day` pro Tag."""

    def __init__(self, per_minute: int, per_day: int, clock: Callable[[], float] = time.monotonic):
        self.per_minute = per_minute
        self.per_day = per_day
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._calls = 0

    def hit(self, key: str) -> float | None:
        """Zählt eine Anfrage. Gibt None zurück, wenn sie erlaubt ist, sonst Sekunden bis zum nächsten Versuch."""
        now = self._clock()
        self._calls += 1
        if self._calls % 500 == 0:
            self._cleanup(now)

        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] >= DAY:
            hits.popleft()

        if len(hits) >= self.per_day:
            return max(1.0, DAY - (now - hits[0]))

        recent = [t for t in hits if now - t < MINUTE]
        if len(recent) >= self.per_minute:
            return max(1.0, MINUTE - (now - recent[0]))

        hits.append(now)
        return None

    def _cleanup(self, now: float) -> None:
        stale = [key for key, hits in self._hits.items() if not hits or now - hits[-1] >= DAY]
        for key in stale:
            del self._hits[key]


class ConcurrencyGate:
    """Begrenzt gleichzeitig laufende Antworten.

    Jede Freigabe ist ein Ticket mit Ablaufzeit: Geht ein Ticket verloren (z. B. weil die
    Verbindung abbricht, bevor die Antwort startet), blockiert es den Platz nicht dauerhaft.
    """

    def __init__(self, limit: int, ttl_seconds: float = 180.0, clock: Callable[[], float] = time.monotonic):
        self.limit = limit
        self.ttl = ttl_seconds
        self._clock = clock
        self._tickets: dict[int, float] = {}
        self._ids = itertools.count(1)

    def try_acquire(self) -> int | None:
        now = self._clock()
        self._tickets = {t: started for t, started in self._tickets.items() if now - started < self.ttl}
        if len(self._tickets) >= self.limit:
            return None
        ticket = next(self._ids)
        self._tickets[ticket] = now
        return ticket

    def release(self, ticket: int) -> None:
        self._tickets.pop(ticket, None)

    @property
    def active(self) -> int:
        return len(self._tickets)
