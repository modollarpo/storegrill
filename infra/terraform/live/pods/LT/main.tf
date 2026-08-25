module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "LT"
  azure_location = "swedencentral"
  cors_origin   = "https://lt.storegrill.net"

  deploy_redis = var.deploy_redis
}
