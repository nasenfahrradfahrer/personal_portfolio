#!/usr/bin/env bash
# Aktualisiert das Backend auf dem VPS: neues Image holen, Container neu erstellen (der holt dabei
# die Wissensbasis und baut den Index), auf /api/health warten, alte Images aufräumen.
#
# Installiert als root-eigenes /usr/local/sbin/cv-deploy (Einrichtung: backend/README.md, „Betrieb“).
# Der User cv darf es per sudoers-Regel ohne Argumente starten:   sudo cv-deploy
# Er darf weder das Skript noch compose.yaml ändern und bekommt so keinen Zugriff auf Docker
# (wer Docker bedienen darf, ist faktisch root).

set -euo pipefail

if [[ $# -gt 0 ]]; then
  echo "cv-deploy nimmt keine Argumente." >&2
  exit 2
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Bitte mit sudo starten: sudo cv-deploy" >&2
  exit 1
fi

DEPLOY_DIR=/srv/cv-backend
HEALTH_URL=http://127.0.0.1:8000/api/health
WAIT_SECONDS=600

cd "$DEPLOY_DIR"
compose() { docker compose --project-directory "$DEPLOY_DIR" "$@"; }

echo "==> Image holen"
compose pull --quiet

echo "==> Container neu erstellen (holt die Wissensbasis und baut den Index)"
compose up -d --force-recreate --remove-orphans

echo "==> Warte auf $HEALTH_URL (höchstens $((WAIT_SECONDS / 60)) Minuten)"
response=""
for _ in $(seq 1 $((WAIT_SECONDS / 5))); do
  if response="$(curl -fsS "$HEALTH_URL" 2>/dev/null)" && [[ "$response" == *'"status":"ok"'* ]]; then
    break
  fi
  sleep 5
done

compose logs --no-log-prefix --since 15m backend | grep -E "Stand:|WARNUNG|FEHLER|Abschnitte" || true

if [[ -z "$response" ]]; then
  echo "Backend antwortet nicht. Log: sudo docker compose --project-directory $DEPLOY_DIR logs backend" >&2
  exit 1
fi
echo "$response"
if [[ "$response" != *'"status":"ok"'* ]]; then
  echo "Backend läuft, meldet aber 'degraded' (siehe Fehler oben)." >&2
  exit 1
fi

echo "==> Alte Images aufräumen"
docker image prune -f >/dev/null
echo "==> Fertig"
