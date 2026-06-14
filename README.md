## Architecture

![RoadMate architecture](docs/sysarchitecture.png)

## Layout

| Path | What |
|------|------|
| `packages/shared`  | Shared TypeScript types & zod API contracts |
| `packages/backend` | Elysia (Bun) API — auth, geo-matching (PostGIS), push, realtime |
| `packages/mobile`  | Expo (React Native) app — map, location, notifications |
| `docker/`          | Local infra: Postgres+PostGIS, Redis, NATS |
| `infra/`           | IaC — Terraform (Hetzner) + Ansible (provision/deploy) |

## Getting started

```bash
bun install
bun run up           # docker: postgres+postgis, redis, nats
bun run db:migrate   # apply migrations (dbmate)
bun run dev          # backend + mobile in dev (Turbo)
```


## Principles

- **Free.** Helping is voluntary; any compensation is arranged off-app.
- **Single-player useful first.** Seed helpers before requesters.
- **Privacy.** Approximate location shared on request; exact only after a match.
- **Mobile-first.** Push notifications + background location are the product.


