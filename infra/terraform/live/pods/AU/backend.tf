terraform {
  backend "azurerm" {
    resource_group_name  = "rg-storegrill-tfstate"
    storage_account_name = "ststoregrilltfstate"
    container_name       = "tfstate"
    key                  = "pods/au.tfstate"
  }
}

provider "azurerm" {
  features {}
}
