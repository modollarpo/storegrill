module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "HR"
  azure_location = "westeurope"
  cors_origin   = "https://hr.storegrill.net"

  deploy_redis = var.deploy_redis
}
