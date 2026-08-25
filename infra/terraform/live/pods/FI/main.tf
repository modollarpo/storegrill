module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "FI"
  azure_location = "finlandcentral"
  cors_origin   = "https://fi.storegrill.net"

  deploy_redis = var.deploy_redis
}
