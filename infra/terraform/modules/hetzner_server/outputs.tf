output "ipv4" {
  value       = hcloud_server.this.ipv4_address
  description = "Public IPv4 of the server"
}

output "id" {
  value = hcloud_server.this.id
}

output "name" {
  value = hcloud_server.this.name
}
