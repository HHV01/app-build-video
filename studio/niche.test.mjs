import test from 'node:test';
import assert from 'node:assert/strict';
import { findTemplate, channelShelf, shelfGate, probeGate, nextStage, lockedNiche, groupCountGate } from './rx.mjs';
const now = Date.parse('2026-10-05');
const mk = (ch, n, days, views) => Array.from({ length: n }, (_, i) => ({ id: ch + i, channelId: ch, channelTitle: ch, title: 't', views, publishedAt: new Date(now - (days + i) * 86400000).toISOString() }));

test('khuôn: cụm dài nhất lặp quá nửa', () => {
  const titles = Array.from({ length: 20 }, (_, i) => i < 12 ? `Tại sao người giàu ${i}` : `Video khác ${i}`);
  const r = findTemplate(titles);
  assert.equal(r.template, 'tại sao người giàu'); assert.equal(r.matches, 12);
});
test('khuôn: đúng 50% thì KHÔNG đủ, trả không có khuôn', () => {
  const titles = Array.from({ length: 20 }, (_, i) => i < 10 ? `Cách làm ${i}` : `Khác hoàn toàn ${i}`);
  assert.equal(findTemplate(titles).template, null);
});
test('kênh: loại video chưa 90 ngày, ngưỡng 5 video và trung vị 20.000', () => {
  const ok = channelShelf([...mk('a', 6, 100, 30000), ...mk('a', 4, 10, 1)], now)[0];
  assert.equal(ok.pass, true); assert.equal(ok.matureCount, 6); assert.equal(ok.videos[0].multiple, 1);
  assert.equal(channelShelf(mk('b', 4, 100, 50000), now)[0].pass, false);
  assert.equal(channelShelf(mk('c', 8, 100, 19999), now)[0].pass, false);
});
test('cổng kho: cần 3 kênh', () => {
  const ch = channelShelf([...mk('a', 6, 100, 30000), ...mk('b', 6, 100, 30000)], now);
  assert.equal(shelfGate(ch).passed, false);
  assert.equal(shelfGate(channelShelf([...mk('a', 6, 100, 3e4), ...mk('b', 6, 100, 3e4), ...mk('c', 6, 100, 3e4)], now)).passed, true);
});
test('gõ thử: 11/20 qua, 10/20 trượt, thiếu video báo lỗi', () => {
  const v = n => Array.from({ length: 20 }, (_, i) => i < n ? 20001 : 100);
  assert.equal(probeGate(v(11)).passed, true); assert.equal(probeGate(v(10)).passed, false);
  assert.ok(probeGate([1, 2]).error);
});
test('nhóm 4–7 và máy trạng thái', () => {
  assert.equal(groupCountGate([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'unclassified' }]).passed, false);
  assert.equal(nextStage({}), 'field');
  const p = { niche: Object.fromEntries(['field', 'template', 'shelf', 'groups', 'probe', 'topics'].map(s => [s, { passed: true }])) };
  p.niche.template.value = 'x'; p.niche.groups.chosen = 'g'; p.niche.topics.chosen = ['a'];
  assert.equal(lockedNiche(p).template, 'x'); assert.equal(lockedNiche({}), null);
});
