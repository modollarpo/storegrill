variable "environment" {
  type    = string
  default = "prod"
}

variable "deploy_redis" {
  type    = bool
  default = false
}

variable "dev_client_ip" {
  type        = string
  default     = ""
  description = "Public IP allowed direct Postgres access for local development. Update when your IP changes."
}

output "web_hostname" {
  value = module.pod.web_hostname
}

output "api_hostname" {
  value = module.pod.api_hostname
}

output "admin_hostname" {
  value = module.pod.admin_hostname
}

output "vendor_hostname" {
  value = module.pod.vendor_hostname
}

output "web_custom_domain_verification_id" {
  value     = module.pod.web_custom_domain_verification_id
  sensitive = true
}

output "admin_custom_domain_verification_id" {
  value     = module.pod.admin_custom_domain_verification_id
  sensitive = true
}

output "vendor_custom_domain_verification_id" {
  value     = module.pod.vendor_custom_domain_verification_id
  sensitive = true
}

output "postgres_fqdn" {
  value = module.pod.postgres_fqdn
}

output "key_vault_name" {
  value = module.pod.key_vault_name
}
