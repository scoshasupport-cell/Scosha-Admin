const test = require('node:test');
const assert = require('node:assert/strict');
const money = require('./money');

test('adding cents does not drift like floating point', () => {
  assert.equal(0.1 + 0.2 === 0.3, false);
  assert.equal(money.sum(0.1, 0.2), 0.3);
  assert.equal(money.sum(19.99, 19.99, 19.99), 59.97);
  assert.equal(money.sum(1.1, 2.2), 3.3);
});

test('line totals multiply exactly', () => {
  assert.equal(money.lineTotal(19.99, 3), 59.97);
  assert.equal(money.lineTotal(0.1, 3), 0.3);
  assert.equal(money.lineTotal(4.35, 100), 435);
  assert.equal(money.lineTotal(10, 0), 0);
  assert.equal(money.lineTotal(10, -2), 0);
  assert.equal(money.lineTotal(10, 2.9), 20);
});

test('percent and rate round to the cent', () => {
  assert.equal(money.percentOf(59.97, 10), 6);
  assert.equal(money.percentOf(33.33, 15), 5);
  assert.equal(money.applyRate(100, 0.0825), 8.25);
  assert.equal(money.applyRate(19.99, 0.0825), 1.65);
});

test('subtract never leaves fractional cents', () => {
  assert.equal(money.subtract(100, 33.33), 66.67);
  assert.equal(money.subtract(0.3, 0.1), 0.2);
  assert.equal(money.subtract(5, 7), -2);
});

test('round2 and invalid input', () => {
  assert.equal(money.round2(1.005), 1.01);
  assert.equal(money.round2('12.345'), 12.35);
  assert.equal(money.round2(NaN), 0);
  assert.equal(money.round2(undefined), 0);
  assert.equal(money.toCents('abc'), 0);
});

test('min and max compare in cents', () => {
  assert.equal(money.min(10, 9.99), 9.99);
  assert.equal(money.max(0, -5), 0);
});
