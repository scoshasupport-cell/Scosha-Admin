const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionOrderStatus } = require('./commerce');

test('order status moves forward and can be cancelled before delivery', () => {
  assert.equal(canTransitionOrderStatus('pending', 'confirmed'), true);
  assert.equal(canTransitionOrderStatus('pending', 'cancelled'), true);
  assert.equal(canTransitionOrderStatus('processing', 'shipped'), true);
  assert.equal(canTransitionOrderStatus('shipped', 'delivered'), true);
});

test('order status cannot move backward or leave a terminal state', () => {
  assert.equal(canTransitionOrderStatus('delivered', 'processing'), false);
  assert.equal(canTransitionOrderStatus('delivered', 'pending'), false);
  assert.equal(canTransitionOrderStatus('shipped', 'pending'), false);
  assert.equal(canTransitionOrderStatus('cancelled', 'processing'), false);
  assert.equal(canTransitionOrderStatus('refunded', 'delivered'), false);
  assert.equal(canTransitionOrderStatus('pending', 'pending'), false);
});

test('refund is only allowed after the order has shipped or been delivered', () => {
  assert.equal(canTransitionOrderStatus('pending', 'refunded'), false);
  assert.equal(canTransitionOrderStatus('shipped', 'refunded'), true);
  assert.equal(canTransitionOrderStatus('delivered', 'refunded'), true);
});
