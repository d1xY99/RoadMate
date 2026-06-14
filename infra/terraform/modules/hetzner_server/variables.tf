variable "name" {
  type        = string
  description = "Server name"
}

variable "env" {
  type        = string
  description = "Environment label (production, staging)"
  default     = "production"
}

variable "server_type" {
  type        = string
  description = "Hetzner server type"
  default     = "cpx21"
}

variable "image" {
  type    = string
  default = "ubuntu-24.04"
}

variable "location" {
  type        = string
  description = "Hetzner location (nbg1, fsn1, hel1, ...)"
  default     = "nbg1"
}

variable "ssh_keys" {
  type        = list(string)
  description = "Names of SSH keys already uploaded to Hetzner"
}

variable "ssh_allowed_ips" {
  type        = list(string)
  description = "CIDRs allowed to SSH"
  default     = ["0.0.0.0/0", "::/0"]
}
