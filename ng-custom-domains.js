const { spawnSync } = require('child_process');
process.chdir('C:\\Users\\USER\\Downloads\\storegrill\\infra\\terraform\\live\\pods\\NG');

const targets = [
  'module.pod.azurerm_container_app_custom_domain.api',
  'module.pod.azurerm_container_app_custom_domain.next_apps["admin"]',
  'module.pod.azurerm_container_app_custom_domain.next_apps["vendor"]',
  'module.pod.azurerm_container_app_custom_domain.next_apps["web"]',
];

const args = ['apply', '-lock=false', '-input=false', '-auto-approve'];
for (const t of targets) {
  args.push('-target', t);
}

console.log('Running terraform apply with targets for custom domains only...');
const r = spawnSync('terraform.exe', args, { cwd: process.cwd(), stdio: 'inherit', shell: false });
console.log('Exit:', r.status);
process.exit(r.status || 0);
