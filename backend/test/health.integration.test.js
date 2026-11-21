const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { fork } = require('child_process');

function startWithoutDatabase() {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, 'fixtures', 'app-without-database.js'), [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    const timer = setTimeout(() => reject(new Error(`child did not start: ${output}`)), 20000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/PORT=(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ child, port: Number(match[1]) });
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`child exited early (${code}): ${output}`));
    });
  });
}

test('health contract with MySQL unreachable: live 200, ready 503, health 503', async () => {
  const { child, port } = await startWithoutDatabase();
  try {
    const base = `http://127.0.0.1:${port}/api/v1/health`;

    const live = await fetch(`${base}/live`);
    assert.equal(live.status, 200);

    const ready = await fetch(`${base}/ready`);
    const readyBody = await ready.json();
    assert.equal(ready.status, 503);
    assert.equal(readyBody.success, false);
    assert.equal(readyBody.data.database.status, 'disconnected');

    const health = await fetch(base);
    const healthBody = await health.json();
    assert.equal(health.status, 503);
    assert.equal(healthBody.data.status, 'degraded');

    // A database-backed route must fail closed with a generic 500, not hang or leak the DSN.
    const products = await fetch(`http://127.0.0.1:${port}/api/v1/products?limit=1`);
    const productsBody = await products.json();
    assert.equal(products.status, 500);
    assert.equal(productsBody.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(productsBody).includes('nobody:nothing'));
  } finally {
    child.send('stop');
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill();
        resolve();
      }, 5000);
      child.on('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
});
