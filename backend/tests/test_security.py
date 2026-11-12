import asyncio
import json

import httpx
import pytest

from app.config import Prices
from app.security.budget import DailyBudget, usage_cost
from app.security.rate_limit import ConcurrencyGate, RateLimiter
from app.security.transcript import sign_transcript, verify_transcript
from app.security.turnstile import verify_turnstile

PRICES = Prices(input=4.0, output=20.0, cache_write=5.0, cache_read=0.2)


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_rate_limiter_per_minute():
    clock = Clock()
    limiter = RateLimiter(per_minute=2, per_day=100, clock=clock)
    assert limiter.hit("a") is None
    assert limiter.hit("a") is None
    retry = limiter.hit("a")
    assert retry is not None and 1 <= retry <= 60
    assert limiter.hit("b") is None  # andere IP unabhängig
    clock.now += 61
    assert limiter.hit("a") is None


def test_rate_limiter_per_day():
    clock = Clock()
    limiter = RateLimiter(per_minute=100, per_day=3, clock=clock)
    for _ in range(3):
        assert limiter.hit("a") is None
        clock.now += 120
    assert limiter.hit("a") > 3600
    clock.now += 86_400
    assert limiter.hit("a") is None


def test_concurrency_gate_releases_and_expires():
    clock = Clock()
    gate = ConcurrencyGate(limit=1, ttl_seconds=10, clock=clock)
    ticket = gate.try_acquire()
    assert ticket is not None and gate.try_acquire() is None
    gate.release(ticket)
    assert gate.try_acquire() is not None  # Platz wieder frei
    assert gate.try_acquire() is None
    clock.now += 11  # verlorenes Ticket läuft ab
    assert gate.try_acquire() is not None


def test_usage_cost_simple_and_with_cache():
    usage = {"input_tokens": 1_000_000, "output_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}
    assert usage_cost(usage, PRICES) == pytest.approx(4.0)
    usage = {"input_tokens": 0, "output_tokens": 1000, "cache_read_input_tokens": 10_000, "cache_creation_input_tokens": 2000}
    assert usage_cost(usage, PRICES) == pytest.approx(0.02 + 0.002 + 0.01)
    assert usage_cost(None, PRICES) == 0.0


def test_usage_cost_counts_every_fallback_attempt():
    usage = {
        "input_tokens": 10,
        "output_tokens": 10,
        "iterations": [
            {"type": "message", "input_tokens": 1_000_000, "output_tokens": 0},
            {"type": "fallback_message", "model": "claude-opus-4-8", "input_tokens": 1_000_000, "output_tokens": 0},
        ],
    }
    assert usage_cost(usage, PRICES) == pytest.approx(4.0 + 5.0)  # zweiter Versuch zu Opus-4.8-Preisen


def test_daily_budget_persists_and_rolls_over(tmp_path):
    day = {"value": "2026-10-01"}
    path = tmp_path / "usage.json"
    budget = DailyBudget(path, limit_usd=1.0, prices=PRICES, today=lambda: day["value"])
    assert not budget.exhausted()
    budget.record({"output_tokens": 50_000})  # 1,00 USD
    assert budget.exhausted()
    assert json.loads(path.read_text())["spent_usd"] == pytest.approx(1.0)

    reloaded = DailyBudget(path, limit_usd=1.0, prices=PRICES, today=lambda: day["value"])
    assert reloaded.exhausted()  # Neustart setzt das Budget nicht zurück
    day["value"] = "2026-10-02"
    assert not reloaded.exhausted()


def test_budget_zero_means_unlimited(tmp_path):
    budget = DailyBudget(tmp_path / "u.json", limit_usd=0, prices=PRICES)
    budget.record({"output_tokens": 10_000_000})
    assert not budget.exhausted()


def test_transcript_signature():
    secret = b"geheim"
    history = [("user", "Frage"), ("assistant", "Antwort")]
    token = sign_transcript(secret, history)
    assert verify_transcript(secret, history, token)
    assert not verify_transcript(secret, [("user", "Frage"), ("assistant", "Gefälschte Antwort")], token)
    assert not verify_transcript(b"anderer", history, token)
    assert not verify_transcript(secret, history, None)


def _turnstile_client(payload: dict) -> httpx.AsyncClient:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
    return httpx.AsyncClient(transport=transport)


def test_turnstile_verification():
    async def run():
        ok = await verify_turnstile("secret", "token", "1.2.3.4", client=_turnstile_client({"success": True}))
        bad = await verify_turnstile("secret", "token", client=_turnstile_client({"success": False}))
        missing = await verify_turnstile("secret", None)
        return ok, bad, missing

    assert asyncio.run(run()) == (True, False, False)


def test_turnstile_fails_closed_on_network_error():
    def broken(request):
        raise httpx.ConnectError("offline")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(broken)) as client:
            return await verify_turnstile("secret", "token", client=client)

    assert asyncio.run(run()) is False
