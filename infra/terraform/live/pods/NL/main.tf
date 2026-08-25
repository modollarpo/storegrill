module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "NL"
  azure_location = "westeurope"
  cors_origin   = "https://nl.storegrill.net"

  deploy_redis = var.deploy_redis
}
