import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtmlSnippet, stageHtml, validateHtmlScene } from './html-scenes.mjs';

test('lam sach HTML canh: bo script, handler va tham chieu mang', () => {
  const out = sanitizeHtmlSnippet('<h1>Hello</h1><script>alert(1)</script><p onclick="x()">Text</p><img src="https://x/y.png"><style>p{color:red}</style>');
  assert.match(out, /<h1>Hello<\/h1>/);
  assert.match(out, /<style>p/);
  assert(!out.includes('<script'));
  assert(!out.includes('onclick'));
  assert(!out.includes('https://x/y.png'));
  assert.throws(() => sanitizeHtmlSnippet('   '), /rỗng/);
  assert.throws(() => sanitizeHtmlSnippet('<script>x</script>'), /rỗng sau khi làm sạch/);
});

test('boc khung 1280x720 va kiem thoi luong canh HTML', () => {
  const doc = stageHtml('<p class="hv-num">50%</p>');
  assert.match(doc, /1280px/);
  assert.match(doc, /50%/);
  assert.equal(validateHtmlScene({ html: '<p>A</p>', duration: 8 }).duration, 8);
  assert.throws(() => validateHtmlScene({ html: '<p>A</p>', duration: 2 }), /3–20/);
  assert.throws(() => validateHtmlScene({ html: '<p>A</p>', duration: 25 }), /3–20/);
});
