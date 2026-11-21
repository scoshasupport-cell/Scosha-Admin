/**
 * Apply committed migrations to scosha_test only.
 * Usage: set TEST_DATABASE_URL, then `npm run db:migrate:test`.
 */
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { assertIsolatedTestDatabase } = require('../config/testDatabase');

let testUrl;
try {
  testUrl = assertIsolatedTestDatabase();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'deploy'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: testUrl },
  }
);

process.exit(result.status == null ? 1 : result.status);
