module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "LV"
  azure_location = "swedencentral"
  cors_origin   = "https://lv.storegrill.net"

  deploy_redis = var.deploy_redis
}
