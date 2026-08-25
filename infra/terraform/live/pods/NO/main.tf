module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "NO"
  azure_location = "norwayeast"
  cors_origin   = "https://no.storegrill.net"

  deploy_redis = var.deploy_redis
}
