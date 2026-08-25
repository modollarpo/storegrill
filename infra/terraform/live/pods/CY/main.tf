module "pod" {
  source = "../../modules/pod"

  environment   = var.environment
  region_key    = "CY"
  azure_location = "westeurope"
  cors_origin   = "https://cy.storegrill.net"

  deploy_redis = var.deploy_redis
}
