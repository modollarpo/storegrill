module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "PT"
  azure_location = "spaincentral"
  cors_origin   = "https://pt.storegrill.net"

  deploy_redis = var.deploy_redis
}
