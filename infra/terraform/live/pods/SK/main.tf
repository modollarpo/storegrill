module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "SK"
  azure_location = "germanywestcentral"
  cors_origin   = "https://sk.storegrill.net"

  deploy_redis = var.deploy_redis
}
