module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "ES"
  azure_location = "spaincentral"
  cors_origin   = "https://es.storegrill.net"

  deploy_redis = var.deploy_redis
}
