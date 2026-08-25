module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "DE"
  azure_location = "germanywestcentral"
  cors_origin   = "https://de.storegrill.net"

  deploy_redis = var.deploy_redis
}
