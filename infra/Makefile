# RoadMate infra — shortcuts (after hydraedge-infra/Makefile)
.DEFAULT_GOAL := help

TF_DIR      := terraform/production
ANSIBLE_DIR := ansible
INVENTORY   := $(ANSIBLE_DIR)/inventory/hosts.ini

.PHONY: help init plan apply provision deploy status fmt

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

init: ## terraform init
	cd $(TF_DIR) && terraform init

plan: ## terraform plan
	cd $(TF_DIR) && terraform plan

apply: ## terraform apply (provision the VPS)
	cd $(TF_DIR) && terraform apply

provision: ## ansible: install docker, firewall, caddy
	ansible-playbook -i $(INVENTORY) $(ANSIBLE_DIR)/playbooks/provision.yml

deploy: ## ansible: deploy / update the app
	ansible-playbook -i $(INVENTORY) $(ANSIBLE_DIR)/playbooks/deploy.yml

status: ## ansible: show app status on the host
	ansible all -i $(INVENTORY) -m shell -a "docker ps"

fmt: ## terraform fmt
	cd terraform && terraform fmt -recursive
