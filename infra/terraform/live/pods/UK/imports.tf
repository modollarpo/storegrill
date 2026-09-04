import {
  to = module.pod.azurerm_container_app_custom_domain.next_apps["web"]
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-web-prod-uk/customDomainName/uk.storegrill.net"
}

import {
  to = module.pod.azurerm_container_app_custom_domain.next_apps["admin"]
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-admin-prod-uk/customDomainName/uk-admin.storegrill.net"
}

import {
  to = module.pod.azurerm_container_app_custom_domain.next_apps["vendor"]
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-vendor-prod-uk/customDomainName/uk-vendor.storegrill.net"
}

import {
  to = module.pod.azurerm_container_app_custom_domain.api
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-api-prod-uk/customDomainName/uk-api.storegrill.net"
}

import {
  to = module.pod.azurerm_container_app_custom_domain.web_extra["storegrill.net"]
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-web-prod-uk/customDomainName/storegrill.net"
}

import {
  to = module.pod.azurerm_container_app_custom_domain.web_extra["www.storegrill.net"]
  id = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-uk/providers/Microsoft.App/containerApps/app-storegrill-web-prod-uk/customDomainName/www.storegrill.net"
}
