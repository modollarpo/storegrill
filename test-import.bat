@echo off
cd /d C:\Users\USER\Downloads\storegrill\infra\terraform\live\pods\NG
terraform import -lock=false -input=false "module.pod.azurerm_key_vault_secret.slots[""acs-connection-string""]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/acs-connection-string/da9ed54470754b32a784265eef4113ba"
