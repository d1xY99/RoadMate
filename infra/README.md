# infra/ — Infrastructure as Code

Structured after `hydraedge-infra`: **Terraform** provisions servers,
**Ansible** configures and deploys, **scripts/** holds ops helpers.

Kept deliberately small for an MVP — one VPS is plenty for thousands of users.

```
infra/
├── terraform/
│   ├── modules/hetzner_server/   # reusable server module
│   └── production/               # the production environment
├── ansible/
│   ├── inventory/                # hosts (real hosts.ini is gitignored)
│   ├── playbooks/                # provision.yml, deploy.yml
│   └── roles/                    # docker, app, caddy, ...
├── scripts/                      # bootstrap.sh and ops helpers
└── docs/
```

## Flow

```bash
# 1. provision a VPS
cd infra/terraform/production
terraform init && terraform apply

# 2. configure the box (docker, firewall, caddy/TLS)
cd ../../ansible
ansible-playbook -i inventory/hosts.ini playbooks/provision.yml

# 3. deploy / update the app
ansible-playbook -i inventory/hosts.ini playbooks/deploy.yml
```

See [`Makefile`](./Makefile) for shortcuts (`make provision`, `make deploy`).

## Targets

- **Compute:** 1× Hetzner Cloud VPS (CPX21 is enough to start).
- **DB:** managed Postgres (Hetzner/Supabase) or self-hosted PostGIS container.
- **TLS:** Caddy (automatic HTTPS) in front of the API.
- **Secrets:** `.env` on the host (later: a vault).
