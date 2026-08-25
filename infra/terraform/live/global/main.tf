resource "azurerm_resource_group" "edge" {
  name     = var.resource_group_name
  location = var.azure_location
}

resource "azurerm_dns_zone" "apex" {
  name                = var.dns_zone_name
  resource_group_name = azurerm_resource_group.edge.name
}

locals {
  subdomains = merge(
    { for region, t in var.region_targets : lower(region) => { hostname = t.web_hostname, verification_id = t.verification_id } },
    { for region, t in var.region_targets : "${lower(region)}-api" => { hostname = t.api_hostname, verification_id = null } },
    { for region, t in var.region_targets : "${lower(region)}-admin" => { hostname = t.admin_hostname, verification_id = t.admin_verification_id } },
    { for region, t in var.region_targets : "${lower(region)}-vendor" => { hostname = t.vendor_hostname, verification_id = t.vendor_verification_id } },
  )
}

resource "azurerm_dns_cname_record" "region_subdomains" {
  for_each = local.subdomains

  name                = each.key
  zone_name           = azurerm_dns_zone.apex.name
  resource_group_name = azurerm_resource_group.edge.name
  ttl                 = 300
  record              = each.value.hostname
}

resource "azurerm_dns_txt_record" "region_domain_validation" {
  for_each = { for key, value in local.subdomains : key => value if value.verification_id != null && value.verification_id != "" }

  name                = "asuid.${each.key}"
  zone_name           = azurerm_dns_zone.apex.name
  resource_group_name = azurerm_resource_group.edge.name
  ttl                 = 300

  record {
    value = each.value.verification_id
  }
}

resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.apex.name
  resource_group_name = azurerm_resource_group.edge.name
  ttl                 = 300
  record              = var.region_targets[var.apex_region].web_hostname
}

output "name_servers" {
  value = azurerm_dns_zone.apex.name_servers
}
