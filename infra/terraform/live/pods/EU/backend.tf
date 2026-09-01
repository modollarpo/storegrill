terraform {
  backend "azurerm" {
    resource_group_name  = "rg-storegrill-tfstate"
    storage_account_name = "ststoregrilltfstate"
    container_name       = "tfstate"
    key                  = "pods/eu.tfstate"
    subscription_id      = "a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d"
  }
}

provider "azurerm" {
  subscription_id = "a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d"
  features {}
}
