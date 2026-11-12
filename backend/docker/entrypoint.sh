#!/bin/sh
# Start des Containers: Wissensbasis holen, Index bauen, uvicorn starten.
#
# - Mit Argumenten wird stattdessen nur der Befehl ausgeführt, z. B.
#   docker compose run --rm backend python -m app.cli search "PyTorch"
# - Schlägt das Holen fehl (GitHub nicht erreichbar, Deploy Key falsch), läuft das Backend mit dem
#   letzten Stand im Volume weiter. Schlägt build-index fehl, mit dem letzten Index. Beides steht
#   als WARNUNG im Log und /api/health meldet „degraded“, falls gar nichts vorhanden ist.
# - Ein Prozess ohne --workers: Rate-Limit und Parallel-Limit liegen im Arbeitsspeicher.
# - --no-access-log: keine Zugriffsprotokolle mit IP-Adressen (Datenschutzerklärung).

set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ -n "${KNOWLEDGE_REPO:-}" ]; then
  python -m app.cli fetch-knowledge --mirror \
    || echo "WARNUNG: Wissensbasis nicht aktualisiert, nutze den vorhandenen Stand." >&2
fi

if [ -d "${KNOWLEDGE_DIR:-/data/knowledge}/documents" ]; then
  python -m app.cli build-index \
    || echo "WARNUNG: build-index meldet Fehler, betroffene Dateien fehlen im Index (siehe oben)." >&2
else
  # Ohne Dokumente nicht neu bauen: ein leerer Index würde einen vorhandenen überschreiben
  echo "WARNUNG: Keine Wissensbasis in ${KNOWLEDGE_DIR:-/data/knowledge}, Index bleibt unverändert." >&2
fi

# Die Client-IP hinter Caddy ermittelt die App selbst (TRUST_PROXY_HEADERS=true, letzter Eintrag in
# X-Forwarded-For). uvicorn vertraut der Docker-Bridge nicht und schreibt die Adresse nicht um.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
