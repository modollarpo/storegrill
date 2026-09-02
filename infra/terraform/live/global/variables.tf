variable "dns_zone_name" {
  type    = string
  default = "storegrill.net"
}

variable "resource_group_name" {
  type    = string
  default = "rg-storegrill-global-edge"
}

variable "azure_location" {
  type    = string
  default = "westeurope"
}

variable "region_targets" {
  type = map(object({
    web_hostname            = string
    api_hostname            = string
    admin_hostname          = string
    vendor_hostname         = string
    verification_id         = optional(string)
    admin_verification_id   = optional(string)
    vendor_verification_id  = optional(string)
  }))
  description = "Map of regionKey -> pod app hostnames and optional custom-domain verification ids"
}

variable "apex_region" {
  type        = string
  default     = "UK"
  description = "Region served at the apex domain storegrill.net"
}

variable "cloudflare_zone_id" {
  type        = string
  default     = "664c2c4f2fd9cbb8e14e0042a1973535"
  description = "Cloudflare zone id for storegrill.net (authoritative DNS)"
}
