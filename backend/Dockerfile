# Image des CV-Chatbot-Backends. Enthält Code und Embedding-Modell, aber keine Wissensbasis:
# Die holt der Container beim Start aus dem privaten Repo (docker/entrypoint.sh). Das Image ist
# deshalb frei von persönlichen Daten und darf öffentlich in der GitHub Container Registry liegen.
#
#   docker build -t cv-backend backend
#
# Betrieb: compose.yaml und backend/README.md, Abschnitt „Betrieb“.

FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# git + ssh für fetch-knowledge (Deploy Key), curl nicht nötig: der Healthcheck nutzt Python
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Host-Schlüssel von GitHub aus der offiziellen API (per HTTPS geprüft) statt ssh-keyscan
RUN python -c "import json, urllib.request; \
keys = json.load(urllib.request.urlopen('https://api.github.com/meta', timeout=30))['ssh_keys']; \
open('/etc/ssh/ssh_known_hosts', 'w').write(''.join(f'github.com {key}\n' for key in keys))"

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Öffentliches Embedding-Modell (ca. 220 MB) gleich ins Image, damit der Start ohne Download auskommt
ARG EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL} \
    EMBEDDING_CACHE_DIR=/opt/fastembed
RUN python -c "import os; from fastembed import TextEmbedding; \
TextEmbedding(model_name=os.environ['EMBEDDING_MODEL'], cache_dir=os.environ['EMBEDDING_CACHE_DIR'])" \
    && chmod -R a+rX /opt/fastembed
ENV HF_HUB_OFFLINE=1

COPY app ./app
COPY evals ./evals
COPY knowledge/templates ./knowledge/templates
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod 755 /usr/local/bin/entrypoint

# Feste UID, damit Rechte auf dem Host (state/, Deploy Key) dazu passen
RUN useradd --uid 10001 --user-group --home-dir /home/app --create-home --shell /usr/sbin/nologin app \
    && mkdir -p /data/knowledge /data/index /data/state \
    && chown -R app:app /data

ENV KNOWLEDGE_DIR=/data/knowledge \
    INDEX_DIR=/data/index \
    DATA_DIR=/data/state

USER app
EXPOSE 8000
ENTRYPOINT ["entrypoint"]
