module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "SE"
  azure_location = "swedencentral"
  cors_origin   = "https://se.storegrill.net"

  deploy_redis = var.deploy_redis
}
