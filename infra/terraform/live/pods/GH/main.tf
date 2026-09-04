module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "GH"
  azure_location = "southafricanorth"
  cors_origins = [
    "https://gh.storegrill.net",
    "https://gh-admin.storegrill.net",
    "https://gh-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}
