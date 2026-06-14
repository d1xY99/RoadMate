# CLAUDE.md — RoadMate monorepo

Community-driven roadside assistance. A Bun workspaces monorepo, structured after
the `hydra-stack` conventions (Bun + Turbo + Biome + TypeScript + Supabase).

## What this is

People in trouble on the road (flat tire, dead battery, out of fuel, stuck,
mechanical) create a help request. Nearby **available** users (cars, vans,
**trucks**, 4x4) get a push, can offer help, share live location, call, and
leave thumbs up/down after. Free; any compensation is arranged off-app
(the app never touches money).

## Structure

```
RoadMate/
├── docker/                 # compose files: postgres+postgis, redis, nats
├── infra/                  # IaC (after hydraedge-infra): terraform + ansible
│   ├── terraform/          # Hetzner VPS provisioning
│   ├── ansible/            # provisioning + deploy playbooks
│   └── scripts/            # bootstrap / ops helpers
├── supabase/              # Supabase project: config.toml + migrations/ (the DB)
└── packages/
    ├── web/               # @roadmate/web — MVP frontend (Vite + React), active
    ├── shared/            # @roadmate/shared — types & API contracts (zod)
    ├── backend/           # @roadmate/backend — Elysia + Bun (parked for later)
    └── mobile/            # @roadmate/mobile — Expo (React Native) (parked)
```

## Quick start

```bash
bun install          # install all workspaces
bun run db:start     # local Supabase (Postgres+PostGIS, Auth, Studio); applies migrations
bun run dev:web      # web app -> http://localhost:5173
```

## Database / migrations

- The DB is **Supabase**; `bun run db:start` runs a local Supabase stack.
- Migrations are **dbmate** files (reversible up/down) in
  `packages/backend/migrations`. Apply locally with `bun run db:migrate`
  (against local Supabase only) and revert with `bun run db:rollback`.
- Migrations reach **production ONLY via CI on merge to `main`**
  (`.github/workflows/db-deploy.yml`). Never apply to prod from a laptop.

## Conventions (inherited from hydra-stack)

- **Bun workspaces** + **Turbo** for task orchestration.
- **Biome** for lint/format (2-space, 80 width, single quotes). Run
  `biome check --write` on files you touch before committing.
- Each package has its own `package.json`, `tsconfig.json`, and `CLAUDE.md`.
- The root `tsconfig.json` only sets up project references.
- Cross-package deps use `workspace:*`.
- DB migrations live in `packages/backend/migrations` and run via **dbmate**.

## Per-package docs

- **shared**: `packages/shared` — shared TS types + zod contracts.
- **backend**: `packages/backend/CLAUDE.md` — API, matching (PostGIS), push, realtime.
- **mobile**: `packages/mobile/CLAUDE.md` — Expo app, maps, location, notifications.
