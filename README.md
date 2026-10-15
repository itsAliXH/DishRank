# DishRank

**DishRank** is a dish-first discovery and ranking platform. Instead of rating only restaurants, users discover, rate, and discuss **individual dishes** — with city-scoped search, optional receipt verification, community submissions, and moderation for admins and restaurant owners.

This repository is an npm workspaces monorepo containing:

| Package | Path | Stack |
|---------|------|--------|
| Web app | `apps/web` | Next.js 15 (App Router), React 19, Tailwind CSS |
| API | `apps/api` | NestJS 11, Prisma, PostgreSQL, JWT auth |
| Shared types | `packages/shared` | Shared enums and TypeScript types |

---

## What the product does

### Core idea

Users search for dishes (or restaurants), open a dish page, leave a review and rating, and optionally **verify** a visit with a receipt upload + GPS check (within ~1 km of the restaurant). Community members can suggest new restaurants and dishes; those stay **pending** until an admin or restaurant owner approves them.

### Roles

| Role | Capabilities |
|------|----------------|
| **USER** (default on register) | Search, rate, bookmark, edit profile, submit restaurant/dish suggestions, optional receipt verify |
| **RESTAURANT_OWNER** | Owner panel (`/owner`): approve/reject pending dishes on owned venues; update images |
| **ADMIN** | Full admin panel (`/admin`): catalog, moderation queue, accounts, cities, create live content, assign owners |

### Main features

- **Home & search** — dishes/restaurants, sort, min rating, city filter, popular searches, trending
- **Near Me** — GPS-based discovery
- **Dish & restaurant detail** — ratings, reviews, related dishes, save/bookmark
- **Rate wizard** — guided flow to find/add a dish and leave a review
- **Auth** — register, login, refresh tokens, profile, forgot/reset password (email via Mailhog in local Docker)
- **Receipt verification** — OCR-assisted receipt upload; must own the review; GPS proximity check
- **Bookmarks & profile** — saved dishes, my reviews
- **Admin & owner panels** — moderation, cities, accounts, media upload

### Key web routes

| Route | Purpose |
|-------|---------|
| `/` | Home / trending |
| `/search` | Search |
| `/near-me` | Location-based discovery |
| `/rate` | Rate wizard |
| `/dishes/[id]` | Dish detail |
| `/restaurants/[id]` | Restaurant detail |
| `/add-dish` | Suggest a dish |
| `/profile`, `/saved` | Profile & bookmarks |
| `/forgot-password`, `/reset-password` | Password reset |
| `/admin` | Admin panel |
| `/owner` | Restaurant owner panel |

---

## Prerequisites

- **Node.js** 22+ (matches Docker images)
- **npm** 10+ (workspaces)
- **Docker Desktop** (recommended for Postgres, Mailhog, and full stack)

---

## Project structure

```
DishRanking/
├── apps/
│   ├── api/                 # NestJS API + Prisma
│   │   ├── prisma/          # schema, migrations, seed
│   │   ├── src/
│   │   ├── .env.docker.example
│   │   └── .env.local.example
│   └── web/                 # Next.js frontend
│       ├── src/
│       ├── .env.docker.example
│       └── .env.local.example
├── packages/
│   └── shared/              # @dishrank/shared types
├── docker/
│   ├── api/Dockerfile
│   └── web/Dockerfile
├── docker-compose.yml       # postgres, mailhog, api, web
├── docs/                    # Feature audit & notes
└── package.json             # Workspace root scripts
```

---

## Environment files

Real `.env*` files are **gitignored**. Copy the examples before first run:

```bash
# API
cp apps/api/.env.docker.example apps/api/.env.docker
cp apps/api/.env.local.example  apps/api/.env.local

# Web
cp apps/web/.env.docker.example apps/web/.env.docker
cp apps/web/.env.local.example  apps/web/.env.local
```

| File | When used |
|------|-----------|
| `apps/api/.env.docker` | API container (`docker compose`) — DB host is `postgres` |
| `apps/api/.env.local` | API on your machine — DB host is `localhost:5433` |
| `apps/web/.env.docker` / `.env.local` | Next.js public API URL (`NEXT_PUBLIC_API_URL`) |

Important variables (API):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (change for any shared/prod use) |
| `PORT` | API port (default `3001`) |
| `APP_WEB_URL` | Web origin for password-reset links |
| `SMTP_*` / `MAIL_FROM` | Outbound mail (Mailhog in local Docker) |

---

## Option A — Full Docker (recommended)

Runs Postgres, Mailhog, API, and Web together.

### 1. Clone and configure env

```bash
git clone <your-repo-url> DishRanking
cd DishRanking

cp apps/api/.env.docker.example apps/api/.env.docker
cp apps/web/.env.docker.example apps/web/.env.docker
```

### 2. Start the stack

```bash
docker compose up --build
```

Services:

| Service | URL / port |
|---------|------------|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Postgres | `localhost:5433` → container `5432` |
| Mailhog SMTP | `localhost:1025` |
| Mailhog UI | http://localhost:8025 |

### 3. Migrate and seed the database

In a **second terminal**, apply schema + demo data inside the API container:

```bash
docker compose exec api npm run db:migrate --workspace=apps/api
docker compose exec api npm run db:seed --workspace=apps/api
```

If `prisma migrate` prompts for a migration name on a fresh DB, use something like `init`.

Alternatively, from the host (after `npm install` and with `apps/api/.env.local` present):

```bash
npm install
npm run db:migrate
npm run db:seed
```

The host scripts talk to Postgres on `localhost:5433` via `.env.local`.

### 4. Open the app

- App: http://localhost:3000  
- API: http://localhost:3001  
- Capture password-reset emails: http://localhost:8025  

Stop with `Ctrl+C`, or in detached mode:

```bash
docker compose up --build -d
docker compose down          # stop
docker compose down -v       # stop and wipe Postgres volume
```

---

## Option B — Docker for infra only, apps on host

Useful for faster frontend/backend iteration with Node on your machine.

### 1. Env files

```bash
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local
```

### 2. Start Postgres + Mailhog

```bash
docker compose up -d postgres mailhog
```

### 3. Install, migrate, seed

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Or one-shot after compose is up:

```bash
npm run setup:db
```

(`setup:db` runs `docker compose up -d`, then migrate + seed.)

### 4. Run API and web

```bash
npm run dev
```

This starts API (`3001`) and web (`3000`) via `concurrently`.

Or separately:

```bash
npm run dev:api
npm run dev:web
```

---

## Seed accounts (local demo)

After seeding:

| Email | Password | Role |
|-------|----------|------|
| `admin@dishrank.com` | `password123` | ADMIN |
| `demo@dishrank.com` | `password123` | USER |
| `owner@dishrank.com` | `password123` | RESTAURANT_OWNER (owns Student Biryani) |

Seed also enables **Karachi**, **Lahore**, and **Islamabad** for city pickers.

---

## npm scripts (repo root)

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web in watch mode |
| `npm run dev:api` | NestJS watch |
| `npm run dev:web` | Next.js dev server |
| `npm run setup:db` | Compose up + migrate + seed |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed demo users/cities/data |
| `npm run build:api` | Build NestJS |
| `npm run build:web` | Build Next.js |
| `npm run docs:pdf` | Generate PDF from docs |

---

## How the Docker stack fits together

```
Browser → localhost:3000 (web)
                ↓ NEXT_PUBLIC_API_URL
         localhost:3001 (api)
                ↓ DATABASE_URL
         postgres:5432 (internal) / localhost:5433 (host)
                ↓ SMTP (password reset)
         mailhog:1025 → UI on localhost:8025
```

- Compose mounts source dirs into `api` / `web` for live reload.
- Postgres data lives in the Docker volume `postgres_data` (not in git).
- A fresh clone always gets an **empty** database until you migrate + seed.

---

## Development notes

### Auth model

- Register always creates `USER`.
- Login rejects `BANNED` / `DEACTIVATED` users.
- Admin routes require JWT + admin role.
- Owner routes require JWT + owner/admin role and ownership of the restaurant (`claimedBy`).
- Community submit does **not** auto-claim ownership.

### Content lifecycle

1. User submits restaurant/dish → `PENDING`
2. Admin (or owner for dishes on their venues) approves/rejects
3. Approved content appears in public search
4. Reviews may also go through moderation before going live

### Password reset (local)

1. Use **Forgot password** on the web app  
2. Open Mailhog UI: http://localhost:8025  
3. Click the reset link (uses `APP_WEB_URL`)

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| API cannot connect to DB (Docker) | `apps/api/.env.docker` exists; host in URL is `postgres`, not `localhost` |
| API cannot connect to DB (host) | Postgres container is up; URL uses `localhost:5433`; `.env.local` exists |
| Web calls wrong API | `NEXT_PUBLIC_API_URL=http://localhost:3001` in web env |
| Empty catalog / no cities | Run migrate + seed |
| Port already in use | Free `3000`, `3001`, `5433`, `1025`, or `8025` |
| Env changes not applied in Docker | Recreate containers: `docker compose up --build` |
| Prisma client missing | `npm run db:generate` (or rebuild API image) |

Reset database volume (destroys all local data):

```bash
docker compose down -v
docker compose up --build
# then migrate + seed again
```

---

## Further reading

- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md) — detailed feature inventory, role matrix, API surface, and product flows

---

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source or share externally.
