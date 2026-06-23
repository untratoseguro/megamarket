# MegaMarket

Plataforma e-commerce full-stack: Next.js 14 (Vercel) + FastAPI (Cloud Run) + Supabase.

## Estructura

```
MegaMarket/
  apps/
    web/          Next.js 14 · TypeScript · TailwindCSS  →  Vercel
    api/          FastAPI · Pydantic v2 · uvicorn         →  Cloud Run
  packages/
    types/        Tipos TypeScript compartidos
  supabase/
    migrations/   Migraciones SQL (supabase db push)
    seed/         Datos semilla
    policies/     Row Level Security policies
  infra/
    cloud-run/    Configuración de Cloud Run
    vercel/       Configuración de Vercel
    github-actions/ CI/CD pipelines
  docs/           Documentación técnica
```

## Requisitos previos

- Node.js 20+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (gestor de paquetes Python)
- Supabase CLI
- Docker (para correr la API localmente en contenedor)

## Levantar el frontend (web)

```bash
cd apps/web
cp .env.example .env.local   # Completar variables
npm install
npm run dev
# → http://localhost:3000
```

## Levantar el backend (api)

### Opción A — uvicorn directo (desarrollo)

```bash
cd apps/api
cp .env.example .env
uv venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### Opción B — Docker

```bash
cd apps/api
docker build -t megamarket-api .
docker run -p 8000:8080 --env-file .env megamarket-api
```

## Variables de entorno

Cada app tiene su propio `.env.example`. **Nunca** hay un `.env` compartido en la raíz.

| App | Archivo |
|-----|---------|
| web | `apps/web/.env.example` |
| api | `apps/api/.env.example` |

## Convenciones de commits

`type(scope): mensaje` — tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

## Fases del proyecto

- [x] Fase 0 — Scaffolding base
- [ ] Fase 1 — Supabase + Auth
- [ ] Fase 2 — Catálogo de productos
- [ ] Fase 3 — Carrito y órdenes
- [ ] Fase 4 — Pagos (Wompi)
- [ ] Fase 5 — Panel de administración
- [ ] Fase 6 — Scrapers de precios
- [ ] Fase 7 — Notificaciones
- [ ] Fase 8 — CI/CD + Cloud Run deploy
