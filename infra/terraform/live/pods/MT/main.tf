module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "MT"
  azure_location = "westeurope"
  cors_origin   = "https://mt.storegrill.net"

  deploy_redis = var.deploy_redis
}
