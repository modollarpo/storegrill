module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "US"
  azure_location = "eastus"
  cors_origin   = "https://us.storegrill.net"

  deploy_redis = var.deploy_redis
}
