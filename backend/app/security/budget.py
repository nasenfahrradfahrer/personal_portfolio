"""Tagesbudget: stoppt den Chat, sobald die geschätzten API-Kosten eines Tages das Limit erreichen.

Die Kosten werden aus den Token-Angaben jeder Antwort berechnet und in data/usage.json
gespeichert, damit ein Neustart das Budget nicht zurücksetzt. Zusätzlich sollte in der
Anthropic Console ein Ausgabenlimit gesetzt sein – das ist die harte Grenze.
"""

from __future__ import annotations

import json
import logging
import threading
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from ..config import MODEL_PRICES, Prices

log = logging.getLogger(__name__)

_TOKEN_FIELDS = ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")


def _get(obj: Any, name: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _tokens(entry: Any) -> dict[str, int]:
    return {field: int(_get(entry, field) or 0) for field in _TOKEN_FIELDS}


def _cost(tokens: dict[str, int], prices: Prices) -> float:
    return (
        tokens["input_tokens"] * prices.input
        + tokens["output_tokens"] * prices.output
        + tokens["cache_creation_input_tokens"] * prices.cache_write
        + tokens["cache_read_input_tokens"] * prices.cache_read
    ) / 1_000_000


def usage_cost(usage: Any, prices: Prices) -> float:
    """Kosten einer Antwort in USD.

    Bei Fallbacks enthält `usage.iterations` jeden Versuch einzeln (der oberste Wert nur den
    letzten); jeder Versuch wird mit den Preisen seines Modells berechnet, sofern bekannt.
    """
    if usage is None:
        return 0.0
    iterations = _get(usage, "iterations")
    if iterations:
        total = 0.0
        for entry in iterations:
            model = _get(entry, "model")
            entry_prices = Prices(*MODEL_PRICES[model]) if model in MODEL_PRICES else prices
            total += _cost(_tokens(entry), entry_prices)
        return total
    return _cost(_tokens(usage), prices)


def _utc_today() -> str:
    return datetime.now(UTC).date().isoformat()


class DailyBudget:
    def __init__(
        self,
        path: Path,
        limit_usd: float,
        prices: Prices,
        today: Callable[[], str] = _utc_today,
    ):
        self.path = path
        self.limit_usd = limit_usd
        self.prices = prices
        self._today = today
        self._lock = threading.Lock()
        self._state = self._load()

    def _load(self) -> dict[str, Any]:
        try:
            state = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(state, dict) and "date" in state:
                return state
        except FileNotFoundError:
            pass
        except (OSError, ValueError):
            log.warning("Budgetdatei %s unlesbar – beginne bei 0.", self.path)
        return {"date": self._today(), "spent_usd": 0.0, "requests": 0}

    def _roll(self) -> None:
        today = self._today()
        if self._state.get("date") != today:
            self._state = {"date": today, "spent_usd": 0.0, "requests": 0}

    @property
    def spent_today(self) -> float:
        with self._lock:
            self._roll()
            return float(self._state["spent_usd"])

    def exhausted(self) -> bool:
        return self.limit_usd > 0 and self.spent_today >= self.limit_usd

    def record(self, usage: Any) -> float:
        cost = usage_cost(usage, self.prices)
        with self._lock:
            self._roll()
            self._state["spent_usd"] = round(float(self._state["spent_usd"]) + cost, 6)
            self._state["requests"] = int(self._state["requests"]) + 1
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                self.path.write_text(json.dumps(self._state), encoding="utf-8")
            except OSError:
                log.exception("Budgetdatei %s konnte nicht geschrieben werden.", self.path)
        if self.limit_usd > 0 and self._state["spent_usd"] >= self.limit_usd:
            log.warning("Tagesbudget von %.2f USD erreicht – Chat bis morgen (UTC) pausiert.", self.limit_usd)
        return cost
