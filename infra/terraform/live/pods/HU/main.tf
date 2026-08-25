module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "HU"
  azure_location = "germanywestcentral"
  cors_origin   = "https://hu.storegrill.net"

  deploy_redis = var.deploy_redis
}
