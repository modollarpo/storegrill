module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "CH"
  azure_location = "switzerlandnorth"
  cors_origin   = "https://ch.storegrill.net"

  deploy_redis = var.deploy_redis
}
