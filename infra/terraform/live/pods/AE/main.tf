module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "AE"
  azure_location = "centralindia"
  cors_origins = [
    "https://ae.storegrill.net",
    "https://ae-admin.storegrill.net",
    "https://ae-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  web_extra_domains = ["storegrill.net", "www.storegrill.net"]
  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}
