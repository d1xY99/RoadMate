variable "hcloud_token" {
  type        = string
  sensitive   = true
  description = "Hetzner Cloud API token (set via TF_VAR_hcloud_token or *.tfvars)"
}

variable "server_type" {
  type    = string
  default = "cpx21"
}

variable "location" {
  type    = string
  default = "nbg1"
}

variable "ssh_keys" {
  type        = list(string)
  description = "SSH key names uploaded to Hetzner"
}
