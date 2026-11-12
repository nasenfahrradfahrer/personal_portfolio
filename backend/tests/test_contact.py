import smtplib

import pytest
from fastapi.testclient import TestClient

from app.i18n import message
from app.main import create_app

from .conftest import FakeLLM, make_settings

SMTP = {"SMTP_HOST": "smtp.example.org", "SMTP_USER": "web@example.org", "CONTACT_TO": "ich@example.org"}
VALID = {"name": "Erika Muster", "email": "erika@firma.example", "message": "Hallo, passt die Stelle?"}


@pytest.fixture
def make_client(tmp_path):
    clients = []

    def factory(mailer=None, turnstile=None, **env):
        settings = make_settings(tmp_path, **{**SMTP, **env})
        app = create_app(settings, kb=None, llm=FakeLLM(), turnstile_verifier=turnstile, mailer=mailer)
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


def send(client, **fields):
    return client.post("/api/contact", json={**VALID, **fields})


def test_message_is_forwarded_by_mail(make_client):
    sent = []
    response = send(make_client(mailer=sent.append))
    assert response.status_code == 200 and response.json() == {"ok": True}

    mail = sent[0]
    assert mail["To"] == "ich@example.org"
    assert mail["From"].addresses[0].addr_spec == "web@example.org"  # CONTACT_FROM fällt auf SMTP_USER zurück
    assert mail["Reply-To"].addresses[0].addr_spec == "erika@firma.example"
    assert mail["Subject"] == "Kontaktformular: Nachricht von Erika Muster"
    assert "Hallo, passt die Stelle?" in mail.get_content()


def test_header_injection_via_name_is_neutralised(make_client):
    sent = []
    send(make_client(mailer=sent.append), name="Erika\r\nBcc: spam@example.org")
    mail = sent[0]
    assert mail["Bcc"] is None
    assert "\n" not in mail["Subject"] and "\r" not in mail["Subject"]


@pytest.mark.parametrize(
    "fields, key",
    [
        ({"email": "keine-adresse"}, "invalid_email"),
        ({"email": "a@b"}, "invalid_email"),
        ({"email": "a b@example.org"}, "invalid_email"),
        ({"message": "   "}, "empty_message"),
    ],
)
def test_invalid_input(make_client, fields, key):
    sent = []
    response = send(make_client(mailer=sent.append), **fields)
    assert response.status_code == 422 and response.json()["detail"] == message("de", key)
    assert not sent


def test_too_long_and_unknown_fields_are_rejected(make_client):
    client = make_client(mailer=lambda mail: None)
    assert send(client, message="x" * 5001).status_code == 422
    assert send(client, cc="jemand@example.org").status_code == 422


def test_honeypot(make_client):
    sent = []
    assert send(make_client(mailer=sent.append), website="https://spam.example").status_code == 400
    assert not sent


def test_unconfigured_smtp_returns_503(make_client):
    response = send(make_client(SMTP_HOST=""))
    assert response.status_code == 503 and response.json()["code"] == "contact_unavailable"


def test_smtp_failure_returns_503(make_client):
    def broken(mail):
        raise smtplib.SMTPAuthenticationError(535, b"nope")

    response = send(make_client(mailer=broken))
    assert response.status_code == 503 and response.json()["code"] == "contact_failed"


def test_own_rate_limit(make_client):
    client = make_client(mailer=lambda mail: None, CONTACT_LIMIT_PER_DAY="1")
    assert send(client).status_code == 200
    blocked = send(client)
    assert blocked.status_code == 429 and blocked.json()["detail"] == message("de", "contact_rate_limited")
    # Das Chat-Limit bleibt davon unberührt
    assert client.app.state.limiter.hit("testclient") is None


def test_turnstile_required_when_configured(make_client):
    async def verifier(secret, token, ip):
        return token == "gueltig"

    sent = []
    client = make_client(mailer=sent.append, turnstile=verifier, TURNSTILE_SECRET_KEY="secret")
    assert send(client).status_code == 403
    assert send(client, turnstile_token="gueltig").status_code == 200
    assert len(sent) == 1


def test_messages_follow_language(make_client):
    response = send(make_client(mailer=lambda mail: None), email="falsch", lang="en")
    assert response.json()["detail"] == message("en", "invalid_email")
