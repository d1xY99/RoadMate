## Architecture

![RoadMate architecture](docs/sysarchitecture.png)

## Layout

| Path | What | Status |
|------|------|--------|
| `packages/web`     | **MVP frontend** — Vite + React + Tailwind + MapLibre, talks directly to Supabase | active |
| `packages/shared`  | Shared TypeScript types & zod contracts (reused by web + future native) | active |
| `packages/backend` | Elysia (Bun) API — for later when we outgrow Supabase (workers, NATS) | parked |
| `packages/mobile`  | Expo (React Native) app — for the eventual native version | parked |
| `docker/`          | Local infra for the parked backend (Postgres+PostGIS, Redis, NATS) | later |
| `infra/`           | IaC — Terraform (Hetzner) + Ansible — for self-hosting the backend | later |

> **MVP architecture:** the web app talks **directly to Supabase** (auth,
> Postgres+PostGIS, realtime, storage). There is no custom backend to run for
> the MVP — `packages/backend`, `docker/` and `infra/` are scaffolded for later.

## Local development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- A free [Supabase](https://supabase.com) project (region: **Frankfurt / eu-central**)
  — from **Settings → API** copy the *Project URL* and *anon public key*.

### Run the web app

```bash
# 1. Install all workspace dependencies
bun install

# 2. Point the web app at your Supabase project
cp packages/web/.env.example packages/web/.env
#    then edit packages/web/.env and fill in:
#      VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
#      VITE_SUPABASE_ANON_KEY=your-anon-public-key

# 3. Start the dev server
bun run dev:web          # http://localhost:5173
```

The app runs even before Supabase is configured (it just warns in the console),
so you can see the UI immediately.

### Quality checks (same as CI)

```bash
bun run lint        # biome
bun run typecheck   # tsc --noEmit across packages
bun run test        # bun test
```

### Building / preview

```bash
cd packages/web
bun run build        # production build -> dist/
bun run preview      # serve the production build locally
```

### (Optional) parked backend

Only needed if/when you work on the custom Elysia backend instead of Supabase:

```bash
bun run up           # docker: postgres+postgis, redis, nats
bun run db:migrate   # apply migrations (dbmate)
bun run dev:backend  # Elysia API in watch mode
```


## Principles

- **Free.** Helping is voluntary; any compensation is arranged off-app.
- **Single-player useful first.** Seed helpers before requesters.
- **Privacy.** Approximate location shared on request; exact only after a match.
- **Web-first MVP.** Ship a PWA fast to validate the loop with the community;
  go native (push + background location) once it's proven. Keep all non-UI logic
  in `packages/shared` so the native port reuses the brains, not the screens.


