@echo off
cd /d C:\Users\USER\Downloads\storegrill\infra\terraform\live\pods\NG
terraform import -lock=false "module.pod.azurerm_key_vault_secret.slots[\"acs-connection-string\"]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/acs-connection-string/da9ed54470754b32a784265eef4113ba"
terraform import -lock=false "module.pod.azurerm_key_vault_secret.slots[\"paypal-client-id\"]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-id/645581d0607f4c84adc40ee4c7d6d423"
terraform import -lock=false "module.pod.azurerm_key_vault_secret.slots[\"paypal-client-secret\"]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-secret/07190b8bb6b247ecbc254f5009f102c9"
terraform import -lock=false "module.pod.azurerm_key_vault_secret.slots[\"stripe-secret-key\"]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-secret-key/55280128b30a43afbfe950dca824f68d"
terraform import -lock=false "module.pod.azurerm_key_vault_secret.slots[\"stripe-webhook-secret\"]" "https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-webhook-secret/3a9684f344cc40d88aa2bce6a9bfc1de"
