# docker/ — local infrastructure

Mirrors the `hydra-stack/docker` pattern: composable compose files + dbmate
migration runner.

| File | What |
|------|------|
| `compose.base.yml` | Postgres+PostGIS, Redis, NATS (the stateful services) |
| `compose.yml`      | Top-level: includes base + `db-migrate` (dbmate) |

## Usage

From the repo root:

```bash
bun run up      # docker compose up -d (postgres+postgis, redis, nats)
bun run down    # stop everything
```

Or directly:

```bash
docker compose -f docker/compose.yml up -d
```

`db-migrate` applies everything in `packages/backend/migrations` via
[dbmate](https://github.com/amacneil/dbmate) and exits.

> Production services (the API, push workers) are deployed via `infra/`
> (Terraform + Ansible), not from these compose files.
