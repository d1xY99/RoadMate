# CLAUDE.md — @roadmate/web

The RoadMate **web app** (MVP frontend): Vite + React 19 + TypeScript, TanStack
Router + Query, Tailwind, MapLibre GL JS. Talks **directly to Supabase**
(auth, Postgres+PostGIS via RPC, realtime, storage) — there is no custom backend
server in the MVP. Deploys to Netlify.

> Web-first is for validating the request/matching loop quickly. Background
> location + reliable push need native later (`packages/mobile`). Keep all
> non-UI logic in `@roadmate/shared` so the eventual native port reuses the
> brains, not the screens.

## Commands

```bash
bun run dev         # vite dev server (http://localhost:5173)
bun run build       # production build -> dist/
bun run typecheck   # tsc --noEmit
bun run lint        # biome
```

## Layout

```
src/
├── main.tsx          # providers (react-query) + router mount
├── router.tsx        # code-based TanStack routes
├── index.css         # tailwind entry
├── lib/
│   └── supabase.ts   # Supabase client (reads VITE_ env)
├── pages/            # route components (Home = map + actions)
├── components/       # MapView (MapLibre) + reusable UI
└── store/            # zustand stores
```

## Conventions

- Shared types/contracts come from `@roadmate/shared` (zod).
- Env vars must be `VITE_`-prefixed; see `.env.example`.
- Map uses free demo tiles for now — swap the style URL in `MapView.tsx` for a
  real provider (MapTiler/Mapbox) before launch.
