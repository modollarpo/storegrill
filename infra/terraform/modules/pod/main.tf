terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.95"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

locals {
  suffix       = lower("${var.environment}-${var.region_key}")
  flat_suffix  = lower(replace(local.suffix, "-", ""))
  cors_header  = join(",", var.cors_origins)
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
}

variable "region_key" {
  type        = string
  description = "StoreGrill region identifier served by this pod (UK/US/DE/...)"
}

variable "dns_zone_name" {
  type        = string
  default     = "storegrill.net"
  description = "Apex DNS zone the pod's custom domains are created under"
}

variable "azure_location" {
  type        = string
  description = "Azure region hosting this pod"
}

variable "cors_origins" {
  type        = list(string)
  description = "Browser origins allowed by the API (web, admin, vendor portal)"
}

variable "deploy_redis" {
  type        = bool
  default     = false
  description = "Provision Redis Basic_C0 (~$16/mo). In-memory cache used when false."
}

variable "deploy_translator" {
  type        = bool
  default     = false
  description = "Provision the LibreTranslate container app. F1 cannot sustain it; enable only on paid plans."
}

variable "dev_client_ip" {
  type        = string
  default     = ""
  description = "Public IP allowed to reach Postgres directly for local development (blank disables)"
}

variable "database_names" {
  type        = list(string)
  default     = ["storegrill", "storegrill_dev", "storegrill_test"]
  description = "Databases created on the server: prod, local-dev, integration-test"
}

resource "azurerm_resource_group" "pod" {
  name     = "rg-storegrill-${local.suffix}"
  location = var.azure_location
  tags = {
    project     = "storegrill"
    environment = var.environment
    regionKey   = var.region_key
    pillar      = "region-pod"
  }
}

resource "azurerm_user_assigned_identity" "apps" {
  name                = "id-storegrill-${local.suffix}"
  location            = azurerm_resource_group.pod.location
  resource_group_name = azurerm_resource_group.pod.name
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-storegrill-${local.suffix}"
  location            = azurerm_resource_group.pod.location
  resource_group_name = azurerm_resource_group.pod.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "insights" {
  name                = "appi-storegrill-${local.suffix}"
  location            = azurerm_resource_group.pod.location
  resource_group_name = azurerm_resource_group.pod.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "web"
}

resource "random_password" "jwt" {
  length  = 48
  special = true
}

resource "random_password" "db_admin" {
  length  = 28
  special = true
}

resource "azurerm_postgresql_flexible_server" "db" {
  name                         = "pg-storegrill-${lower(var.region_key)}-${lower(var.environment)}"
  resource_group_name          = azurerm_resource_group.pod.name
  location                     = azurerm_resource_group.pod.location
  version                      = "16"
  administrator_login          = "sgadmin"
  administrator_password       = random_password.db_admin.result
  storage_mb                   = 32768
  sku_name                     = "B_Standard_B1ms"
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  tags = azurerm_resource_group.pod.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "dbs" {
  for_each  = toset(var.database_names)
  name      = each.value
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAllAzureIps"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "dev_client" {
  count            = var.dev_client_ip == "" ? 0 : 1
  name             = "LocalDevClient"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = var.dev_client_ip
  end_ip_address   = var.dev_client_ip
}

locals {
  pg_fqdn           = azurerm_postgresql_flexible_server.db.fqdn
  pg_url_for_prefix = "postgresql://sgadmin:${urlencode(random_password.db_admin.result)}@${local.pg_fqdn}:5432"
}

resource "azurerm_key_vault" "vault" {
  name                          = "kv-storegrill-${lower(var.region_key)}-${lower(var.environment)}"
  location                      = azurerm_resource_group.pod.location
  resource_group_name           = azurerm_resource_group.pod.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  enable_rbac_authorization     = false
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true

  tags = azurerm_resource_group.pod.tags
}

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Recover"]
}

resource "azurerm_key_vault_access_policy" "apps" {
  key_vault_id = azurerm_key_vault.vault.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.apps.principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_secret" "jwt" {
  name         = "jwt-secret"
  value        = random_password.jwt.result
  key_vault_id = azurerm_key_vault.vault.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "postgres_connection" {
  name         = "postgres-connection-string"
  value        = "${local.pg_url_for_prefix}/${var.database_names[0]}?sslmode=require"
  key_vault_id = azurerm_key_vault.vault.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "slots" {
  for_each = tomap({
    stripe-secret-key     = "not-configured"
    stripe-webhook-secret = "not-configured"
    paypal-client-id      = "not-configured"
    paypal-client-secret  = "not-configured"
    acs-connection-string = "not-configured"
  })
  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.vault.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_storage_account" "media" {
  name                     = "ststoregrill${lower(var.region_key)}${lower(var.environment)}"
  resource_group_name      = azurerm_resource_group.pod.name
  location                 = azurerm_resource_group.pod.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = azurerm_resource_group.pod.tags
}

resource "azurerm_storage_container" "product_media" {
  name                  = "product-media"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "kyc_docs" {
  name                  = "kyc-docs"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

resource "azurerm_role_assignment" "identity_blob" {
  scope                = azurerm_storage_account.media.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

resource "azurerm_container_app_environment" "env" {
  name                       = "env-storegrill-${local.suffix}"
  location                   = azurerm_resource_group.pod.location
  resource_group_name        = azurerm_resource_group.pod.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id

  tags = azurerm_resource_group.pod.tags
}

resource "azurerm_container_app" "api" {
  name                         = "app-storegrill-api-${local.suffix}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.pod.name
  revision_mode                = "Single"

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  secret {
    name  = "jwt-secret"
    value = random_password.jwt.result
  }
  secret {
    name  = "postgres-connection"
    value = "${local.pg_url_for_prefix}/${var.database_names[0]}?sslmode=require"
  }
  secret {
    name  = "stripe-secret-key"
    value = azurerm_key_vault_secret.slots["stripe-secret-key"].value
  }
  secret {
    name  = "stripe-webhook-secret"
    value = azurerm_key_vault_secret.slots["stripe-webhook-secret"].value
  }
  secret {
    name  = "paypal-client-id"
    value = azurerm_key_vault_secret.slots["paypal-client-id"].value
  }
  secret {
    name  = "paypal-client-secret"
    value = azurerm_key_vault_secret.slots["paypal-client-secret"].value
  }
  secret {
    name  = "acs-connection-string"
    value = azurerm_key_vault_secret.slots["acs-connection-string"].value
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 10

    container {
      name   = "api"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "SG_REGION_KEY"
        value = var.region_key
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "postgres-connection"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      env {
        name  = "CORS_ORIGIN"
        value = local.cors_header
      }
      env {
        name  = "WEB_BASE_URL"
        value = var.cors_origins[0]
      }
      env {
        name  = "API_BASE_URL"
        value = "https://${lower(var.region_key)}-api.${var.dns_zone_name}"
      }
      env {
        name  = "AZURE_MEDIA_STORAGE_ACCOUNT"
        value = azurerm_storage_account.media.name
      }
      env {
        name  = "AZURE_MEDIA_CONTAINER"
        value = azurerm_storage_container.product_media.name
      }
      env {
        name        = "STRIPE_SECRET_KEY"
        secret_name = "stripe-secret-key"
      }
      env {
        name        = "STRIPE_WEBHOOK_SECRET"
        secret_name = "stripe-webhook-secret"
      }
      env {
        name        = "PAYPAL_CLIENT_ID"
        secret_name = "paypal-client-id"
      }
      env {
        name        = "PAYPAL_CLIENT_SECRET"
        secret_name = "paypal-client-secret"
      }
      env {
        name        = "ACS_CONNECTION_STRING"
        secret_name = "acs-connection-string"
      }
      env {
        name  = "LIBRETRANSLATE_URL"
        value = var.deploy_translator ? "https://${azurerm_container_app.translator[0].latest_revision_fqdn}/translate" : ""
      }
      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.insights.connection_string
      }
    }
  }

  tags = azurerm_resource_group.pod.tags
}

resource "azurerm_container_app" "next_apps" {
  for_each = toset(["web", "admin", "vendor"])

  name                         = "app-storegrill-${each.value}-${local.suffix}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.pod.name
  revision_mode                = "Single"

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 10

    container {
      name   = each.value
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${lower(var.region_key)}-api.${var.dns_zone_name}"
      }
      env {
        name  = "SG_REGION_KEY"
        value = var.region_key
      }
      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.insights.connection_string
      }
    }
  }

  tags = merge(azurerm_resource_group.pod.tags, { service = each.value })
}

resource "azurerm_container_app" "translator" {
  count = var.deploy_translator ? 1 : 0

  name                         = "app-storegrill-i18n-${local.suffix}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.pod.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 2

    container {
      name   = "libretranslate"
      image  = "libretranslate/libretranslate:latest"
      cpu    = 1.0
      memory = "2Gi"

      env {
        name  = "LT_LOAD_ONLY"
        value = "en,de,fr,es,it,ar,hi,pt"
      }
      env {
        name  = "LT_UPDATE_MODELS"
        value = "false"
      }
    }
  }

  tags = merge(azurerm_resource_group.pod.tags, { service = "libretranslate" })
}

resource "azurerm_redis_cache" "cache" {
  count               = var.deploy_redis ? 1 : 0
  name                = "redis-storegrill-${local.suffix}"
  location            = azurerm_resource_group.pod.location
  resource_group_name = azurerm_resource_group.pod.name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  minimum_tls_version = "1.2"

  tags = azurerm_resource_group.pod.tags
}

variable "custom_domain_certificate_name" {
  description = "Name of the TLS certificate uploaded to the Container App environment and bound to all custom domains. The free managed certificate is unreliable with external (Cloudflare) DNS, so we upload our own. Leave empty to derive storegrill-<region>-cert-v2."
  type        = string
  default     = ""
}

variable "web_extra_domains" {
  description = "Extra custom domains bound to the web app (e.g. the apex + www for the pod that owns storegrill.net). Empty for non-apex pods."
  type        = list(string)
  default     = []
}

locals {
  pod_custom_domains = {
    web    = "${lower(var.region_key)}.${var.dns_zone_name}"
    admin  = "${lower(var.region_key)}-admin.${var.dns_zone_name}"
    vendor = "${lower(var.region_key)}-vendor.${var.dns_zone_name}"
    api    = "${lower(var.region_key)}-api.${var.dns_zone_name}"
  }
  custom_domain_certificate_name = var.custom_domain_certificate_name == "" ? "storegrill-${lower(var.region_key)}-cert-v2" : var.custom_domain_certificate_name
  custom_domain_certificate_id   = "${azurerm_container_app_environment.env.id}/certificates/${local.custom_domain_certificate_name}"
}

resource "azurerm_container_app_custom_domain" "next_apps" {
  for_each = toset(["web", "admin", "vendor"])

  name                               = local.pod_custom_domains[each.value]
  container_app_id                   = azurerm_container_app.next_apps[each.value].id
  certificate_binding_type           = "SniEnabled"
  container_app_environment_certificate_id = local.custom_domain_certificate_id
}

resource "azurerm_container_app_custom_domain" "api" {
  name                               = local.pod_custom_domains["api"]
  container_app_id                   = azurerm_container_app.api.id
  certificate_binding_type           = "SniEnabled"
  container_app_environment_certificate_id = local.custom_domain_certificate_id
}

resource "azurerm_container_app_custom_domain" "web_extra" {
  for_each = toset(var.web_extra_domains)

  name                               = each.value
  container_app_id                   = azurerm_container_app.next_apps["web"].id
  certificate_binding_type           = "SniEnabled"
  container_app_environment_certificate_id = local.custom_domain_certificate_id
}

output "resource_group_name" {
  value = try(azurerm_resource_group.pod.name, "pending")
}

output "web_hostname" {
  value = try(azurerm_container_app.next_apps["web"].latest_revision_fqdn, "pending")
}

output "admin_hostname" {
  value = try(azurerm_container_app.next_apps["admin"].latest_revision_fqdn, "pending")
}

output "vendor_hostname" {
  value = try(azurerm_container_app.next_apps["vendor"].latest_revision_fqdn, "pending")
}

output "api_hostname" {
  value = local.pod_custom_domains["api"]
}

output "translator_hostname" {
  value = var.deploy_translator ? try(azurerm_container_app.translator[0].latest_revision_fqdn, "pending") : ""
}

output "web_custom_domain_verification_id" {
  value     = try(azurerm_container_app.next_apps["web"].custom_domain_verification_id, "pending")
  sensitive = true
}

output "admin_custom_domain_verification_id" {
  value     = try(azurerm_container_app.next_apps["admin"].custom_domain_verification_id, "pending")
  sensitive = true
}

output "vendor_custom_domain_verification_id" {
  value     = try(azurerm_container_app.next_apps["vendor"].custom_domain_verification_id, "pending")
  sensitive = true
}

output "postgres_fqdn" {
  value = try(local.pg_fqdn, "pending")
}

output "key_vault_name" {
  value = try(azurerm_key_vault.vault.name, "pending")
}

output "media_storage_account_name" {
  value = try(azurerm_storage_account.media.name, "pending")
}
