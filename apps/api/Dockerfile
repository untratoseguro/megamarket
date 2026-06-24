# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
# Instala solo dependencias de produccion en el sistema global
RUN uv pip install --system --no-cache .

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# curl para el HEALTHCHECK (imagen slim no lo incluye)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia site-packages y binarios del stage builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copia el codigo fuente
COPY app/ ./app/

# Cloud Run inyecta PORT en runtime (por defecto 8080)
ENV PORT=8080
EXPOSE 8080

# Healthcheck: Cloud Run tambien tiene su propio probe en /health,
# este es el fallback para entornos Docker-native (docker-compose, etc.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Un solo worker — Cloud Run escala horizontalmente por instancias
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
