module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "CA"
  azure_location = "canadacentral"
  cors_origin   = "https://ca.storegrill.net"

  deploy_redis = var.deploy_redis
}
