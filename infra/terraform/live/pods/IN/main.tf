module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "IN"
  azure_location = "centralindia"
  cors_origin   = "https://in.storegrill.net"

  deploy_redis = var.deploy_redis
}
