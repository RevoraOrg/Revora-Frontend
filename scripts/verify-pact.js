const { execFileSync } = require('node:child_process');

const brokerUrl = process.env.PACT_BROKER_URL;
if (!brokerUrl) {
  console.error('PACT_BROKER_URL must be set');
  process.exit(1);
}

const args = [
  'pact-broker',
  'verify',
  '--provider-base-url', process.env.PROVIDER_BASE_URL || 'http://127.0.0.1:3000',
  '--broker-url', brokerUrl,
  '--provider', 'notifications-service',
  '--consumer-version', process.env.GITHUB_SHA || 'local',
  '--publish-verification-results',
];

execFileSync('npx', args, { stdio: 'inherit' });
