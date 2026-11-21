const test = require('node:test');
const assert = require('node:assert/strict');
const { clean } = require('xss-clean/lib/xss');

test('request-body cleaner encodes angle brackets instead of keeping HTML', () => {
  const cleaned = clean({
    content: '<p>Hello</p><script>alert(1)</script>',
    answer: '<img src=x onerror=alert(1)>',
    link: '<a href="javascript:alert(1)">x</a>',
  });

  assert.equal(cleaned.content.includes('<'), false);
  assert.equal(cleaned.answer.includes('<'), false);
  assert.equal(cleaned.link.includes('<'), false);
  assert.match(cleaned.content, /&lt;p>Hello&lt;\/p>&lt;script>alert\(1\)&lt;\/script>/);
});
