module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "FR"
  azure_location = "francecentral"
  cors_origin   = "https://fr.storegrill.net"

  deploy_redis = var.deploy_redis
}
