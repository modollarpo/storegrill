const { spawnSync } = require('child_process');

process.chdir('C:\\Users\\USER\\Downloads\\storegrill\\infra\\terraform\\live\\pods\\NG');

const s = { name: 'acs-connection-string', uri: 'https://kv-storegrill-ng-prod.vault.azure.net/secrets/acs-connection-string/da9ed54470754b32a784265eef4113ba' };

const addr = `module.pod.azurerm_key_vault_secret.slots["${s.name}"]`;
console.log('addr:', addr);
console.log('uri:', s.uri);

const result = spawnSync('terraform', ['import', '-lock=false', '-input=false', addr, s.uri], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
});
console.log('exit:', result.status);
