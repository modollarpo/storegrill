terraform {
  backend "azurerm" {
    resource_group_name  = "rg-storegrill-tfstate"
    storage_account_name = "ststoregrilltfstate"
    container_name       = "tfstate"
    key                  = "global-edge.tfstate"
  }

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "cloudflare" {
  # Global API key auth is read from CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL env vars
}
