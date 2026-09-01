const { spawnSync } = require('child_process');
process.chdir('C:\\Users\\USER\\Downloads\\storegrill\\infra\\terraform\\live\\pods\\NG');

const secrets = [
  { name: 'paypal-client-id', uri: 'https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-id/645581d0607f4c84adc40ee4c7d6d423' },
  { name: 'paypal-client-secret', uri: 'https://kv-storegrill-ng-prod.vault.azure.net/secrets/paypal-client-secret/07190b8bb6b247ecbc254f5009f102c9' },
  { name: 'stripe-secret-key', uri: 'https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-secret-key/55280128b30a43afbfe950dca824f68d' },
  { name: 'stripe-webhook-secret', uri: 'https://kv-storegrill-ng-prod.vault.azure.net/secrets/stripe-webhook-secret/3a9684f344cc40d88aa2bce6a9bfc1de' }
];

// Just do the first one
const s = secrets[0];
const addr = `module.pod.azurerm_key_vault_secret.slots["${s.name}"]`;
console.log(`Importing ${addr}...`);
const r = spawnSync('terraform.exe', ['import', '-lock=false', '-input=false', addr, s.uri], {
  cwd: process.cwd(), stdio: 'inherit', shell: false,
});
console.log(`Exit: ${r.status}`);
