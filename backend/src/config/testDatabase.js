/**
 * Integration tests and test-schema migrations must name the disposable schema.
 * A missing URL must not fall through to the development DATABASE_URL.
 */
const TEST_SCHEMA = 'scosha_test';

function databaseName(url) {
  if (!url) return '';
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, '').split('?')[0]);
  } catch {
    return '';
  }
}

function assertIsolatedTestDatabase(env = process.env) {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Refusing to run because the development database must not be written.'
    );
  }
  const name = databaseName(url);
  if (name !== TEST_SCHEMA) {
    throw new Error(
      `TEST_DATABASE_URL selects "${name || 'an unreadable database name'}". Expected ${TEST_SCHEMA}.`
    );
  }
  return url;
}

async function assertConnectedTestDatabase(prisma) {
  const rows = await prisma.$queryRawUnsafe('SELECT DATABASE() AS name');
  const name = rows?.[0]?.name || '';
  if (name !== TEST_SCHEMA) {
    throw new Error(
      `Connected database is "${name || 'unknown'}". Refusing to write. Expected ${TEST_SCHEMA}.`
    );
  }
  return name;
}

module.exports = {
  TEST_SCHEMA,
  databaseName,
  assertIsolatedTestDatabase,
  assertConnectedTestDatabase,
};
