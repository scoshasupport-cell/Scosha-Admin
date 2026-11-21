const test = require('node:test');
const assert = require('node:assert/strict');
const { assertIsolatedTestDatabase, assertConnectedTestDatabase, databaseName } = require('./testDatabase');

test('database name is read from the URL path only', () => {
  assert.equal(
    databaseName('mysql://user:secret@localhost:3306/scosha_test?connection_limit=5'),
    'scosha_test'
  );
  assert.equal(databaseName(''), '');
});

test('integration tests abort when the test URL is missing', () => {
  assert.throws(
    () => assertIsolatedTestDatabase({ DATABASE_URL: 'mysql://user:secret@localhost:3306/scosha' }),
    /TEST_DATABASE_URL is not set/
  );
});

test('integration tests abort when the test URL points at the development schema', () => {
  assert.throws(
    () => assertIsolatedTestDatabase({
      TEST_DATABASE_URL: 'mysql://user:secret@localhost:3306/scosha',
    }),
    /Expected scosha_test/
  );
});

test('integration tests accept only the scosha_test schema', () => {
  const url = 'mysql://user:secret@localhost:3306/scosha_test';
  assert.equal(assertIsolatedTestDatabase({ TEST_DATABASE_URL: url }), url);
});

test('a live connection to the development schema aborts before writes', async () => {
  const prisma = {
    async $queryRawUnsafe() {
      return [{ name: 'scosha' }];
    },
  };
  await assert.rejects(() => assertConnectedTestDatabase(prisma), /Connected database is "scosha"/);
});

test('a live connection to scosha_test is accepted', async () => {
  const prisma = {
    async $queryRawUnsafe() {
      return [{ name: 'scosha_test' }];
    },
  };
  assert.equal(await assertConnectedTestDatabase(prisma), 'scosha_test');
});
