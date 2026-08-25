module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "CZ"
  azure_location = "germanywestcentral"
  cors_origin   = "https://cz.storegrill.net"

  deploy_redis = var.deploy_redis
}
