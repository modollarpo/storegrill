module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "EU"
  azure_location = "swedencentral"
  cors_origins = [
    "https://eu.storegrill.net",
    "https://eu-admin.storegrill.net",
    "https://eu-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}