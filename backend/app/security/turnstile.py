"""Optionaler Bot-Schutz mit Cloudflare Turnstile (aktiv, wenn TURNSTILE_SECRET_KEY gesetzt ist)."""

from __future__ import annotations

import logging

import httpx

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

log = logging.getLogger(__name__)


async def verify_turnstile(
    secret: str,
    token: str | None,
    remote_ip: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> bool:
    """Prüft ein Turnstile-Token bei Cloudflare. Bei Fehlern wird abgelehnt (fail closed)."""
    if not token:
        return False
    data = {"secret": secret, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        if client is None:
            async with httpx.AsyncClient(timeout=5.0) as own_client:
                response = await own_client.post(VERIFY_URL, data=data)
        else:
            response = await client.post(VERIFY_URL, data=data)
        result = response.json()
    except (httpx.HTTPError, ValueError):
        log.warning("Turnstile-Prüfung fehlgeschlagen (Netzwerk/Antwort).")
        return False
    if not result.get("success"):
        log.info("Turnstile abgelehnt: %s", result.get("error-codes"))
        return False
    return True
