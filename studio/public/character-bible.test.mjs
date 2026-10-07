import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCharacterBible, composeImagePrompt, validateSceneTags, tagMenu, hasIdentity, slug } from './character-bible.mjs';

const text = readFileSync(new URL('./schoolboy-bible.txt', import.meta.url), 'utf8');
const { character: c, errors } = parseCharacterBible(text);

test('parse: đủ phần, không lỗi', () => {
  assert.deepEqual(errors, []);
  assert.equal(c.name, 'Cậu bé học sinh');
  assert.ok(c.identity.startsWith('Schoolboy stickman character:'));
  assert.ok(!c.style.includes('REPLACE'), 'ghi chú [IF THE CHANNEL…] phải bị bỏ khỏi style');
  assert.equal(c.doNotChange.length, 6);
  assert.deepEqual([c.expressions.length, c.poses.length, c.outfits.length, c.props.length, c.graphics.length], [8, 8, 4, 7, 9]);
});
test('parse: tag, nhãn tiếng Việt, mô tả', () => {
  const sad = c.expressions.find(t => t.tag === 'sad');
  assert.equal(sad.vi, 'buồn'); assert.match(sad.desc, /tears/);
  assert.ok(c.poses.find(t => t.tag === 'thumbs-up' && t.desc === ''));
  assert.ok(c.props.find(t => t.tag === 'laptop-bulb'));
  assert.ok(c.outfits.find(t => t.tag === 'default'));
  assert.ok(c.graphics.find(t => t.tag === 'exclamation'));
});
test('parse: thiếu identity hoặc default outfit báo lỗi', () => {
  const bad = parseCharacterBible(text.replace(/## 2\.[\s\S]*?## 3\./, '## 3.'));
  assert.ok(bad.errors.some(e => e.includes('IDENTITY')));
  const nodef = parseCharacterBible(text.replace('- default (thường ngày)', '- everyday (thường ngày)'));
  assert.ok(nodef.errors.some(e => e.includes('default')));
});
test('compose: identity nguyên văn, đúng thứ tự, outfit default không chèn', () => {
  const p = composeImagePrompt({ expression: 'sad', prop: 'empty wallet', setting: 'plain white room', camera: 'medium' }, c);
  assert.ok(hasIdentity(p, c));
  assert.ok(p.startsWith(c.style));
  const order = ['Expression:', 'Prop:', 'Setting:', 'Camera:'].map(k => p.indexOf(k));
  assert.deepEqual([...order].sort((a, b) => a - b), order); assert.ok(order.every(i => i > 0));
  assert.ok(!p.includes('Outfit:'));
});
test('compose: outfit khác default được chèn; overlay; graphics', () => {
  const p = composeImagePrompt({ expression: 'thinking', pose: 'laptop', outfit: 'glasses', graphics: ['question mark'], setting: 'desk', camera: 'close-up', overlay: 'Chi tiêu?' }, c);
  assert.match(p, /Outfit: glasses/); assert.match(p, /Extra graphics: question mark/); assert.match(p, /Text in image: "Chi tiêu\?"/);
});
test('compose: cảnh không nhân vật không có identity', () => {
  const p = composeImagePrompt({ noCharacter: true, subject: 'A pie chart of monthly spending', setting: 'plain white background', camera: 'wide' }, c);
  assert.ok(!hasIdentity(p, c) && !p.includes('Schoolboy'));
});
test('compose: style kênh có thể ghi đè', () => {
  const p = composeImagePrompt({ expression: 'happy', pose: 'thumbs-up', camera: 'wide' }, c, 'WHITE BACKGROUND minimal stickman.');
  assert.ok(p.startsWith('WHITE BACKGROUND minimal stickman.')); assert.ok(!p.includes('Flat 2D'));
});
test('validate: thẻ lạ bị lỗi, thiếu expression, thiếu pose/prop', () => {
  assert.ok(validateSceneTags({ expression: 'furious', pose: 'laptop', camera: 'wide' }, c).errors.some(e => e.includes('furious')));
  assert.ok(validateSceneTags({ pose: 'laptop' }, c).errors.includes('Thiếu expression.'));
  assert.ok(validateSceneTags({ expression: 'sad' }, c).errors.includes('Cần pose hoặc prop.'));
  assert.deepEqual(validateSceneTags({ expression: 'sad', prop: 'empty wallet', camera: 'wide', setting: 'plain room' }, c).errors, []);
});
test('validate: setting mô tả ngoại hình + lặp biểu cảm + setting dài', () => {
  const w = validateSceneTags({ expression: 'sad', pose: 'laptop', setting: 'boy with brown hair in a classroom' }, c).warnings;
  assert.ok(w.some(x => x.includes('ngoại hình')));
  const prev = [{ expression: 'sad' }, { expression: 'sad' }, { expression: 'sad' }];
  assert.ok(validateSceneTags({ expression: 'sad', pose: 'laptop' }, c, prev).warnings.some(x => x.includes('liên tiếp')));
  assert.ok(validateSceneTags({ expression: 'sad', pose: 'laptop', setting: 'one two three four five six seven eight nine ten eleven twelve thirteen' }, c).warnings.some(x => x.includes('12 từ')));
});
test('tagMenu gọn và slug ổn định', () => {
  assert.ok(tagMenu(c).includes('expression: happy | laughing'));
  assert.equal(slug('Laptop + Bulb'), 'laptop-bulb');
});
