const { spawnSync } = require('child_process');
process.chdir('C:\\Users\\USER\\Downloads\\storegrill\\infra\\terraform\\live\\pods\\NG');

const targets = [
  'module.pod.azurerm_container_app_custom_domain.api',
  'module.pod.azurerm_container_app_custom_domain.next_apps["admin"]',
  'module.pod.azurerm_container_app_custom_domain.next_apps["vendor"]',
  'module.pod.azurerm_container_app_custom_domain.next_apps["web"]',
];

for (const addr of targets) {
  console.log(`\n=== Applying target: ${addr} ===`);
  const r = spawnSync('terraform.exe', ['apply', '-lock=false', '-input=false', '-auto-approve', '-target', addr], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    timeout: 600000,
  });
  console.log(`\nExit code: ${r.status}`);
  if (r.status !== 0) {
    console.error('FAILED on target:', addr);
    process.exit(1);
  }
}
console.log('\nAll NG custom domains applied successfully!');