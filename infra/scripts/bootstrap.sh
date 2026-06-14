#!/usr/bin/env bash
# Bootstrap a RoadMate environment: provision (terraform) -> configure (ansible).
# Usage: ./bootstrap.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform/production"
ANSIBLE_DIR="$ROOT/ansible"

echo "==> [1/3] Terraform: provisioning VPS"
( cd "$TF_DIR" && terraform init -input=false && terraform apply -auto-approve )

IP="$(cd "$TF_DIR" && terraform output -raw api_ipv4)"
echo "==> Provisioned host: $IP"

echo "==> [2/3] Writing ansible inventory"
cat > "$ANSIBLE_DIR/inventory/hosts.ini" <<EOF
[api]
roadmate-api ansible_host=$IP ansible_user=root

[all:vars]
ansible_python_interpreter=/usr/bin/python3
EOF

echo "==> [3/3] Ansible: provisioning host"
( cd "$ANSIBLE_DIR" && ansible-playbook playbooks/provision.yml )

echo "==> Done. Next: cd infra && make deploy"
