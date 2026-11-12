import pytest

from app.i18n import (
    DEFAULT_LANGUAGE,
    MESSAGES,
    SITE_LANGUAGE_NOTES,
    language_from_header,
    message,
    normalize_language,
    resolve_language,
)


def test_all_languages_have_the_same_messages():
    expected = set(MESSAGES[DEFAULT_LANGUAGE])
    for language, catalog in MESSAGES.items():
        assert set(catalog) == expected, language
        assert language in SITE_LANGUAGE_NOTES


@pytest.mark.parametrize(
    "value, expected",
    [("en", "en"), ("EN-us", "en"), ("de_DE", "de"), (" de ", "de"), ("fr", None), ("", None), (None, None)],
)
def test_normalize_language(value, expected):
    assert normalize_language(value) == expected


@pytest.mark.parametrize(
    "header, expected",
    [
        ("en-US,en;q=0.9,de;q=0.8", "en"),
        ("de;q=0.5, en;q=0.7", "en"),
        ("fr-FR,fr;q=0.9,de;q=0.4", "de"),
        ("fr, it", None),
        ("en;q=abc, de;q=0.1", "de"),  # ungültige Gewichtung zählt nicht
        ("*", None),
        (None, None),
    ],
)
def test_language_from_header(header, expected):
    assert language_from_header(header) == expected


def test_resolve_language_prefers_explicit_value():
    assert resolve_language("en", "de") == "en"
    assert resolve_language("xx", "en-GB") == "en"
    assert resolve_language(None, None) == DEFAULT_LANGUAGE


def test_message_formats_values_and_falls_back_to_default_language():
    assert message("en", "message_too_long", max_chars=5) == "The message is too long (at most 5 characters)."
    assert message("xx", "invalid") == MESSAGES[DEFAULT_LANGUAGE]["invalid"]
