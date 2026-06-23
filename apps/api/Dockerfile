# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# uv para instalación ultrarrápida de dependencias
RUN pip install --no-cache-dir uv

COPY pyproject.toml .
# Instala solo dependencias de producción en el sistema global
RUN uv pip install --system --no-cache .

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copia site-packages y binarios del stage builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copia el código fuente
COPY app/ ./app/

# Cloud Run inyecta PORT en runtime (por defecto 8080)
ENV PORT=8080
EXPOSE 8080

# Un solo worker para Cloud Run (escala horizontalmente por instancias)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
