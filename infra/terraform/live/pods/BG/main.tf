module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "BG"
  azure_location = "westeurope"
  cors_origin   = "https://bg.storegrill.net"

  deploy_redis = var.deploy_redis
}
