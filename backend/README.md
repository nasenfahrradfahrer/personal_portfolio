# CV-Chatbot – Backend

FastAPI-Backend für den KI-Assistenten der Webseite. Recruiterinnen und Recruiter stellen im Chat
Fragen zu deinem Profil; das Backend sucht die passenden Stellen in deinen Unterlagen (RAG) und
lässt Claude daraus eine Antwort mit Quellenangaben formulieren.

**Inhalt**

1. [Schnellstart](#1-schnellstart)
2. [So funktioniert es](#2-so-funktioniert-es)
3. [Dokumente hinzufügen](#3-dokumente-hinzufügen) ← das Wichtigste
4. [Testen](#4-testen)
5. [Schutzmaßnahmen](#5-schutzmaßnahmen)
6. [Konfiguration (.env)](#6-konfiguration-env)
7. [Kosten](#7-kosten)
8. [API](#8-api)
9. [Betrieb und Datenschutz](#9-betrieb-und-datenschutz)
10. [Projektstruktur](#10-projektstruktur)
11. [Fehlerbehebung](#11-fehlerbehebung)

---

## 1. Schnellstart

Voraussetzung: Python 3.11 oder neuer (entwickelt mit 3.14).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (PowerShell/cmd)
# source .venv/bin/activate       # macOS/Linux
pip install -r requirements-dev.txt

copy .env.example .env             # macOS/Linux: cp .env.example .env
```

In `backend/.env` eintragen:

- `ANTHROPIC_API_KEY` – Schlüssel aus der [Anthropic Console](https://console.anthropic.com)
- `CHAT_SIGNING_SECRET` – erzeugen mit `python -c "import secrets; print(secrets.token_hex(32))"`

Dann Wissensbasis holen, Index bauen und Server starten:

```bash
python -m app.cli fetch-knowledge          # klont das private Repo nach knowledge/private
python -m app.cli build-index              # beim ersten Mal ca. 220 MB Modell-Download
uvicorn app.main:app --port 8000 --reload  # --reload nur für die Entwicklung
```

`fetch-knowledge` braucht Lesezugriff auf das private Repo
[`portfolio_website_private_files`](https://github.com/nasenfahrradfahrer/portfolio_website_private_files)
und nutzt dafür die normalen Git-Zugangsdaten (HTTPS). Ohne Zugriff (z. B. in einem Fork) startet
das Backend trotzdem, meldet in `/api/health` aber „degraded“. Dann eigene Dokumente nach
`knowledge/private/documents/` und einen Tech-Stack nach `knowledge/private/techstack.json` legen
(Aufbau siehe [Dokumente hinzufügen](#3-dokumente-hinzufügen)).

Im zweiten Terminal das Frontend starten (`cd frontend && npm run dev`). Der Chat-Knopf erscheint
unten rechts, das Tech-Stack-Diagramm lädt seine Daten vom Backend; Vite leitet `/api`
automatisch an Port 8000 weiter.

> **Ohne Kosten ausprobieren:** `CHAT_DRY_RUN=true` in der `.env` setzen. Dann ruft das Backend
> kein Sprachmodell auf, sondern zeigt im Chat nur, welche Abschnitte die Suche gefunden hat.

> **VS Code meldet „Unable to import 'fastapi'“?** Unten rechts den Python-Interpreter auf
> `backend/.venv` umstellen (Befehl „Python: Select Interpreter“).

---

## 2. So funktioniert es

```
Browser ──POST /api/chat──▶ Schutzmaßnahmen ──▶ Suche in der Wissensbasis ──▶ Claude ──▶ Antwort (Stream)
                            (Limits, Prüfungen)   (Stichwort + Bedeutung)      (mit Quellen)
```

Die Wissensbasis hat **zwei Ebenen** – genau wie für lange Abschlussarbeiten empfohlen:

| Ebene | Front Matter | Was passiert | Geeignet für |
|---|---|---|---|
| Immer dabei | `mode: context` | Das ganze Dokument geht bei **jeder** Frage mit. Dank Prompt-Caching kostet das ab der zweiten Frage nur noch einen Bruchteil. | Profil, Zusammenfassungen, FAQ, kurze Fakten |
| Per Suche | `mode: retrieve` | Das Dokument wird in Abschnitte (Chunks) zerlegt. Pro Frage gehen nur die 6 passendsten mit. | Lange Texte wie die komplette Abschlussarbeit |

Die **Suche** ist hybrid:

- **Stichwortsuche (BM25)** findet exakte Begriffe wie „LayerCAM“ oder „GroundingDINO“.
- **Bedeutungssuche (Embeddings)** findet auch Umschreibungen („Objekterkennung in Bildern“ →
  OpenCV). Das Modell läuft **lokal** auf der CPU – deine Texte gehen dafür an keinen Dienst.
- Beide Ranglisten werden per *Reciprocal Rank Fusion* kombiniert. Bei Rückfragen („Und welche
  Ergebnisse?“) wird zusätzlich – schwächer gewichtet – mit der vorherigen Frage gesucht.

Der **Tech-Stack** der Webseite (`techstack.json` im privaten Repo) wird automatisch übernommen:
eine Übersicht immer, die Beschreibungen per Suche. Dieselbe Datei liefert das Backend über
`GET /api/techstack` an das Diagramm im Frontend. Webseite und Chatbot stammen so aus derselben
Quelle.

Alle Dokumente werden mit aktivierten **Zitaten** an Claude geschickt. Die Antwort meldet, auf
welche Dokumente sie sich stützt; der Chat zeigt diese als „Quellen“.

---

## 3. Dokumente hinzufügen

### Grundregel: Alles in der Wissensbasis ist öffentlich

Der Chatbot antwortet **jedem** Besucher, und mit etwas Geschick lässt er sich dazu bringen,
Inhalte fast wörtlich wiederzugeben. Nimm deshalb nur auf, was du auch direkt auf die Webseite
schreiben würdest. Deshalb gilt technisch: **Kein Dokument ist öffentlich, solange nicht
ausdrücklich `public: true` drinsteht.**

### Die Ordner

Die Inhalte liegen **nicht in diesem Repo**, sondern im privaten Repo
[`portfolio_website_private_files`](https://github.com/nasenfahrradfahrer/portfolio_website_private_files).
`python -m app.cli fetch-knowledge` klont es nach `knowledge/private/` bzw. aktualisiert den Klon
(`git pull --ff-only`, lokale Änderungen bleiben erhalten). Dort wird gearbeitet, committet und
gepusht.

| Ordner | Inhalt | Wo versioniert? |
|---|---|---|
| `knowledge/private/raw/` | Originale: PDFs, Scans, TXT-Dateien | privates Repo (auf dem Server nicht ausgecheckt) |
| `knowledge/private/documents/` | Geprüfte Markdown-Dateien – **das ist die Wissensbasis** | privates Repo |
| `knowledge/private/techstack.json`, `techstack.en.json` | Tech-Stack für Diagramm und Chatbot, siehe [Tech-Stack](#tech-stack) | privates Repo |
| `knowledge/templates/` | Vorlagen für Zeugnisse, Abschlussarbeit, FAQ usw. | dieses Repo |
| `knowledge/index/` | Von `build-index` erzeugter Suchindex | nirgends (erzeugt) |

Dateien in `documents/`, deren Name mit `_` beginnt, werden ignoriert (z. B. `_entwurf.md`).
Die `.gitignore` sperrt unter `knowledge/` alles außer `templates/`, damit nichts aus dem privaten
Klon versehentlich in dieses öffentliche Repo gerät.

### Ablauf in fünf Schritten

**1. Original ablegen** – z. B. `knowledge/private/raw/masterarbeit.pdf`.

**2. Entwurf erzeugen** (für PDF und TXT):

```bash
python -m app.cli extract knowledge/private/raw/masterarbeit.pdf --type Abschlussarbeit --title "Masterarbeit – Frame-Auswahl"
```

Das legt `knowledge/private/documents/masterarbeit.md` an – immer mit `public: false`. Optionen:

| Option | Bedeutung |
|---|---|
| `--type` | Art des Dokuments, erscheint in den Quellen (z. B. `Abschlussarbeit`, `Arbeitszeugnis`, `Notenspiegel`) |
| `--title` | Titel (Standard: Dateiname) |
| `--mode` | `context` oder `retrieve` (Standard: bis 6000 Zeichen `context`, sonst `retrieve`) |
| `--name` | Dateiname des Entwurfs (Standard: wie das Original) |
| `--force` | vorhandenen Entwurf überschreiben |

Für **Scans** und Dokumente, aus denen nur wenige Fakten gebraucht werden, statt `extract` eine
Vorlage aus `knowledge/templates/` nach `knowledge/private/documents/` kopieren und ausfüllen.

**3. Entwurf prüfen und bereinigen** – siehe [Checkliste](#checkliste-vor-der-freigabe) unten.
Die Warnungen von `extract` stehen auch oben im Entwurf als Kommentar.

**4. Freigeben:** im Front Matter `public: true` setzen.

**5. Index neu bauen und Backend neu starten:**

```bash
python -m app.cli build-index
python -m app.cli search "Worum ging es in der Masterarbeit?"   # kostenlos prüfen, was gefunden wird
```

`build-index` listet alle aufgenommenen und übersprungenen Dateien und warnt vor möglichen
persönlichen Daten. Danach das Backend neu starten (mit `--reload` reicht das nicht, weil sich
keine Python-Datei geändert hat).

**6. Im privaten Repo committen und pushen** (`cd knowledge/private`, dann `git add`, `git commit`,
`git push`). Der Server übernimmt den neuen Stand beim nächsten Deployment, siehe
[Betrieb](#9-betrieb-und-datenschutz).

### Das Front Matter

Jede Datei in `documents/` beginnt mit einem Block zwischen `---`:

```markdown
---
title: Masterarbeit – Frame-Auswahl für die Videoklassifikation
type: Abschlussarbeit
mode: retrieve
public: true
---
# Masterarbeit …
```

| Feld | Pflicht | Werte | Bedeutung |
|---|---|---|---|
| `title` | nein | Text | Name in den Quellenangaben (Standard: erste Überschrift oder Dateiname) |
| `type` | nein | Text | Art des Dokuments (Standard: `Dokument`) |
| `mode` | nein | `context` / `retrieve` | siehe [So funktioniert es](#2-so-funktioniert-es) (Standard: `retrieve`) |
| `public` | **ja** | `true` / `false` | nur `true` (ohne Anführungszeichen) kommt in die Wissensbasis |

Überschriften (`#`, `##`, `###`) gliedern das Dokument. Bei `mode: retrieve` wird entlang der
Überschriften zerlegt; der Abschnittspfad („Masterarbeit › 4 Ergebnisse“) hilft der Suche und
erscheint in den Quellen. **HTML-Kommentare** (`<!-- … -->`) werden nie an das Modell geschickt –
gut für eigene Notizen und TODOs.

### Welcher `mode`?

- **`context`** für alles Kurze und Zentrale: Profil, FAQ, Zusammenfassungen, Zeugnis-Fakten.
  Faustregel: zusammen höchstens ~30 000 Tokens (≈ 90 000 Zeichen); `build-index` warnt darüber.
- **`retrieve`** für alles Lange, bei dem pro Frage nur ein kleiner Teil relevant ist.
- Für lange Arbeiten **beides**: eine Zusammenfassung mit `context` (Vorlage
  `abschlussarbeit-zusammenfassung.md`) und den vollständigen Text mit `retrieve`.

### Je Dokumentart

| Dokument | Vorgehen | Vorlage |
|---|---|---|
| **Abschlussarbeit** (lange PDF) | 1. Titelseite auf Sperrvermerk prüfen. 2. `extract … --type Abschlussarbeit` → vollständiger Text mit `mode: retrieve`. 3. Zusätzlich eine Zusammenfassung (1–2 Seiten) mit `mode: context`. | `abschlussarbeit-zusammenfassung.md` |
| **Hochschulzeugnis** (Scan) | Nicht einlesen, sondern die wenigen Fakten abtippen. Keine Geburtsdaten oder Matrikelnummern. | `abschluss.md` |
| **Notenspiegel** (kurze PDF) | `extract … --type Notenspiegel`, dann in eine Zeile pro Veranstaltung umbauen. Noten nur, wenn sie öffentlich sein sollen. | `notenspiegel.md` |
| **Arbeitszeugnis** (Scan oder TXT) | **Nicht wörtlich übernehmen.** Aufgaben und Gesamturteil in eigenen Worten zusammenfassen – ohne Namen und Unterschriften Dritter und ohne verschlüsselte Zeugnissprache. | `arbeitszeugnis.md` |
| **Projekte** | Je Projekt ein `##`-Abschnitt (Ausgangslage, Rolle, Technologien, Ergebnis). | `projekt.md` |
| **Rahmenfragen** (Verfügbarkeit, Remote, Gehalt) | Festlegen, was der Bot dazu sagen darf. Was fehlt, beantwortet er nicht. | `faq.md` |
| **Tech-Stack** | Automatisch aus `techstack.json`, siehe [Tech-Stack](#tech-stack). | – |
| **Profil** | `documents/profil.md`: Kurzprofil, Stärken, Werdegang, Motivation, Projekte, Kenntnisse, Ziele und Arbeitsweise in eigenen Worten. | – |

### Was `extract` automatisch macht – und was nicht

Automatisch:

- Kopf- und Fußzeilen sowie Seitenzahlen entfernen
- Silbentrennungen am Zeilenende zusammenfügen („Klassifika-“ + „tion“)
- nummerierte Überschriften („4.2 Ergebnisse“) und typische Kapitel („Fazit“, „Abstract“) erkennen
- Verzeichnisse, Literatur, Anhang, Danksagung und eidesstattliche Erklärung entfernen (die
  entfernten Abschnitte stehen im Entwurf)
- warnen bei: Sperrvermerk/Vertraulichkeit, Scans ohne Text, nicht lesbaren Zeichen (�),
  möglichen persönlichen Daten, Arbeitszeugnissen

Nicht automatisch: Formeln, Tabellen und Abbildungen kommen als Textsalat oder gar nicht an.
Wichtige Ergebnisse aus Tabellen in Sätzen ausformulieren („Das Modell erreicht 91 % Genauigkeit“).

### Checkliste vor der Freigabe

- [ ] **Sperrvermerk/Vertraulichkeit?** Gesperrte Inhalte nicht veröffentlichen.
- [ ] **Persönliche Daten entfernt?** Geburtsdatum, Adresse, private Telefonnummer, Matrikel-,
      Steuer- oder Ausweisnummern.
- [ ] **Daten Dritter entfernt?** Namen von Betreuern, Vorgesetzten, Unterschriften – außer es ist
      geklärt, dass sie genannt werden dürfen.
- [ ] **Noten und Gehalt:** wirklich öffentlich gewollt?
- [ ] **Extraktionsfehler korrigiert?** Zeichen „�“, zerrissene Sätze, Tabellenreste.
- [ ] **Struktur:** sinnvolle `##`-Überschriften, damit Abschnitte gut gefunden werden.
- [ ] Nach `build-index`: **Warnungen gelesen** und mit `search` geprüft, ob gefunden wird, was
      gefunden werden soll.

### Ändern und entfernen

- **Ändern:** Datei bearbeiten → `build-index` → Backend neu starten → im privaten Repo pushen.
- **Entfernen:** Datei löschen oder `public: false` setzen → `build-index` → neu starten → pushen.
- **Originale** in `raw/` werden nie automatisch gelesen; sie dienen nur als Quelle für `extract`.

### Tech-Stack

`techstack.json` im privaten Repo ist die einzige Quelle für das Diagramm auf der Webseite und den
Tech-Stack des Chatbots. Aufbau (auf Deutsch):

- `projects`: Projekte mit `id` und `name`. Ihre Reihenfolge gilt auch in der Detailansicht.
  `"hidden": true` blendet ein Projekt überall aus: `build-index` übernimmt es nicht, und
  `/api/techstack` liefert es (auch in Einträgen und Übersetzungen) gar nicht erst aus.
- `entries`: je Eintrag `id`, `name`, `years`, `parent` (`null` für einen Bereich), `content`
  (HTML für die Detailansicht, wird ungefiltert gerendert) und `projects` (Projekt-IDs, erscheinen
  als Chips). `\n` im Namen setzt im Diagramm einen Zeilenumbruch.

Übersetzungen liegen daneben als `techstack.<sprache>.json`, z. B. `techstack.en.json`:
`{ "projects": { "<id>": "Name" }, "entries": { "<id>": { "name": "…", "content": "…" } } }`.
Fehlende Texte bleiben deutsch; Jahre, Struktur und Projekte kommen immer aus `techstack.json`.

Nach Änderungen `build-index` ausführen (Chatbot) und das Backend neu starten (Diagramm), denn es
liest beide Dateien beim Start. Unbekannte Projekt-IDs lassen `build-index` scheitern; das Backend
meldet sie in `/api/health` unter `techstack.error`.

---

## 4. Testen

### Automatische Tests (kostenlos)

```bash
pytest
```

Die Tests laufen ohne Netzwerk und ohne API-Kosten: Claude wird durch ein Testmodell ersetzt,
Embeddings durch eine einfache Ersatzfunktion. Sie decken ab:

| Datei | Prüft |
|---|---|
| `tests/test_documents.py` | Front Matter, sichere Standardwerte, Zerlegung in Abschnitte |
| `tests/test_extract.py` | PDF/TXT-Aufbereitung, Sperrvermerk-, Scan- und Datenschutz-Warnungen |
| `tests/test_index.py` | Index, öffentliche/private Dokumente, Stichwort- und Bedeutungssuche, Tech-Stack-Import |
| `tests/test_chat.py` | Aufbau der Anfrage (Caching, Zitate), Rückfragen, Ablehnungen, gekürzte Antworten, Fehler |
| `tests/test_i18n.py` | Sprache aus `lang`/Accept-Language, Vollständigkeit der Meldungen je Sprache |
| `tests/test_security.py` | Rate-Limit, Parallel-Limit, Tagesbudget, Signatur, Turnstile |
| `tests/test_api.py` | den Endpunkt mit allen Schutzmaßnahmen von außen |

Die Tests liegen in `backend/tests`, weil sie zum Python-Code und seinen Abhängigkeiten gehören.

### Suche prüfen (kostenlos)

```bash
python -m app.cli search "Hat er Erfahrung mit Objekterkennung?" -k 6
```

Zeigt die gefundenen Abschnitte mit Stichwort- und Bedeutungswert – ideal, um nach dem Hinzufügen
von Dokumenten zu prüfen, ob die richtigen Stellen gefunden werden.

### Eine Frage stellen (kostet wenige Cent)

```bash
python -m app.cli ask "Worum ging es in der Masterarbeit?"
python -m app.cli ask "What was the master's thesis about?" --lang en   # wie von der englischen Seite
```

### Testfragen durchlaufen (kostet ca. 0,01–0,05 USD pro Frage)

```bash
python -m app.cli eval          # fragt vor dem Start nach; --yes überspringt das
```

Die Fragen stehen in `evals/questions.yaml`: typische Recruiter-Fragen und Fangfragen, bei denen
der Bot ablehnen oder „keine Informationen“ sagen muss (z. B. Gehalt, Kubernetes, Systemprompt).
Die automatische Prüfung ist grob; Antworten mit „PRÜFEN“ selbst lesen. **Mit jedem neuen
Dokument passende Fragen ergänzen.** Fragen mit `language: en` laufen so, als kämen sie von der
englischen Seite.

---

## 5. Schutzmaßnahmen

| Maßnahme | Schützt vor | Einstellung |
|---|---|---|
| API-Schlüssel nur in `backend/.env` (python-dotenv), nie im Frontend | Diebstahl des Schlüssels | `ANTHROPIC_API_KEY` |
| **Ausgabenlimit in der Anthropic Console** | unbegrenzten Kosten – die harte Grenze | in der Console unter *Limits* |
| Tagesbudget: Chat pausiert bei Erreichen bis zum nächsten Tag (UTC); übersteht Neustarts | Kostenexplosion durch Missbrauch | `DAILY_BUDGET_USD` |
| Rate-Limit pro IP (pro Minute und pro Tag) | Spam, automatisierte Abfragen | `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_PER_DAY` |
| Begrenzte gleichzeitige Antworten | Lastspitzen | `MAX_CONCURRENT_STREAMS` |
| Eingabeprüfung: Länge, Anzahl Fragen, Reihenfolge, unbekannte Felder, Steuer- und unsichtbare Zeichen, Größe der Anfrage, nur JSON | manipulierte Anfragen | `MAX_MESSAGE_CHARS`, `MAX_TURNS`, `MAX_BODY_BYTES` |
| **Signierter Verlauf** (HMAC): Der Server signiert jede Antwort; erfundene Assistenten-Antworten im Verlauf werden abgelehnt | eingeschleuste Anweisungen über einen gefälschten Verlauf | `CHAT_SIGNING_SECRET` |
| Honeypot-Feld im Formular | einfache Bots | – |
| Cloudflare Turnstile (optional) | fortgeschrittene Bots | `TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY` |
| Systemprompt: nur Profilfragen, nichts erfinden, Dokumente sind Daten statt Anweisungen, keine Zusagen, Systemprompt nicht preisgeben | Themenmissbrauch, Halluzinationen, Prompt-Injection | `app/prompts.py` |
| Abgelehnte Anfragen (`refusal`) werden durch einen freundlichen Hinweis ersetzt; serverseitige Fallbacks springen bei Fehlalarmen der Sicherheitsfilter ein | Teilantworten, unnötige Abbrüche | `ANTHROPIC_FALLBACKS` |
| CORS nur für die eigene Domain, Sicherheits-Header | Nutzung der API durch fremde Webseiten | `ALLOWED_ORIGINS` |
| Dokumente standardmäßig nicht öffentlich, Warnungen bei persönlichen Daten und Sperrvermerk | versehentliche Veröffentlichung | `public: true` im Front Matter |
| Keine IP-Adressen gespeichert; Gesprächsprotokoll aus, wenn an: ohne IP und mit Löschfrist (wird stündlich geprüft) | Datenschutzprobleme | `LOG_CHATS`, `LOG_RETENTION_DAYS` |
| Kontaktformular: eigenes Rate-Limit, Honeypot, Turnstile, Prüfung der Adresse, keine Zeilenumbrüche in Mail-Headern; Nachrichten werden nur weitergeleitet, nicht gespeichert | Spam, eingeschleuste Mail-Header | `CONTACT_LIMIT_PER_DAY` |

**Grenzen:** Prompt-Injection lässt sich nie vollständig ausschließen. Darum ist die wichtigste
Schutzmaßnahme, nur öffentliche Inhalte in die Wissensbasis zu legen. Und: Rate-Limit und
Parallel-Limit liegen im Arbeitsspeicher – das Backend deshalb mit **einem** Prozess betreiben.

---

## 6. Konfiguration (.env)

Alle Werte stehen mit Kommentar in `.env.example`. Die `.env` gehört nie ins Repository.

| Variable | Standard | Bedeutung |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | API-Schlüssel (Pflicht, außer im Testmodus) |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Modell; günstiger: `claude-sonnet-5-5`, `claude-haiku-4-5` |
| `ANTHROPIC_EFFORT` | `low` | Denkaufwand; für kurze Chat-Antworten reicht `low` |
| `ANTHROPIC_FALLBACKS` | `auto` | Ersatzmodell bei Fehlalarmen der Sicherheitsfilter (`auto`/`on`/`off`) |
| `MAX_OUTPUT_TOKENS` | `4096` | Obergrenze pro Antwort |
| `CHAT_DRY_RUN` | `false` | Testmodus ohne API-Aufrufe |
| `OWNER_NAME` | `Felix Möller` | Name im Systemprompt |
| `OWNER_PRONOUNS` | leer | z. B. `er/ihm`; leer = der Bot nutzt den Namen statt Pronomen |
| `CONTACT_HINT` | `über den Kontaktbereich der Webseite` | Verweis, wenn der Bot etwas nicht weiß |
| `CHAT_SIGNING_SECRET` | zufällig | Schlüssel für den signierten Verlauf (fest setzen!) |
| `ALLOWED_ORIGINS` | `localhost:5173, :4173` | erlaubte Webseiten-Adressen (CORS) |
| `MAX_MESSAGE_CHARS` / `MAX_TURNS` | `1000` / `10` | Länge einer Frage / Fragen pro Unterhaltung |
| `RATE_LIMIT_PER_MINUTE` / `_PER_DAY` | `6` / `60` | Anfragen pro IP |
| `MAX_CONCURRENT_STREAMS` | `4` | gleichzeitige Antworten |
| `DAILY_BUDGET_USD` | `2.00` | geschätzte Kosten pro Tag; `0` = kein Limit |
| `TRUST_PROXY_HEADERS` | `false` | `true` nur hinter eigenem Reverse-Proxy |
| `TURNSTILE_SECRET_KEY` | leer | Cloudflare Turnstile aktivieren (gilt für Chat und Kontaktformular) |
| `SMTP_HOST` / `SMTP_PORT` | leer / `587` | Mailserver fürs Kontaktformular; Port 465 = TLS, sonst STARTTLS |
| `SMTP_USER` / `SMTP_PASSWORD` | leer | Zugangsdaten des Mailservers |
| `CONTACT_TO` / `CONTACT_FROM` | leer / `SMTP_USER` | Empfänger und Absender der weitergeleiteten Nachrichten |
| `CONTACT_LIMIT_PER_DAY` | `5` | Nachrichten übers Kontaktformular pro IP und Tag (dazu höchstens 2 pro Minute) |
| `EMBEDDING_MODEL` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | lokales Modell; `none` = nur Stichwortsuche |
| `RETRIEVAL_TOP_K` | `6` | Abschnitte pro Frage |
| `KNOWLEDGE_REPO` | privates Repo (HTTPS) | Quelle für `fetch-knowledge`; im Container die SSH-Adresse (Deploy Key) |
| `KNOWLEDGE_BRANCH` | `master` | Branch des privaten Repos |
| `KNOWLEDGE_DIR` | `knowledge/private` | Klon des privaten Repos (`documents/`, `raw/`, Tech-Stack) |
| `TECHSTACK_PATH` | `<KNOWLEDGE_DIR>/techstack.json` | Tech-Stack; Übersetzungen daneben als `techstack.<sprache>.json`; `none` = weder indexieren noch ausliefern |
| `LOG_CHATS` / `LOG_RETENTION_DAYS` | `false` / `30` | Gesprächsprotokoll in `data/chats.jsonl` (früherer Name: `LOG_QUESTIONS`) |
| `SERVE_FRONTEND_DIR` | leer | gebautes Frontend (`../frontend/dist`) direkt mit ausliefern |
| `PRICE_INPUT`, `PRICE_OUTPUT`, `PRICE_CACHE_WRITE`, `PRICE_CACHE_READ` | je Modell | USD pro 1 Mio. Tokens fürs Budget, falls sich Preise ändern |

Weitere, selten nötige Werte: `INDEX_DIR`, `DATA_DIR`, `EMBEDDING_CACHE_DIR`,
`RETRIEVAL_MIN_SIMILARITY`, `CHUNK_MAX_CHARS`, `CHUNK_OVERLAP_CHARS`, `MAX_BODY_BYTES`.

---

## 7. Kosten

Grobe Schätzung pro Antwort mit `claude-opus-5-5` ($4 / $20 pro 1 Mio. Input-/Output-Tokens):

- Eingabe: Systemprompt + Kontext-Dokumente + 6 Abschnitte ≈ 3 000–6 000 Tokens. Die immer
  gleichen Teile kommen ab der zweiten Frage aus dem Cache ($0,20 statt $4 pro 1 Mio.).
- Ausgabe: ≈ 200–500 Tokens.
- **Zusammen ca. 1–4 Cent pro Antwort.** 100 Fragen im Monat kosten also wenige Euro.

Günstigere Modelle (in der `.env` umstellen): `claude-sonnet-5-5` ($2 / $10) oder
`claude-haiku-4-5` ($1 / $5). Das Tagesbudget rechnet automatisch mit dem Preis des Modells.
`python -m app.cli ask` und `eval` zeigen die tatsächlichen Kosten an.

---

## 8. API

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/health` | Status: Index geladen? Modell bereit? Tech-Stack lesbar? Testmodus? |
| `GET` | `/api/techstack` | Tech-Stack fürs Diagramm: `{ projects, entries, texts: { en: … } }` ohne versteckte Projekte; 5 Minuten cachebar; 503 `techstack_unavailable`, wenn die Datei fehlt |
| `GET` | `/api/chat/config` | Grenzen fürs Frontend (`maxMessageChars`, `maxTurns`, `turnstile`) |
| `POST` | `/api/chat` | Frage stellen, Antwort als Server-Sent Events |
| `POST` | `/api/chat/feedback` | Antwort bewerten (`{"conversation", "turn", "token", "rating": "up"/"down"}`) |
| `POST` | `/api/contact` | Nachricht aus dem Kontaktformular per E-Mail weiterleiten |

Anfrage an `/api/chat`:

```json
{
  "messages": [{ "role": "user", "content": "Welche Erfahrung hat Felix mit PyTorch?" }],
  "history_token": null,
  "turnstile_token": null,
  "website": "",
  "lang": "de"
}
```

Bei Folgefragen enthält `messages` den bisherigen Verlauf (abwechselnd `user`/`assistant`) und
`history_token` das Token aus dem letzten `done`-Ereignis.

**Sprache:** `lang` ist die Sprache der Webseite (`de` oder `en`, Varianten wie `en-GB` gehen auch).
Darin kommen Fehlermeldungen und feste Antworten (Ablehnung, gekürzte Antwort); das Modell bekommt
sie als Hinweis bei der aktuellen Frage und antwortet trotzdem in der Sprache der Frage. Fehler,
die vor dem Lesen des Inhalts entstehen (413, 415, 429), richten sich nach dem Header
`Accept-Language`, den das Frontend deshalb ebenfalls setzt. Ohne beides oder bei unbekannter
Sprache gilt Deutsch. Meldungen und neue Sprachen: `app/i18n.py`.

Ereignisse im Stream:

| Ereignis | Daten | Bedeutung |
|---|---|---|
| `delta` | `{"text": "…"}` | nächstes Stück der Antwort |
| `replace` | `{"text": "…"}` | bisherige Antwort ersetzen (z. B. bei Ablehnung) |
| `sources` | `{"sources": [{"title", "kind"}]}` | zitierte Quellen |
| `done` | `{"history_token": "…", "feedback": {…}}` | fertig; Token für die nächste Frage. `feedback` (`conversation`, `turn`, `token`) nur mit `LOG_CHATS=true`: damit lässt sich genau diese Antwort über `/api/chat/feedback` bewerten |
| `error` | `{"code", "message"}` | Abbruch; `message` ist für Besucher formuliert |

Fehler vor dem Stream kommen als JSON `{"detail", "code"}` mit Statuscode: 400 (Honeypot),
403 (Turnstile), 409 (Verlauf ungültig), 413 (zu groß), 415 (kein JSON), 422 (ungültig),
429 (Rate-Limit, mit `Retry-After`), 503 (nicht bereit, Budget erreicht oder ausgelastet).

Anfrage an `/api/contact` (Antwort bei Erfolg: `{"ok": true}`):

```json
{ "name": "", "email": "erika@firma.example", "message": "…", "turnstile_token": null, "website": "", "lang": "de" }
```

`name` ist optional (bis 100 Zeichen), `message` bis 5 000 Zeichen. Fehler kommen wie beim Chat als
`{"detail", "code"}`: 400 (Honeypot), 403 (Turnstile), 422 (ungültige Adresse oder leere
Nachricht), 429 (eigenes Limit), 503 (`contact_unavailable`: SMTP nicht eingerichtet,
`contact_failed`: Versand fehlgeschlagen).

---

## 9. Betrieb und Datenschutz

### Deployment

Das Backend läuft unter `https://api.felixmoeller.me` als Docker-Container auf einem IONOS VPS
S+, das Frontend auf Vercel unter einer anderen Domain (Gesamtstand: [`../README.md`](../README.md)).

```
Push auf master (backend/**) ──▶ GitHub Actions: Tests ──▶ Image ghcr.io/nasenfahrradfahrer/personal_portfolio-backend:latest
                                                                 │  (Code + Embedding-Modell, keine Wissensbasis)
sudo cv-deploy (VPS) ──▶ docker compose pull + up ◀──────────────┘
                              │
Browser ──HTTPS──▶ Caddy (Host) ──▶ 127.0.0.1:8000 ──▶ Container: 1. fetch-knowledge --mirror (privates Repo, Deploy Key)
                                                                  2. build-index
                                                                  3. uvicorn (ein Prozess, --no-access-log)
```

| Was | Wo auf dem VPS | Besitzer, Rechte |
|---|---|---|
| Compose-Datei (Kopie von [`compose.yaml`](compose.yaml)) | `/srv/cv-backend/compose.yaml` | root, 644 |
| Einstellungen und Geheimnisse (Vorlage [`.env.example`](.env.example)) | `/srv/cv-backend/.env` | root, 600 |
| Tagesbudget `usage.json`, Gesprächsprotokoll `chats.jsonl` | `/srv/cv-backend/state/` | UID 10001 (User `app` im Container) |
| Deploy Key (nur Lesen) für das private Repo | `/srv/cv-backend/secrets/knowledge_deploy_key` | UID 10001, 400 |
| Spiegel des privaten Repos, Suchindex | Docker-Volumes `cv-backend_knowledge`, `cv-backend_index` | Docker |
| Deploy-Skript (Kopie von [`deploy/cv-deploy.sh`](deploy/cv-deploy.sh)) | `/usr/local/sbin/cv-deploy` | root, 755 |
| Erlaubnis für `cv`, nur dieses Skript zu starten | `/etc/sudoers.d/cv-deploy` | root, 440 |

Grundsätze, die Image und Compose-Datei umsetzen:

- **Kein Docker für `cv`:** Wer Docker bedienen darf, ist faktisch root. `cv` darf per sudoers-Regel
  nur `cv-deploy` ohne Argumente starten; Skript und Compose-Datei gehören root.
- **Keine privaten Daten im Image:** Die Wissensbasis holt der Container bei jedem Start. Schlägt
  das fehl, läuft er mit dem letzten Stand im Volume weiter (Warnung im Log).
- **Ein Prozess** (ohne `--workers`), weil Rate-Limit und Parallel-Limit im Arbeitsspeicher liegen.
  **`--no-access-log`**, weil uvicorn sonst jede Anfrage mit IP-Adresse protokolliert; die
  Datenschutzerklärung sagt zu, dass es keine Zugriffsprotokolle mit IP gibt.
- **Port nur auf `127.0.0.1`:** Docker umgeht ufw; ohne diese Bindung wäre Port 8000 öffentlich.
- **Caddy** auf dem Host übernimmt HTTPS (Let's Encrypt) und leitet an `127.0.0.1:8000` weiter;
  deshalb `TRUST_PROXY_HEADERS=true`. Caddy reicht den Stream ohne weitere Einstellung durch.
- **Andere Domain als das Frontend:** `ALLOWED_ORIGINS=https://felixmoeller.me,https://www.felixmoeller.me`,
  im Frontend `VITE_CHAT_API_URL=https://api.felixmoeller.me/api`.
- **Arbeitsspeicher:** mit Embedding-Modell ca. 700–800 MB, mit `EMBEDDING_MODEL=none` (nur
  Stichwortsuche) ca. 100 MB. Dazu kommen etwa 100 MB für Docker selbst.
- Gehärtet: ohne Linux-Capabilities, `no-new-privileges`, eigener User (UID 10001), Logs rotiert
  (3 × 10 MB).

#### Aktualisieren

| Geändert | Vorgehen |
|---|---|
| **Code** (`backend/`) | Auf `master` pushen. Die Action [`backend-image.yml`](../.github/workflows/backend-image.yml) testet und baut das Image (ca. 5 Minuten, Reiter *Actions*). Danach auf dem VPS als `cv`: `sudo cv-deploy` |
| **Wissensbasis oder Tech-Stack** (privates Repo) | Dort pushen, dann auf dem VPS `sudo cv-deploy`. Ein neues Image ist nicht nötig. |
| **`.env`** | `sudo nano /srv/cv-backend/.env`, dann `sudo cv-deploy` |
| **`compose.yaml` oder `cv-deploy.sh`** | Neue Fassung wie bei der Einrichtung (Schritt 4) kopieren, dann `sudo cv-deploy` |

`cv-deploy` holt das neueste Image, erstellt den Container neu, wartet bis zu 10 Minuten auf
`"status":"ok"` und zeigt Stand der Wissensbasis und Warnungen aus dem Log. Während Wissensbasis und
Index neu aufgebaut werden (ca. 1–2 Minuten), ist der Chat „gerade nicht verfügbar“ und das
Tech-Stack-Diagramm zeigt „Erneut versuchen“.

**Zurück auf eine ältere Version:** In `/srv/cv-backend/.env` z. B.
`BACKEND_IMAGE=ghcr.io/nasenfahrradfahrer/personal_portfolio-backend:sha-1a2b3c4` eintragen (Tags
im Paket auf GitHub), `sudo cv-deploy`. Später die Zeile wieder löschen.

#### Einrichtung auf dem VPS (einmalig)

Als Admin-User mit sudo. Der alte Dienst (systemd, venv in `/home/cv/app`) läuft bis Schritt 9 weiter.

**1. Docker installieren** (Docker Engine mit Compose-Plugin, Anleitung für Ubuntu/Debian auf
[docs.docker.com/engine/install](https://docs.docker.com/engine/install/)). `cv` **nicht** in die
Gruppe `docker` aufnehmen. Prüfen: `sudo docker compose version`.

**2. Ordner anlegen:**

```bash
sudo mkdir -p /srv/cv-backend/state /srv/cv-backend/secrets
sudo chown 10001:10001 /srv/cv-backend/state
sudo chmod 700 /srv/cv-backend/secrets
```

**3. Deploy Key für das private Repo** (GitHub erlaubt einen Deploy Key nur für ein Repo, der
bisherige lässt sich nicht wiederverwenden):

```bash
sudo ssh-keygen -t ed25519 -N "" -C "cv-backend VPS" -f /srv/cv-backend/secrets/knowledge_deploy_key
sudo chown 10001:10001 /srv/cv-backend/secrets/knowledge_deploy_key
sudo chmod 400 /srv/cv-backend/secrets/knowledge_deploy_key
sudo cat /srv/cv-backend/secrets/knowledge_deploy_key.pub
```

Den öffentlichen Schlüssel in GitHub eintragen: `portfolio_website_private_files` → *Settings* →
*Deploy keys* → *Add deploy key*, Titel z. B. „VPS cv-backend“, **ohne** *Allow write access*.

**4. Compose-Datei und Deploy-Skript holen** (aus dem öffentlichen Repo; vor dem ersten Start
einmal durchlesen):

```bash
BASE=https://raw.githubusercontent.com/nasenfahrradfahrer/personal_portfolio/master/backend
sudo curl -fsSL "$BASE/compose.yaml" -o /srv/cv-backend/compose.yaml
sudo curl -fsSL "$BASE/deploy/cv-deploy.sh" -o /usr/local/sbin/cv-deploy
sudo chmod 755 /usr/local/sbin/cv-deploy
```

**5. `.env` übernehmen:**

```bash
sudo cp /home/cv/app/backend/.env /srv/cv-backend/.env
sudo chown root:root /srv/cv-backend/.env
sudo chmod 600 /srv/cv-backend/.env
sudo nano /srv/cv-backend/.env
```

Darin prüfen: `TRUST_PROXY_HEADERS=true`, `ALLOWED_ORIGINS` wie oben, feste Werte für
`CHAT_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY` und `ANTHROPIC_API_KEY`. Zeilen mit `KNOWLEDGE_DIR`,
`INDEX_DIR`, `DATA_DIR`, `TECHSTACK_PATH`, `EMBEDDING_CACHE_DIR` und `SERVE_FRONTEND_DIR`
löschen: Pfade legen Image und Compose-Datei fest. Werte mit `$` (z. B. im SMTP-Passwort) in
einfache Anführungszeichen setzen, sonst ersetzt Compose sie.

**6. Bisherige Daten übernehmen** (Tagesbudget und Gesprächsprotokoll):

```bash
sudo cp -a /home/cv/app/backend/data/. /srv/cv-backend/state/
sudo chown -R 10001:10001 /srv/cv-backend/state
```

**7. `cv` das Deploy-Skript erlauben:**

```bash
sudo visudo -f /etc/sudoers.d/cv-deploy
```

Inhalt (das `""` am Ende verbietet Argumente):

```
cv ALL=(root) NOPASSWD: /usr/local/sbin/cv-deploy ""
```

Die alte Regel für `systemctl restart cv-backend` entfernen, falls vorhanden:
`sudo rm /etc/sudoers.d/cv-backend`.

**8. Image öffentlich machen:** Nach dem ersten Lauf der Action auf GitHub unter *Packages* →
`personal_portfolio-backend` → *Package settings* → *Change visibility* → **Public**. Dann braucht
der VPS keinen Login. (Bleibt es privat: einmal `sudo docker login ghcr.io` mit einem Token mit
`read:packages`.)

**9. Umschalten:**

```bash
sudo systemctl disable --now cv-backend   # alter Dienst gibt Port 8000 frei
sudo cv-deploy
curl -s https://api.felixmoeller.me/api/health
```

Caddy bleibt unverändert, es leitet weiter an `127.0.0.1:8000`. Geht etwas schief, zurück zum
alten Dienst: `sudo docker compose --project-directory /srv/cv-backend down` und
`sudo systemctl enable --now cv-backend`.

**10. Aufräumen**, wenn alles ein paar Tage läuft:

```bash
sudo rm /etc/systemd/system/cv-backend.service && sudo systemctl daemon-reload
sudo rm -rf /home/cv/app        # alter Klon mit venv, Index und data/ (vorher state/ prüfen)
```

Den alten Deploy Key aus `/home/cv/.ssh/` löschen und auf GitHub beim alten Repo entfernen.

#### Befehle im Betrieb

```bash
alias dc='sudo docker compose --project-directory /srv/cv-backend'
dc ps                                                    # Status, auch „healthy“
dc logs -f backend                                       # Log
dc exec backend python -m app.cli search "PyTorch"       # Suche im laufenden Container testen
dc restart backend                                       # Wissensbasis neu holen und Index neu bauen
```

#### Lokal mit Docker testen

```bash
docker build -t cv-backend backend
docker run --rm -p 127.0.0.1:8000:8000 -e CHAT_DRY_RUN=true -e KNOWLEDGE_REPO= \
  -v "$PWD/backend/knowledge/private:/data/knowledge" cv-backend
```

Mit leerem `KNOWLEDGE_REPO` holt der Container nichts, sondern nutzt den eingehängten lokalen Klon.

### Überwachung

HetrixTools prüft von außen, ob das Backend antwortet, und schickt bei einem Ausfall eine E-Mail.
Dabei entstehen keine personenbezogenen Daten.

| Einstellung | Wert |
|---|---|
| Monitor-Typ | **Website** (nicht Ping/Service: der merkt nicht, wenn der Server läuft, das Backend aber nicht) |
| URL | `https://api.felixmoeller.me/api/health` |
| Keyword | `"status":"ok"` |
| Intervall | 5 Minuten |

Das Keyword ist nötig: `/api/health` antwortet auch mit Status 200, wenn Index oder Modell fehlen,
dann aber mit `"status":"degraded"`. Ohne Keyword bliebe dieser Fall unbemerkt.

Ein zweiter Monitor für `https://felixmoeller.me` ergibt erst Sinn, wenn die Deployment Protection
aus ist. Vorher leitet Vercel auf den Login um.

### Protokolle auswerten

**Gespräche und Bewertungen** stehen in `data/chats.jsonl`, eine JSON-Zeile pro Eintrag:
`"kind": "chat"` für eine beantwortete Frage, `"kind": "rating"` für eine Bewertung (bei mehreren
Bewertungen derselben Antwort gilt die letzte). Mit `jq` (`sudo apt install jq`):

```bash
cd /srv/cv-backend/state     # lesen braucht sudo (gehört UID 10001), z. B. sudo jq …
# Gespräche lesbar
jq -r 'select(.kind == "chat") | "── \(.date) · \(.conversation) · Frage \(.turn)\nF: \(.question)\nA: \(.answer)\n"' chats.jsonl
# Schlecht bewertete Antworten (letzte Bewertung je Antwort zählt)
jq -rs '(map(select(.kind == "rating")) | group_by([.conversation, .turn]) | map(last) | map(select(.rating == "down"))) as $down
  | .[] | select(.kind == "chat") | select([.conversation, .turn] as $k | $down | any([.conversation, .turn] == $k))
  | "\(.date)  F: \(.question)\n            A: \(.answer)\n"' chats.jsonl
```

**Abgewiesene Anfragen** (Rate-Limit, Honeypot, Turnstile, ungültiger Verlauf oder Token,
Tagesbudget, Auslastung) schreibt das Backend ohne IP-Adresse als `Abgewiesen: <Grund> (<Endpunkt>)`
ins Container-Log (rotiert, höchstens 30 MB):

```bash
sudo docker compose --project-directory /srv/cv-backend logs --no-log-prefix --since 24h backend \
  | grep Abgewiesen | sed 's/.*Abgewiesen: //' | sort | uniq -c
```

### Datenschutz (DSGVO)

Die Datenschutzerklärung steht in `frontend/src/pages/Privacy.jsx` und beschreibt, was das Backend
tut. Ändert sich hier etwas, muss sie mitgezogen werden. Betroffen sind vor allem:

- Chat-Eingaben gehen an Anthropic (USA) als Auftragsverarbeiter.
- IP-Adressen nur kurzzeitig im Arbeitsspeicher für die Rate-Limits und zur Turnstile-Prüfung an
  Cloudflare; keine Zugriffsprotokolle (`--no-access-log`, siehe oben).
- Speicherung der Gespräche (`LOG_CHATS`, `LOG_RETENTION_DAYS`): was und wie lange.
- Kontaktformular: Weiterleitung per SMTP an das Postfach, keine Speicherung auf dem Server.

Im Chat steht ein sichtbarer Hinweis, dass man mit einer KI spricht (Transparenzpflicht nach dem
EU AI Act). Der Text steht je Sprache in `frontend/src/locales/<sprache>/content.js`
(`chat.notice`).

---

## 10. Projektstruktur

```
backend/
  app/
    main.py              FastAPI-App, Endpunkte, Reihenfolge der Prüfungen
    chat.py              Ablauf einer Antwort: Suche -> Anfrage an Claude -> Ereignisse
    llm.py               Claude-Anbindung (Streaming, Zitate, Fallbacks) und Testmodus
    prompts.py           Systemprompt
    i18n.py              Meldungen und feste Antworten je Sprache (de, en)
    config.py            Einstellungen aus .env, Modellpreise
    schemas.py           Eingabeprüfung
    chat_log.py          optionales Gesprächsprotokoll mit Löschfrist
    contact.py           Kontaktformular: Mail bauen und per SMTP verschicken
    cli.py               fetch-knowledge, extract, build-index, search, ask, eval
    security/            Rate-Limit, Budget, signierter Verlauf, Turnstile
    knowledge/
      documents.py       Markdown mit Front Matter einlesen
      extract.py         PDF/TXT -> Markdown-Entwurf
      chunking.py        Zerlegung entlang der Überschriften
      embeddings.py      lokale Embeddings (fastembed)
      index.py           Index bauen und hybrid durchsuchen
      techstack.py       Tech-Stack: für den Index und für /api/techstack
      sync.py            privates Repo klonen bzw. aktualisieren (fetch-knowledge)
      privacy.py         Warnungen zu persönlichen Daten und Vertraulichkeit
  knowledge/             templates/; private/ (Klon des privaten Repos) und index/ (erzeugt) nicht in Git
  evals/questions.yaml   Testfragen für `cli eval`
  tests/                 automatische Tests (pytest)
  data/                  Budget und Gesprächsprotokoll (erzeugt, nicht in Git)
  Dockerfile             Image: Code + Embedding-Modell, ohne Wissensbasis
  docker/entrypoint.sh   Start im Container: fetch-knowledge --mirror, build-index, uvicorn
  compose.yaml           Betrieb auf dem VPS (/srv/cv-backend/compose.yaml)
  deploy/cv-deploy.sh    Aktualisierung auf dem VPS (/usr/local/sbin/cv-deploy)

.github/workflows/backend-image.yml   Tests und Image-Build bei Push auf master
```

Das Frontend-Gegenstück: `frontend/src/components/ChatWidget.jsx` (Chat-Fenster),
`frontend/src/utils/chatApi.js` (Streaming) und `frontend/src/hooks/useTurnstile.js`.

---

## 11. Fehlerbehebung

| Problem | Lösung |
|---|---|
| Chat zeigt „Gerade nicht verfügbar“ | Backend läuft nicht oder kein Index: `python -m app.cli build-index`, Backend starten, `/api/health` prüfen |
| `Kein Index in …` | `python -m app.cli build-index` ausführen |
| Neues Dokument wird nicht gefunden | `public: true` gesetzt? `build-index` ausgeführt? Backend neu gestartet? Mit `search` prüfen |
| „Die Unterhaltung konnte nicht fortgesetzt werden“ | Backend wurde neu gestartet, ohne festes `CHAT_SIGNING_SECRET` – Wert in der `.env` setzen |
| „Der Assistent macht für heute Pause“ | Tagesbudget erreicht (`data/usage.json`); `DAILY_BUDGET_USD` anpassen |
| `Tech-Stack nicht gefunden`, Diagramm zeigt „konnte nicht geladen werden“ | `python -m app.cli fetch-knowledge` ausgeführt? `TECHSTACK_PATH` prüfen, Backend neu starten |
| `fetch-knowledge`: Authentication failed / Permission denied | Kein Zugriff aufs private Repo: lokal bei GitHub anmelden (Git Credential Manager), auf dem Server den Deploy Key prüfen |
| Container-Log: `Permission denied (publickey)` | Deploy Key nicht im privaten Repo eingetragen (Einrichtung, Schritt 3) |
| Container-Log: `Load key …: Permission denied` | Schlüsseldatei gehört nicht UID 10001: `sudo chown 10001:10001 /srv/cv-backend/secrets/knowledge_deploy_key` |
| Container-Log: `PermissionError` unter `/data/state` | `sudo chown -R 10001:10001 /srv/cv-backend/state` |
| `cv-deploy`: `address already in use` | Alter systemd-Dienst läuft noch: `sudo systemctl disable --now cv-backend` |
| `cv-deploy` wartet, Container „unhealthy“ | `sudo docker compose --project-directory /srv/cv-backend logs backend`; meist fehlt eine Einstellung in der `.env` oder der Tech-Stack |
| Passwort aus der `.env` kommt falsch an | Wert enthält `$`: in einfache Anführungszeichen setzen |
| Embedding-Modell soll gewechselt werden | Das Image enthält nur das Standardmodell. Anderes Modell: Build-Argument `EMBEDDING_MODEL` im Workflow setzen, oder `EMBEDDING_MODEL=none` |
| `fetch-knowledge`: „ist eine Arbeitskopie, kein Spiegel“ | `--mirror` gehört nur auf den Server; lokal ohne `--mirror` aufrufen |
| Im Entwurf stehen `�` statt Umlauten | Die PDF hat keine korrekte Zeichenzuordnung – Zeichen im Entwurf ersetzen |
| Antwort erscheint erst am Ende statt Wort für Wort | Reverse-Proxy puffert (nginx: `proxy_buffering off;`) |
| `Index wurde mit … gebaut, konfiguriert ist …` | Nach Wechsel von `EMBEDDING_MODEL` den Index neu bauen |
| Umlaute in der Konsole kaputt | Python mit `-X utf8` starten oder `PYTHONUTF8=1` setzen |
