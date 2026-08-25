module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "AT"
  azure_location = "germanywestcentral"
  cors_origin   = "https://at.storegrill.net"

  deploy_redis = var.deploy_redis
}
