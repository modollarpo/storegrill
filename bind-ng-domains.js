const { execSync, writeFileSync } = require('child_process');
const fs = require('fs');
const certId = '/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-ng/providers/Microsoft.App/managedEnvironments/env-storegrill-prod-ng/certificates/storegrill-ng-cert-v2';
const rg = 'rg-storegrill-prod-ng';
const sub = 'a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d';

const apps = [
  { name: 'app-storegrill-web-prod-ng', domain: 'ng.storegrill.net' },
  { name: 'app-storegrill-admin-prod-ng', domain: 'ng-admin.storegrill.net' },
  { name: 'app-storegrill-vendor-prod-ng', domain: 'ng-vendor.storegrill.net' },
  { name: 'app-storegrill-api-prod-ng', domain: 'ng-api.storegrill.net' },
];

for (const app of apps) {
  const body = JSON.stringify({
    properties: {
      configuration: {
        ingress: {
          customDomains: [
            {
              name: app.domain,
              bindingType: 'SniEnabled',
              certificateId: certId
            }
          ]
        }
      }
    }
  });

  const bodyFile = `body-${app.name}.json`;
  fs.writeFileSync(bodyFile, body, 'utf8');

  const apiUrl = `https://management.azure.com/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.App/containerApps/${app.name}?api-version=2024-03-01`;

  console.log(`Binding ${app.domain} to ${app.name}...`);
  try {
    const result = execSync(
      `az rest --method PATCH --uri "${apiUrl}" --body @${bodyFile} --headers "Content-Type=application/json" -o json`,
      { encoding: 'utf8', timeout: 120000 }
    );
    const parsed = JSON.parse(result);
    const domains = parsed.properties?.configuration?.customDomains;
    console.log(`  OK - customDomains:`, JSON.stringify(domains));
  } catch (e) {
    console.error(`  FAILED:`, e.stderr?.slice(0, 500) || e.message.slice(0, 500));
    process.exit(1);
  } finally {
    try { fs.unlinkSync(bodyFile); } catch(_) {}
  }
}
console.log('\nAll NG custom domains bound.');
