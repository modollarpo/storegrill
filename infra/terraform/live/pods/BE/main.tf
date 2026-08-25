module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "BE"
  azure_location = "westeurope"
  cors_origin   = "https://be.storegrill.net"

  deploy_redis = var.deploy_redis
}
