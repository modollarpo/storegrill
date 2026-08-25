module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "EE"
  azure_location = "swedencentral"
  cors_origin   = "https://ee.storegrill.net"

  deploy_redis = var.deploy_redis
}
