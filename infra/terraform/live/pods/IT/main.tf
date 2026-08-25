module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "IT"
  azure_location = "italynorth"
  cors_origin   = "https://it.storegrill.net"

  deploy_redis = var.deploy_redis
}
