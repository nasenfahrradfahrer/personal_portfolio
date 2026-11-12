"""Kontaktformular: Nachricht als E-Mail an das eigene Postfach weiterleiten.

Auf dem Server wird nichts gespeichert, die Nachricht geht nur per SMTP raus. Aktiv, wenn
SMTP_HOST, CONTACT_TO und CONTACT_FROM (Standard: SMTP_USER) gesetzt sind.
"""

from __future__ import annotations

import smtplib
import ssl
from email.headerregistry import Address
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

from .config import Settings
from .schemas import clean_text


def single_line(text: str) -> str:
    """Für Header: Steuerzeichen und Zeilenumbrüche raus (sonst ließen sich weitere Header einschleusen)."""
    return " ".join(clean_text(text).split())


def build_contact_mail(settings: Settings, name: str, email: str, text: str, language: str) -> EmailMessage:
    """Baut die Mail an das eigene Postfach; „Antworten“ geht direkt an die Absenderin bzw. den Absender.

    Wirft ValueError, wenn sich die Adresse nicht als Mail-Header darstellen lässt.
    """
    name, email = single_line(name), email.strip()
    mail = EmailMessage()
    mail["Subject"] = f"Kontaktformular: Nachricht von {name or email}"
    mail["From"] = Address("Kontaktformular", addr_spec=settings.contact_from)
    mail["To"] = settings.contact_to
    mail["Reply-To"] = Address(name, addr_spec=email)
    mail["Date"] = formatdate(localtime=True)
    mail["Message-ID"] = make_msgid()
    mail.set_content(f"Name: {name or '–'}\nE-Mail: {email}\nSprache der Seite: {language}\n\n{clean_text(text)}\n")
    return mail


def send_mail(settings: Settings, mail: EmailMessage) -> None:
    """Verschickt die Mail per SMTP: Port 465 mit TLS von Anfang an, sonst mit STARTTLS."""
    context = ssl.create_default_context()
    if settings.smtp_port == 465:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15, context=context)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
    with server:
        if settings.smtp_port != 465:
            server.starttls(context=context)
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password or "")
        server.send_message(mail)
