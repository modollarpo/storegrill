const { execSync } = require('child_process');
const fs = require('fs');

const certId = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-ng/providers/Microsoft.App/managedEnvironments/env-storegrill-prod-ng/certificates/storegrill-ng-cert-v2";

const body = JSON.stringify({
  properties: {
    configuration: {
      ingress: {
        customDomains: [
          {
            name: "ng.storegrill.net",
            bindingType: "SniEnabled",
            certificateId: certId
          }
        ]
      }
    }
  }
});

fs.writeFileSync('body.json', body);

try {
  const result = execSync(
    'az rest --method PATCH --uri "https://management.azure.com/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-ng/providers/Microsoft.App/containerApps/app-storegrill-web-prod-ng?api-version=2024-03-01" --body @body.json -o json',
    { cwd: 'C:\\Users\\USER\\Downloads\\storegrill', encoding: 'utf8', timeout: 120000 }
  );
  console.log('SUCCESS:');
  console.log(result);
} catch (e) {
  console.error('FAILED:');
  console.error(e.stdout || e.stderr || String(e));
}