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
  suffix       = "${var.environment}-${var.region_key}"
  flat_suffix  = lower(replace(local.suffix, "-", ""))
  cors_header  = join(",", var.cors_origins)
  api_hostname = "app-storegrill-api-${local.suffix}.azurewebsites.net"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
}

variable "region_key" {
  type        = string
  description = "StoreGrill region identifier served by this pod (UK/US/DE/...)"
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

resource "azurerm_service_plan" "main" {
  name                = "asp-storegrill-${local.suffix}"
  resource_group_name = azurerm_resource_group.pod.name
  location            = azurerm_resource_group.pod.location
  os_type             = "Linux"
  sku_name            = "F1"
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
  name                         = "pg-storegrill-${local.flat_suffix}"
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
  name                          = "kv-storegrill-${local.flat_suffix}"
  location                      = azurerm_resource_group.pod.location
  resource_group_name           = azurerm_resource_group.pod.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  enable_rbac_authorization     = true
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true

  tags = azurerm_resource_group.pod.tags
}

data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "identity_kv_secrets" {
  scope                = azurerm_key_vault.vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

resource "azurerm_key_vault_secret" "jwt" {
  name         = "jwt-secret"
  value        = random_password.jwt.result
  key_vault_id = azurerm_key_vault.vault.id

  depends_on = [azurerm_role_assignment.identity_kv_secrets]
}

resource "azurerm_key_vault_secret" "postgres_connection" {
  name         = "postgres-connection-string"
  value        = "${local.pg_url_for_prefix}/${var.database_names[0]}?sslmode=require"
  key_vault_id = azurerm_key_vault.vault.id

  depends_on = [azurerm_role_assignment.identity_kv_secrets]
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

  depends_on = [azurerm_role_assignment.identity_kv_secrets]
}

resource "azurerm_storage_account" "media" {
  name                     = "ststoregrill${local.flat_suffix}"
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

resource "azurerm_linux_web_app" "api" {
  name                = "app-storegrill-api-${local.suffix}"
  resource_group_name = azurerm_resource_group.pod.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE              = "1"
    NODE_ENV                              = "production"
    SG_REGION_KEY                         = var.region_key
    DATABASE_URL                          = "${local.pg_url_for_prefix}/${var.database_names[0]}?schema=public&sslmode=require&connection_limit=10"
    JWT_SECRET                            = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.jwt.id})"
    LIBRETRANSLATE_URL                    = var.deploy_translator ? "https://${azurerm_linux_web_app.translator[0].default_hostname}/translate" : null
    CORS_ORIGIN                           = local.cors_header
    WEB_BASE_URL                          = var.cors_origins[0]
    API_BASE_URL                          = "https://${local.api_hostname}"
    AZURE_MEDIA_STORAGE_ACCOUNT           = azurerm_storage_account.media.name
    AZURE_MEDIA_CONTAINER                 = azurerm_storage_container.product_media.name
    STRIPE_SECRET_KEY                     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.slots["stripe-secret-key"].id})"
    STRIPE_WEBHOOK_SECRET                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.slots["stripe-webhook-secret"].id})"
    PAYPAL_CLIENT_ID                      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.slots["paypal-client-id"].id})"
    PAYPAL_CLIENT_SECRET                  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.slots["paypal-client-secret"].id})"
    ACS_CONNECTION_STRING                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.slots["acs-connection-string"].id})"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.insights.connection_string
  }

  site_config {
    always_on           = false
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/api/health"
    application_stack {
      node_version = "20-lts"
    }
  }

  logs {
    application_logs {
      file_system_level = "Information"
    }
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }

  tags = azurerm_resource_group.pod.tags
}

resource "azurerm_linux_web_app" "next_apps" {
  for_each = toset(["web", "admin", "vendor"])

  name                = "app-storegrill-${each.value}-${local.suffix}"
  resource_group_name = azurerm_resource_group.pod.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE              = "1"
    NODE_ENV                              = "production"
    NEXT_PUBLIC_API_URL                   = "https://${azurerm_linux_web_app.api.default_hostname}"
    SG_REGION_KEY                         = var.region_key
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.insights.connection_string
  }

  site_config {
    always_on           = false
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/api/healthz"
    application_stack {
      node_version = "20-lts"
    }
  }

  logs {
    application_logs {
      file_system_level = "Information"
    }
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }

  tags = merge(azurerm_resource_group.pod.tags, { service = each.value })
}

resource "azurerm_linux_web_app" "translator" {
  count = var.deploy_translator ? 1 : 0

  name                = "app-storegrill-i18n-${local.suffix}"
  resource_group_name = azurerm_resource_group.pod.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  app_settings = {
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
    LT_LOAD_ONLY                        = "en,de,fr,es,it,ar,hi,pt"
    LT_UPDATE_MODELS                    = "false"
    LT_THREADS                          = "4"
  }

  site_config {
    always_on                               = false
    http2_enabled                           = true
    minimum_tls_version                     = "1.2"
    container_registry_use_managed_identity = false
    application_stack {
      docker_image     = "libretranslate/libretranslate"
      docker_image_tag = "latest"
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

output "resource_group_name" {
  value = azurerm_resource_group.pod.name
}

output "web_hostname" {
  value = azurerm_linux_web_app.next_apps["web"].default_hostname
}

output "admin_hostname" {
  value = azurerm_linux_web_app.next_apps["admin"].default_hostname
}

output "vendor_hostname" {
  value = azurerm_linux_web_app.next_apps["vendor"].default_hostname
}

output "api_hostname" {
  value = azurerm_linux_web_app.api.default_hostname
}

output "translator_hostname" {
  value = var.deploy_translator ? azurerm_linux_web_app.translator[0].default_hostname : ""
}

output "web_custom_domain_verification_id" {
  value = azurerm_linux_web_app.next_apps["web"].custom_domain_verification_id
  sensitive   = true
}

output "admin_custom_domain_verification_id" {
  value = azurerm_linux_web_app.next_apps["admin"].custom_domain_verification_id
  sensitive   = true
}

output "vendor_custom_domain_verification_id" {
  value = azurerm_linux_web_app.next_apps["vendor"].custom_domain_verification_id
  sensitive   = true
}

output "postgres_fqdn" {
  value = local.pg_fqdn
}

output "key_vault_name" {
  value = azurerm_key_vault.vault.name
}

output "media_storage_account_name" {
  value = azurerm_storage_account.media.name
}
