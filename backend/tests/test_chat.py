import asyncio

from app.chat import RETRIEVED_NOTE, build_request, retrieve, run_chat
from app.i18n import SITE_LANGUAGE_NOTES, message
from app.knowledge.chunking import Chunk
from app.knowledge.documents import ContextDoc
from app.knowledge.index import KnowledgeBase, SearchHit
from app.llm import Citation, Finished, LLMError, TextDelta
from app.prompts import build_system_prompt
from app.security.transcript import verify_transcript

from .conftest import FakeLLM, make_settings

CONTEXT = [ContextDoc("profil", "Profil", "Profil", "Erika ist Data Scientist.")]
CHUNK = Chunk("ma-001", "ma", "Masterarbeit", "Abschlussarbeit", "2 Ergebnisse", "Genauigkeit 91 Prozent.")


def collect(generator):
    async def run():
        return [event async for event in generator]

    return asyncio.run(run())


def test_system_prompt_avoids_pronouns_unless_configured(tmp_path):
    prompt = build_system_prompt(make_settings(tmp_path))
    assert "keine Pronomen" in prompt and "Erika Muster" in prompt
    prompt = build_system_prompt(make_settings(tmp_path, OWNER_PRONOUNS="sie/ihr"))
    assert "Pronomen für Erika Muster: sie/ihr." in prompt


def test_build_request_first_turn():
    system, messages, sources = build_request("SYS", CONTEXT, [SearchHit(CHUNK, 1.0, 1.0, None)], [("user", "Frage?")])
    assert system == [{"type": "text", "text": "SYS"}]
    blocks = messages[0]["content"]
    assert [b["type"] for b in blocks] == ["document", "document", "text"]
    assert blocks[0]["cache_control"] == {"type": "ephemeral"}  # Cache-Grenze nach den festen Dokumenten
    assert "cache_control" not in blocks[1]
    assert blocks[1]["title"] == "Masterarbeit › 2 Ergebnisse" and blocks[1]["context"] == RETRIEVED_NOTE
    assert all(b["citations"] == {"enabled": True} for b in blocks[:2])
    assert [s.title for s in sources] == ["Profil", "Masterarbeit › 2 Ergebnisse"]


def test_build_request_later_turn_keeps_cached_prefix():
    history = [("user", "Erste"), ("assistant", "Antwort"), ("user", "Zweite")]
    _, messages, _ = build_request("SYS", CONTEXT, [SearchHit(CHUNK, 1.0, 1.0, None)], history)
    first, middle, last = messages
    assert [b["type"] for b in first["content"]] == ["document", "text"]  # nur feste Dokumente + erste Frage
    assert middle == {"role": "assistant", "content": "Antwort"}
    assert [b["type"] for b in last["content"]] == ["document", "text"]  # Suchtreffer zur aktuellen Frage


def test_build_request_puts_site_note_right_before_current_question():
    history = [("user", "Erste"), ("assistant", "Antwort"), ("user", "Second")]
    _, messages, _ = build_request("SYS", CONTEXT, [SearchHit(CHUNK, 1.0, 1.0, None)], history, "NOTE")
    first, _, last = messages
    assert [b["type"] for b in first["content"]] == ["document", "text"]  # gecachter Teil unverändert
    assert [b.get("text") for b in last["content"][-2:]] == ["NOTE", "Second"]


def test_build_request_without_context_caches_system_prompt():
    system, _, _ = build_request("SYS", [], [], [("user", "Frage")])
    assert system[0]["cache_control"] == {"type": "ephemeral"}


class RecordingKB:
    """Liefert je Suchtext feste Treffer und merkt sich die Suchanfragen."""

    def __init__(self, results: dict[str, list[str]]):
        self.results = results
        self.queries: list[str] = []

    def search(self, query, k):
        self.queries.append(query)
        ids = self.results.get(query, [])
        return [SearchHit(Chunk(i, "d", "Doc", "Typ", i, "Text"), 1.0, 1.0, None) for i in ids][:k]


def test_retrieve_prefers_current_question_but_keeps_context():
    history = [("user", "Computer Vision?"), ("assistant", "x"), ("user", "Und Datenbanken?")]
    kb = RecordingKB({"Und Datenbanken?": ["sql", "postgres"], "Computer Vision?\nUnd Datenbanken?": ["opencv", "sql"]})
    ids = [hit.chunk.id for hit in retrieve(kb, history, k=3)]
    assert kb.queries == ["Und Datenbanken?", "Computer Vision?\nUnd Datenbanken?"]
    assert ids == ["sql", "postgres", "opencv"]  # aktuelles Thema vorn, Kontext ergänzt


def test_retrieve_first_question_searches_once():
    kb = RecordingKB({"Frage": ["a"]})
    assert [hit.chunk.id for hit in retrieve(kb, [("user", "Frage")], k=3)] == ["a"]
    assert kb.queries == ["Frage"]


def _kb():
    return KnowledgeBase(CONTEXT, [CHUNK])


def test_run_chat_streams_text_sources_and_signed_token(tmp_path):
    settings = make_settings(tmp_path)
    llm = FakeLLM([TextDelta("91 "), TextDelta("Prozent."), Citation(1, "Masterarbeit › 2 Ergebnisse"), Finished("end_turn", "m")])
    usages = []
    history = [("user", "Welche Genauigkeit?")]
    events = collect(run_chat(history=history, kb=_kb(), llm=llm, settings=settings, on_usage=usages.append))

    names = [name for name, _ in events]
    assert names == ["delta", "delta", "sources", "done"]
    assert events[2][1] == {"sources": [{"title": "Masterarbeit › 2 Ergebnisse", "kind": "Abschlussarbeit"}]}
    token = events[3][1]["history_token"]
    assert verify_transcript(settings.signing_secret, [*history, ("assistant", "91 Prozent.")], token)
    assert usages == [llm.usage]


def test_run_chat_replaces_refused_answer(tmp_path):
    settings = make_settings(tmp_path)
    llm = FakeLLM([TextDelta("Teil"), Citation(0, "Profil"), Finished("refusal", "m")])
    events = collect(run_chat(history=[("user", "?")], kb=_kb(), llm=llm, settings=settings, on_usage=lambda u: None))
    refusal = message("de", "refusal")
    assert ("replace", {"text": refusal}) in events
    assert ("sources", {"sources": []}) in events
    token = dict(events)["done"]["history_token"]
    assert verify_transcript(settings.signing_secret, [("user", "?"), ("assistant", refusal)], token)


def test_run_chat_marks_truncated_answer(tmp_path):
    settings = make_settings(tmp_path)
    llm = FakeLLM([TextDelta("Lang"), Finished("max_tokens", "m")])
    events = collect(run_chat(history=[("user", "?")], kb=_kb(), llm=llm, settings=settings, on_usage=lambda u: None))
    assert ("delta", {"text": message("de", "truncated")}) in events


def test_run_chat_reports_llm_errors(tmp_path):
    settings = make_settings(tmp_path)
    llm = FakeLLM([TextDelta("Te"), LLMError("busy")])
    events = collect(run_chat(history=[("user", "?")], kb=_kb(), llm=llm, settings=settings, on_usage=lambda u: None))
    assert events[-1] == ("error", {"code": "busy", "message": message("de", "llm_busy")})
    assert "done" not in [name for name, _ in events]  # ohne Signatur keine Fortsetzung mit Teilantwort


def test_run_chat_unknown_llm_error_code_gets_generic_message(tmp_path):
    settings = make_settings(tmp_path)
    llm = FakeLLM([LLMError("neu")])
    events = collect(run_chat(history=[("user", "?")], kb=_kb(), llm=llm, settings=settings, on_usage=lambda u: None))
    assert events[-1] == ("error", {"code": "neu", "message": message("de", "internal")})


def test_run_chat_uses_site_language(tmp_path):
    settings = make_settings(tmp_path)

    def run(events):
        llm = FakeLLM(events)
        history = [("user", "?")]
        result = collect(
            run_chat(history=history, kb=_kb(), llm=llm, settings=settings, on_usage=lambda u: None, language="en")
        )
        return llm, result

    llm, events = run([TextDelta("x"), Finished("refusal", "m")])
    assert ("replace", {"text": message("en", "refusal")}) in events
    assert llm.calls[0]["messages"][-1]["content"][-2] == {"type": "text", "text": SITE_LANGUAGE_NOTES["en"]}
    assert llm.calls[0]["system"][0]["text"] == build_system_prompt(settings)  # Systemprompt sprachunabhängig

    _, events = run([TextDelta("Long"), Finished("max_tokens", "m")])
    assert ("delta", {"text": message("en", "truncated")}) in events

    _, events = run([LLMError("unavailable")])
    assert events[-1] == ("error", {"code": "unavailable", "message": message("en", "llm_unavailable")})
