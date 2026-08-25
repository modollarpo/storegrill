module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "RO"
  azure_location = "westeurope"
  cors_origin   = "https://ro.storegrill.net"

  deploy_redis = var.deploy_redis
}
