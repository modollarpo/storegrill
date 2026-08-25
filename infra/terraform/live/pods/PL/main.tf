module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "PL"
  azure_location = "polandcentral"
  cors_origin   = "https://pl.storegrill.net"

  deploy_redis = var.deploy_redis
}
