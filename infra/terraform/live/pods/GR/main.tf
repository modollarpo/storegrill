module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "GR"
  azure_location = "italynorth"
  cors_origin   = "https://gr.storegrill.net"

  deploy_redis = var.deploy_redis
}
