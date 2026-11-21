const test = require('node:test');
const assert = require('node:assert/strict');
const email = require('./email');

test('test and disposable addresses never hit SMTP', () => {
  assert.equal(email.isTestOrFakeRecipient('e2e.phase2@example.test'), true);
  assert.equal(email.isTestOrFakeRecipient('user@example.com'), true);
  assert.equal(email.isTestOrFakeRecipient('qa-audit@scosha.com'), true);
  assert.equal(email.isTestOrFakeRecipient(''), true);
  assert.equal(email.isTestOrFakeRecipient('customer@scosha.com'), false);
});

test('sendEmail skips test recipients without throwing', async () => {
  const result = await email.sendEmail({
    to: 'phase3@example.test',
    subject: 'Order placed',
    html: '<p>test</p>',
  });
  assert.equal(result.skipped, true);
  assert.equal(result.success, false);
});

test('sendEmailAsync never rejects', async () => {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sendEmailAsync hung')), 1000);
    email.sendEmailAsync({
      to: 'phase3@example.test',
      subject: 'VIP unlocked',
      html: '<p>test</p>',
    });
    setImmediate(() => {
      clearTimeout(timer);
      resolve();
    });
  });
});

test('parseAddress extracts display name and mailbox', () => {
  assert.deepEqual(email.parseAddress('SCOSHA <orders@scosha.com>'), {
    name: 'SCOSHA',
    address: 'orders@scosha.com',
  });
  assert.equal(email.parseAddress('plain@scosha.com').address, 'plain@scosha.com');
});

test('buildMailOptions includes reply-to, text body, and unsubscribe headers', () => {
  const mail = email.buildMailOptions({
    to: 'customer@scosha.com',
    subject: 'Order Confirmation SCO-1',
    html: '<p>Thanks for your order</p>',
  });
  assert.ok(mail.from);
  assert.ok(mail.replyTo);
  assert.match(mail.text, /Thanks for your order/);
  assert.match(mail.messageId, /^<.+@.+>$/);
  assert.ok(mail.headers['List-Unsubscribe']);
  assert.equal(mail.headers['Auto-Submitted'], 'auto-generated');
});
