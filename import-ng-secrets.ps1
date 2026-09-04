$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\Downloads\storegrill\infra\terraform\live\pods\NG"
$secrets = @(
  @{ name = "acs-connection-string"; uri = "https://kv-storegrill-ng-prod.vault.azure.net/secrets/acs-connection-string/da9ed54470754b32a784265eef4113ba" },
  @{ name = "paypal-client-id"; uri = "https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-id/645581d0607f4c84adc40ee4c7d6d423" },
  @{ name = "paypal-client-secret"; uri = "https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-secret/07190b8bb6b247ecbc254f5009f102c9" },
  @{ name = "stripe-secret-key"; uri = "https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-secret-key/55280128b30a43afbfe950dca824f68d" },
  @{ name = "stripe-webhook-secret"; uri = "https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-webhook-secret/3a9684f344cc40d88aa2bce6a9bfc1de" }
)

foreach ($s in $secrets) {
  $addr = "module.pod.azurerm_key_vault_secret.slots[`"$($s.name)`"]"
  Write-Host "Importing $addr..."
  terraform import -lock=false $addr $s.uri 2>&1
}
