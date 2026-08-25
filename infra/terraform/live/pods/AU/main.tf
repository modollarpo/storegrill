module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "AU"
  azure_location = "australiaeast"
  cors_origin   = "https://au.storegrill.net"

  deploy_redis = var.deploy_redis
}
