const test = require('node:test');
const assert = require('node:assert/strict');
const {
  accessTokenVersionMatches,
  setCustomerAuthCookies,
  clearCustomerAuthCookies,
  setAdminAuthCookies,
  clearAdminAuthCookies,
} = require('./tokens');

function fakeRes() {
  const calls = [];
  return {
    calls,
    cookie(name, value, options) {
      calls.push({ op: 'set', name, value, options });
    },
    clearCookie(name, options) {
      calls.push({ op: 'clear', name, options });
    },
  };
}

function assertClearMatchesSet(setCall, clearCall) {
  assert.equal(clearCall.name, setCall.name);
  assert.equal(clearCall.options.httpOnly, setCall.options.httpOnly);
  assert.equal(clearCall.options.secure, setCall.options.secure);
  assert.equal(clearCall.options.sameSite, setCall.options.sameSite);
  assert.equal(clearCall.options.path, setCall.options.path);
  assert.equal(clearCall.options.httpOnly, true);
  assert.equal(clearCall.options.path, '/');
}

test('access token version 0 matches tokens issued before the claim existed', () => {
  assert.equal(accessTokenVersionMatches({}, 0), true);
  assert.equal(accessTokenVersionMatches({ tv: 0 }, 0), true);
  assert.equal(accessTokenVersionMatches({ tv: 0 }, 1), false);
  assert.equal(accessTokenVersionMatches({}, 1), false);
  assert.equal(accessTokenVersionMatches({ tv: 2 }, 2), true);
  assert.equal(accessTokenVersionMatches({ tv: 1.5 }, 1), false);
  assert.equal(accessTokenVersionMatches({ tv: 'nope' }, 0), false);
  assert.equal(accessTokenVersionMatches({ tv: '2' }, 2), true);
});

test('customer logout cookies use the same scope as the cookies that were set', () => {
  const res = fakeRes();
  setCustomerAuthCookies(res, 'access', 'refresh');
  clearCustomerAuthCookies(res);
  const sets = res.calls.filter((c) => c.op === 'set');
  const clears = res.calls.filter((c) => c.op === 'clear');
  assert.deepEqual(sets.map((c) => c.name), ['accessToken', 'refreshToken']);
  assert.deepEqual(clears.map((c) => c.name), ['accessToken', 'refreshToken']);
  sets.forEach((setCall, i) => assertClearMatchesSet(setCall, clears[i]));
});

test('admin logout cookies use the same scope as the cookies that were set', () => {
  const res = fakeRes();
  setAdminAuthCookies(res, 'access', 'refresh');
  clearAdminAuthCookies(res);
  const sets = res.calls.filter((c) => c.op === 'set');
  const clears = res.calls.filter((c) => c.op === 'clear');
  assert.deepEqual(sets.map((c) => c.name), ['adminAccessToken', 'adminRefreshToken']);
  assert.deepEqual(clears.map((c) => c.name), ['adminAccessToken', 'adminRefreshToken']);
  sets.forEach((setCall, i) => assertClearMatchesSet(setCall, clears[i]));
});
