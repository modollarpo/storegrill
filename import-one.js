const { spawnSync } = require('child_process');
process.chdir('C:\\Users\\USER\\Downloads\\storegrill\\infra\\terraform\\live\\pods\\NG');

const name = process.argv[2];
const uri = process.argv[3];
const addr = `module.pod.azurerm_key_vault_secret.slots["${name}"]`;
console.log(`Importing ${addr}...`);
const r = spawnSync('terraform.exe', ['import', '-lock=false', '-input=false', addr, uri], {
  cwd: process.cwd(), stdio: 'inherit', shell: false, timeout: 240000,
});
console.log(`Exit: ${r.status}`);
process.exit(r.status || 0);
