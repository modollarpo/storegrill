module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "SI"
  azure_location = "westeurope"
  cors_origin   = "https://si.storegrill.net"

  deploy_redis = var.deploy_redis
}
