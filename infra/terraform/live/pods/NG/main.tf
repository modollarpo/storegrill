module "pod" {
  source = "../../../modules/pod"

  environment    = var.environment
  region_key     = "NG"
  azure_location = "southafricanorth"
  cors_origins = [
    "https://ng.storegrill.net",
    "https://ng-admin.storegrill.net",
    "https://ng-vendor.storegrill.net",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
  ]

  deploy_translator = false
  deploy_redis      = var.deploy_redis
  dev_client_ip     = var.dev_client_ip
}
