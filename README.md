# CV-Website

Persönliche Profil- und Lebenslauf-Seite von Felix Möller, auf Deutsch und Englisch, mit einem
KI-Assistenten, der Recruitern Fragen zum Profil beantwortet (RAG-Chatbot mit Claude).

| Teil | Technik | Details |
|---|---|---|
| [`frontend/`](frontend/) | React 19, Vite, D3, i18next | [`frontend/README.md`](frontend/README.md) |
| [`backend/`](backend/) | FastAPI, hybride Suche (BM25 + lokale Embeddings), Claude | [`backend/README.md`](backend/README.md) |

## Stand (Oktober 2026)

```
Browser ──▶ felixmoeller.me (Vercel, Frontend)
   └─────▶ api.felixmoeller.me (IONOS VPS: Caddy ──▶ Docker-Container 127.0.0.1:8000) ──▶ Claude API
                                    Container holt beim Start das private Repo (Wissensbasis, Tech-Stack)
```

| Bereich | Stand |
|---|---|
| **Domain** | `felixmoeller.me` bei INWX. DNS: Apex (A) und `www` (CNAME) → Vercel, `api` (A) → IONOS-VPS |
| **Frontend** | Vercel, Projekt-Root `frontend/`, Node 24. Baut bei jedem Push auf `master` automatisch neu. **Deployment Protection ist bewusst an**: Die Seite ist privat (Weiterleitung auf den Vercel-Login), bis sie fertig ist |
| **Backend** | IONOS VPS S+: Docker-Container aus `ghcr.io/nasenfahrradfahrer/personal_portfolio-backend` (gebaut von GitHub Actions), gestartet mit Docker Compose in `/srv/cv-backend`, Caddy davor für HTTPS. Bedeutungssuche aktiv (braucht ca. 800 MB RAM), Cloudflare Turnstile aktiv. Umstieg vom früheren systemd-Dienst: [`backend/README.md` → Einrichtung auf dem VPS](backend/README.md#einrichtung-auf-dem-vps-einmalig) |
| **Wissensbasis** | Profil, Zeugnisse, Abschlüsse und Tech-Stack eingepflegt, im privaten Repo [`portfolio_website_private_files`](https://github.com/nasenfahrradfahrer/portfolio_website_private_files). Das Backend holt es selbst (`fetch-knowledge`) und liefert den Tech-Stack auch ans Frontend (`/api/techstack`) |
| **Überwachung** | HetrixTools, Website-Monitor auf `https://api.felixmoeller.me/api/health` mit Keyword `"status":"ok"` ([`backend/README.md` → Überwachung](backend/README.md#überwachung)) |

Produktionswerte, die zusammenpassen müssen:

| Wo | Variable | Wert |
|---|---|---|
| Vercel | `VITE_CHAT_API_URL` | `https://api.felixmoeller.me/api` |
| Vercel | `VITE_TURNSTILE_SITE_KEY` | Site Key aus Cloudflare; `felixmoeller.me` muss als Hostname im Widget stehen |
| VPS `/srv/cv-backend/.env` | `ALLOWED_ORIGINS` | `https://felixmoeller.me,https://www.felixmoeller.me` |
| VPS `/srv/cv-backend/.env` | `TRUST_PROXY_HEADERS` | `true` (wegen Caddy) |
| VPS `/srv/cv-backend/.env` | `CHAT_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`, `ANTHROPIC_API_KEY` | fest gesetzt |
| GitHub, privates Repo | Deploy Key | öffentlicher Teil von `/srv/cv-backend/secrets/knowledge_deploy_key`, nur Lesen |

`VITE_`-Variablen werden beim Build eingebaut: Nach einer Änderung in Vercel neu deployen.

## Lokal starten

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Für Chat und Tech-Stack-Diagramm zusätzlich das Backend starten (Einrichtung:
[`backend/README.md` → Schnellstart](backend/README.md#1-schnellstart)). Vite leitet `/api` an
Port 8000 weiter. Ohne Backend zeigt der Chat „Gerade nicht verfügbar“ und das Diagramm einen
Hinweis, die restliche Seite funktioniert normal.

## Änderungen veröffentlichen

- **Frontend:** auf `master` pushen, Vercel baut und veröffentlicht selbst.
- **Backend:** auf `master` pushen. Die Action [`backend-image.yml`](.github/workflows/backend-image.yml)
  testet und baut das Image, danach auf dem VPS `sudo cv-deploy`, siehe
  [`backend/README.md` → Aktualisieren](backend/README.md#aktualisieren).
- **Wissensbasis und Tech-Stack** (privates Repo): dort pushen, dann auf dem VPS `sudo cv-deploy`.
  Das Frontend muss nicht neu bauen, es holt den Tech-Stack vom Backend.
- **Lebenslauf** (`cv_ats/*.tex`): nur die Quellen ändern und auf `master` pushen. Die GitHub
  Action [`render-cv.yml`](.github/workflows/render-cv.yml) rendert die PDFs, committet sie nach
  `frontend/public/` und löst damit den Vercel-Build aus. Danach lokal `git pull`.
