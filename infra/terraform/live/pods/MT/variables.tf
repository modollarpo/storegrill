variable "environment" {
  type    = string
  default = "prod"
}

variable "deploy_redis" {
  type    = bool
  default = false
}

output "web_hostname" {
  value = module.pod.web_hostname
}

output "api_hostname" {
  value = module.pod.api_hostname
}
