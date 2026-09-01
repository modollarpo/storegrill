const fs = require('fs');

const certId = "/subscriptions/a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d/resourceGroups/rg-storegrill-prod-ng/providers/Microsoft.App/managedEnvironments/env-storegrill-prod-ng/certificates/storegrill-ng-cert-v2";

const body = {
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
};

fs.writeFileSync('body.json', JSON.stringify(body, null, 2));
console.log('JSON body written to body.json');
console.log('Content-Type: application/json');