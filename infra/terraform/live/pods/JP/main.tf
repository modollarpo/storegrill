module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "JP"
  azure_location = "japaneast"
  cors_origin   = "https://jp.storegrill.net"

  deploy_redis = var.deploy_redis
}
