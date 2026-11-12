import json
from datetime import UTC, datetime, timedelta

from app.chat_log import ChatLog, conversation_id


def entry(days_ago: int, question: str) -> str:
    date = (datetime.now(UTC).date() - timedelta(days=days_ago)).isoformat()
    return json.dumps({"date": date, "question": question})


def add(log: ChatLog, question: str) -> None:
    log.add(conversation="c", turn=1, language="de", question=question, answer="a", sources=[], stop_reason=None)


def test_old_entries_and_broken_lines_are_removed(tmp_path):
    path = tmp_path / "chats.jsonl"
    lines = [entry(31, "alt"), entry(30, "grenze"), "kaputt", entry(0, "neu")]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    ChatLog(path, enabled=True, retention_days=30).prune()
    questions = [json.loads(line)["question"] for line in path.read_text(encoding="utf-8").splitlines()]
    assert questions == ["grenze", "neu"]


def test_prune_also_runs_when_log_is_disabled(tmp_path):
    path = tmp_path / "chats.jsonl"
    path.write_text(entry(40, "alt") + "\n", encoding="utf-8")
    log = ChatLog(path, enabled=False, retention_days=30)
    add(log, "wird nicht gespeichert")
    log.prune()
    assert path.read_text(encoding="utf-8") == ""


def test_conversation_id_depends_on_first_exchange_only():
    assert conversation_id("Frage", "Antwort") == conversation_id("Frage", "Antwort")
    assert conversation_id("Frage", "Antwort") != conversation_id("Frage", "Andere Antwort")
    assert len(conversation_id("Frage", "Antwort")) == 16
