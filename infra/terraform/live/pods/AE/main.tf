module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "AE"
  azure_location = "uaenorth"
  cors_origin   = "https://ae.storegrill.net"

  deploy_redis = var.deploy_redis
}
