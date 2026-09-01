resource "azurerm_resource_group" "edge" {
  name     = var.resource_group_name
  location = var.azure_location
}

locals {
  subdomains = merge(
    { for region, t in var.region_targets : lower(region) => { hostname = t.web_hostname, verification_id = t.verification_id } },
    { for region, t in var.region_targets : "${lower(region)}-api" => { hostname = t.api_hostname, verification_id = t.verification_id } },
    { for region, t in var.region_targets : "${lower(region)}-admin" => { hostname = t.admin_hostname, verification_id = t.admin_verification_id } },
    { for region, t in var.region_targets : "${lower(region)}-vendor" => { hostname = t.vendor_hostname, verification_id = t.vendor_verification_id } },
  )
  web_fqdn = var.region_targets[var.apex_region].web_hostname
}

resource "cloudflare_record" "region_subdomains" {
  for_each = local.subdomains

  zone_id  = var.cloudflare_zone_id
  name     = each.key
  type     = "CNAME"
  value    = each.value.hostname
  proxied  = true
  ttl      = 1
}

resource "cloudflare_record" "region_domain_validation" {
  for_each = { for key, value in local.subdomains : key => value if value.verification_id != null && value.verification_id != "" }

  zone_id = var.cloudflare_zone_id
  name    = "asuid.${each.key}"
  type    = "TXT"
  value   = each.value.verification_id
  ttl     = 300
}

resource "cloudflare_record" "www" {
  zone_id  = var.cloudflare_zone_id
  name     = "www"
  type     = "CNAME"
  value    = local.web_fqdn
  proxied  = true
  ttl      = 1
}

resource "cloudflare_record" "apex" {
  zone_id  = var.cloudflare_zone_id
  name     = var.dns_zone_name
  type     = "CNAME"
  value    = local.web_fqdn
  proxied  = true
  ttl      = 1
}

resource "cloudflare_record" "wildcard" {
  zone_id  = var.cloudflare_zone_id
  name     = "*"
  type     = "CNAME"
  value    = local.web_fqdn
  proxied  = true
  ttl      = 1
}

output "cloudflare_zone_id" {
  value = var.cloudflare_zone_id
}
