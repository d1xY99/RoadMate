terraform {
  required_version = ">= 1.6"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
  # backend "s3" { ... }  # configure remote state (e.g. Hetzner Object Storage) later
}

provider "hcloud" {
  token = var.hcloud_token
}

module "api" {
  source      = "../modules/hetzner_server"
  name        = "roadmate-api"
  env         = "production"
  server_type = var.server_type
  location    = var.location
  ssh_keys    = var.ssh_keys
}

output "api_ipv4" {
  value = module.api.ipv4
}
