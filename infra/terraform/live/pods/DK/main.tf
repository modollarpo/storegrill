module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "DK"
  azure_location = "swedencentral"
  cors_origin   = "https://dk.storegrill.net"

  deploy_redis = var.deploy_redis
}
