# CLAUDE.md — @roadmate/backend

Elysia (Bun) API for RoadMate. TypeScript, Supabase (auth + storage),
PostgreSQL + **PostGIS** (geo matching), Redis (live location), NATS (push fan-out).

## Commands

```bash
bun run dev          # watch mode (src/index.ts)
bun run db:migrate   # apply migrations (dbmate, needs $DB_URL)
bun run db:new       # scaffold a new migration
bun run lint         # biome
```

## Layout (domain-first, like hydra-stack/backend/src)

```
src/
├── index.ts          # entrypoint (listen)
├── server.ts         # Elysia app + route mounting
├── env.ts            # validated env access
├── db/               # postgres client, query helpers
├── auth/             # phone/SMS verification, JWT
├── users/            # profiles, vehicle type, helper availability toggle
├── requests/         # help requests lifecycle (open→accepted→resolved)
├── matching/         # PostGIS "find available helpers within N km"
├── notifications/    # Expo push (fan-out via NATS)
├── realtime/         # websockets: live location + request status
├── middlewares/      # auth guard, rate limit, request id
└── libs/             # redis, nats, supabase clients
```

## Key domain notes

- **Matching** is the heart. Helpers store `current_location GEOGRAPHY(POINT)`;
  matching uses `ST_DWithin` + `ST_Distance` with a GiST index. Use a wide
  radius for trucks/highways (15–30 km). If nobody answers, widen and re-notify.
- **Privacy:** broadcast only approximate location with a request; exact
  location streams over websocket only after a helper is accepted.
- **Money:** the backend never processes payments. Compensation is off-app.

## Migrations

`dbmate` migrations in `./migrations`. First migration must
`CREATE EXTENSION IF NOT EXISTS postgis;`. Don't hand-edit applied migrations.
