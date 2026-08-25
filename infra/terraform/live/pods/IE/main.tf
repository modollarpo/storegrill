module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "IE"
  azure_location = "northeurope"
  cors_origin   = "https://ie.storegrill.net"

  deploy_redis = var.deploy_redis
}
