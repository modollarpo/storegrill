module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "LU"
  azure_location = "westeurope"
  cors_origin   = "https://lu.storegrill.net"

  deploy_redis = var.deploy_redis
}
