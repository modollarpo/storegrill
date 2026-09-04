module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "US"
  azure_location = "centralus"
  cors_origins = [
    "https://us.storegrill.net",
    "https://us-admin.storegrill.net",
    "https://us-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}
