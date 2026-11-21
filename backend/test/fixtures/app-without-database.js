/**
 * Boots the real app with DATABASE_URL pointed at a port nothing listens on, so the
 * health contract can be observed with MySQL genuinely unreachable. Prints the port.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.EMAIL_ENABLED = '0';
process.env.DATABASE_URL = 'mysql://nobody:nothing@127.0.0.1:1/unreachable?connect_timeout=2';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-test-refresh-secret';

// Keep dotenv from reading the real .env of the backend folder.
process.chdir(require('os').tmpdir());

const app = require('../../src/app');
const server = app.listen(0, '127.0.0.1', () => {
  process.stdout.write(`PORT=${server.address().port}\n`);
});

process.on('message', (msg) => {
  if (msg === 'stop') server.close(() => process.exit(0));
});
