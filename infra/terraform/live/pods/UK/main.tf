module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "UK"
  azure_location = "uksouth"
  cors_origins = [
    "https://uk.storegrill.net",
    "https://uk-admin.storegrill.net",
    "https://uk-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  web_extra_domains = ["storegrill.net", "www.storegrill.net"]
  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}
