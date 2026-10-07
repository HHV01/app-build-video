import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GATES, HIT_FLOOR_VIEWS, describeGate, analyzeChannels, videoPool,
  analyzeGroups, closeGroups, nextHook, HOOK_TYPES, thumbLineCheck,
  batchScenes, suggestClips, assetCode, sceneFileName, clipFileName,
  referencePlan, estimateRead, timingCheck, packagingBlockers,
  quotaSummary, QUOTA, MUSIC_PLAN, COST_REFERENCE,
  THUMB_LAYOUTS, findLayout, SUB_LINES, BACKGROUND_REFERENCE_MIN_SCENES,
  FULL_BLEED, NO_TEXT_IN_IMAGE, REFERENCE_RULE,
} from './rx.mjs';

const NOW = Date.parse('2026-10-01T00:00:00Z');
const days = n => new Date(NOW - n * 86400000).toISOString();
const vid = (id, channelId, channelTitle, views, ageDays, title = `t ${id}`, publishedAt) => ({
  id, channelId, channelTitle, views, title, publishedAt: publishedAt || days(ageDays),
});

test('Cổng ngưỡng mặc định đúng như app tham khảo', () => {
  assert.equal(describeGate('vua'), `video qua ${GATES.vua.minVideoAgeDays} ngày · kênh ≥${GATES.vua.minChannelHits} video đã ăn · nhóm ≥${GATES.vua.minGroupVideos} video và ≥${GATES.vua.minGroupChannels} kênh`);
  assert.equal(describeGate(undefined), describeGate('vua'));
  assert.equal(describeGate({ id: 'tu', minVideoAgeDays: 45 }), describeGate({ id: 'tu', minVideoAgeDays: 45, minChannelHits: 3, minGroupVideos: 4, minGroupChannels: 2 }));
  assert.equal(describeGate({ minChannelHits: -5 }).includes('-5'), false);
});

test('Bảng kênh: chỉ video quá ngày cổng mới tính, trung vị phải vượt sàn view', () => {
  const videos = [
    vid('a1', 'A', 'Alpha', 100000, 400, 'The Entire History of Rome'),
    vid('a2', 'A', 'Alpha', 30000, 380, 'The Entire History of Japan'),
    vid('a3', 'A', 'Alpha', 25000, 300, 'The Entire History of Israel'),
    vid('a4', 'A', 'Alpha', 40000, 200, 'The Entire History of Lima'),
    vid('a5', 'A', 'Alpha', 9000000, 3),            // quá mới: không tính
    vid('b1', 'B', 'Beta', 21000, 400), vid('b2', 'B', 'Beta', 20000, 380),
    vid('b3', 'B', 'Beta', 19000, 360), vid('b4', 'B', 'Beta', 18000, 340),
    vid('c1', 'C', 'Gamma', 900000, 4), vid('c2', 'C', 'Gamma', 800000, 5), vid('c3', 'C', 'Gamma', 700000, 6),
  ];
  const { channels } = analyzeChannels(videos, { gate: 'vua', now: NOW, template: 'entire history of' });
  const a = channels.find(c => c.id === 'A');
  assert.equal(a.matureVideos, 4, 'video mới không được tính vào mẫu');
  assert.equal(a.hits, 4);
  assert.equal(a.templateVideos, 4);
  assert.equal(a.gatePass, true);
  const b = channels.find(c => c.id === 'B');
  assert.equal(b.hits, 2);
  assert.equal(b.gatePass, false);
  assert.match(b.gateReason, /3 video đã ăn/);
  assert.match(b.gateReason, new RegExp(HIT_FLOOR_VIEWS.toLocaleString('vi-VN')));
  const c = channels.find(c => c.id === 'C');
  assert.equal(c.medianViews, null);
  assert.equal(c.gatePass, false, 'kênh toàn video mới thì không có bằng chứng');
  assert.equal(channels[0].gatePass, true, 'kênh đạt cửa xếp lên đầu');
});

test('Kho gộp chỉ lấy video của kênh đã chọn và sắp theo bội số', () => {
  const videos = [
    { ...vid('a1', 'A', 'Alpha', 100, 400), multiple: 3 },
    { ...vid('a2', 'A', 'Alpha', 100, 400), multiple: 1 },
    { ...vid('b1', 'B', 'Beta', 100, 400), multiple: 9 },
    { ...vid('b2', 'B', 'Beta', 100, 2), multiple: 99 },
  ];
  const pool = videoPool(videos, { now: NOW, channelIds: ['A'] });
  assert.deepEqual(pool.map(v => v.id), ['a1', 'a2']);
  assert.equal(pool[0].multiple, 3);
});

test('Nhóm: cửa ≥4 video VÀ ≥2 kênh, nhóm một kênh bị cảnh báo bẫy', () => {
  const v = [
    vid('1', 'A', 'Alpha', 100, 400), vid('2', 'B', 'Beta', 100, 400),
    vid('3', 'A', 'Alpha', 100, 400), vid('4', 'A', 'Alpha', 100, 400),
    vid('5', 'A', 'Alpha', 100, 400), vid('6', 'A', 'Alpha', 100, 400),
    vid('7', 'C', 'Gamma', 100, 400), vid('8', 'C', 'Gamma', 100, 400),
  ].map((x, i) => ({ ...x, multiple: i % 3 === 0 ? 1.27 : 1.02 }));
  const { groups, proximity } = analyzeGroups([
    { id: 'g1', name: 'ĐẾ CHẾ', videoIds: ['1', '2', '3', '4'] },
    { id: 'g2', name: 'THÀNH PHỐ', videoIds: ['5', '6', '7', '8'] },
    { id: 'g3', name: 'MỘT KÊNH', videoIds: ['5', '6', '3', '4'] },
  ], v, { now: NOW });
  assert.equal(groups.find(g => g.id === 'g1').gatePass, true);
  assert.equal(groups.find(g => g.id === 'g2').gatePass, true);
  assert.equal(groups.find(g => g.id === 'g3').gatePass, false, 'một kênh không qua được cửa kênh');
  assert.equal(groups.find(g => g.id === 'g3').channels, 1);
  assert.ok(groups.find(g => g.id === 'g3').clusterWarning, 'nhóm đủ số video nhưng chỉ một tên group phải cảnh báo');
  assert.equal(groups.find(g => g.id === 'g1').clusterWarning, null, 'nhóm nhiều kênh thì không cảnh báo bẫy');
  assert.ok(Array.isArray(proximity));
  assert.ok(closeGroups([{ name: 'a', medianMultiple: 1.27 }, { name: 'b', medianMultiple: 1.11 }])[0].gap <= 0.16);
  assert.equal(closeGroups([{ name: 'a', medianMultiple: 1.27 }, { name: 'b', medianMultiple: 0.83 }]).length, 0);
  assert.equal(closeGroups([{ name: 'a', medianMultiple: null }, { name: 'b', medianMultiple: 1.0 }]).length, 0);
});

test('Hook xoay vòng đủ 10 kiểu rồi mới lặp lại', () => {
  assert.equal(HOOK_TYPES.length, 10);
  assert.equal(HOOK_TYPES.filter(h => h.verified).length, 5);
  const used = [];
  for (let i = 0; i < 10; i += 1) { const h = nextHook(used); assert.ok(!used.includes(h.id)); used.push(h.id); }
  assert.equal(nextHook(used).id, HOOK_TYPES[0].id, 'hết 10 kiểu thì quay lại kiểu đầu');
  assert.equal(nextHook(['myth-buster']).id, 'shock-stat-then-misdirect');
});

test('Chữ thumbnail tối đa 4 tiếng và phải có trong tiêu đề', () => {
  assert.deepEqual(thumbLineCheck('MONGOL EMPIRE', 'The Entire History of the Mongol Empire'), { words: 2, chars: 13, wordsOk: true, charsOk: true, inTitle: true });
  assert.equal(thumbLineCheck('one two three four five', 'x').wordsOk, false);
  assert.equal(thumbLineCheck('A VERY LONG SINGLE WORD', 'x').charsOk, false);
  assert.equal(thumbLineCheck('TOKYO', 'The History of Rome').inTitle, false);
});

test('Chia lô 4s / 6s / 8s khớp tổng thời lượng voice', () => {
  const scenes = Array.from({ length: 91 }, () => ({}));
  const batches = batchScenes(scenes, 404);
  assert.deepEqual(batches.map(b => b.seconds), [4, 6, 8]);
  assert.equal(batches[0].count, 71);
  assert.equal(batches[1].count, 20);
  assert.equal(batches[2].count, 0);
  const total = batches.reduce((a, b) => a + b.seconds * b.count, 0);
  assert.equal(total, 404);
  assert.equal(batchScenes([], 0).every(b => b.count === 0), true);
  assert.equal(batchScenes(Array.from({ length: 10 }), 0).reduce((a, b) => a + b.seconds * b.count, 0), 40, 'không có voice thì lấy 4s mỗi cảnh');
  const long = batchScenes(Array.from({ length: 10 }, () => ({})), 800).reduce((a, b) => a + b.seconds * b.count, 0);
  assert.ok(long <= 80, 'không vượt trần 8s mỗi cảnh');
});

test('Gợi ý clip chỉ ra cảnh cao trào, có nhân vật, theo thứ tự cảnh', () => {
  const scenes = Array.from({ length: 20 }, (_, i) => ({
    narration: i === 3 ? 'The army rushed the gate and the walls collapsed under the cannon fire.' : 'Mô tả chung chung về một giai đoạn dài.',
    characters: i % 5 === 0 ? ['Vasco da Gama'] : [],
  }));
  const picks = suggestClips(scenes, 5);
  assert.ok(picks.includes(3), 'cảnh có hành động và nhân vật phải được chọn');
  assert.deepEqual([...picks].sort((a, b) => a - b), picks, 'kết quả phải theo thứ tự cảnh');
  assert.ok(picks.length <= 5);
  assert.equal(suggestClips(scenes, 0).length, 0);
});

test('Mã 3 chữ cho tên file ổn định', () => {
  assert.match(assetCode('video-1'), /^[a-z]{3}$/);
  assert.equal(assetCode('video-1'), assetCode('video-1'));
  assert.notEqual(assetCode('video-1'), assetCode('video-2'));
  assert.equal(sceneFileName('abc', 14), 'hcb-014.png');
  assert.equal(clipFileName(7), 'scene-007.mp4');
  assert.equal(sceneFileName('abc', 1, 'JPG'), assetCode('abc') + '-001.jpg');
});

test('Ảnh gốc cho bối cảnh từ 4 cảnh trở lên', () => {
  const mk = (background, n, extra = {}) => Array.from({ length: n }, () => ({ background, characters: [], ...extra }));
  const plan = referencePlan([...mk('Harbor', 5), ...mk('Hall', 3), ...mk('Map', 1)]);
  assert.equal(plan.needed.length, 1);
  assert.equal(plan.needed[0].name, 'Harbor');
  assert.equal(plan.backgrounds.find(b => b.name === 'Hall').needsReference, false);
  assert.match(plan.summary, /1 cái cần ảnh gốc/);
  const withChars = referencePlan([...mk('World Map', 4), { background: 'Fortress', characters: ['Vasco da Gama', 'Afonso'] }]);
  assert.equal(withChars.characters.find(c => c.name === 'Afonso').needsReference, false);
});

test('Ước đoạt thời lượng và cân voice', () => {
  assert.equal(estimateRead(800, 150).seconds, 320);
  assert.equal(estimateRead(800, 150).label, '5,3 phút');
  assert.equal(estimateRead(0).seconds, 0);
  assert.deepEqual(timingCheck([{ duration: 4 }, { duration: 6 }], 10), { sceneTotal: 10, voice: 10, diff: 0, ok: true });
  assert.equal(timingCheck([{ duration: 4 }], 12).ok, false);
  assert.equal(timingCheck([{ duration: 4 }], 0).ok, true);
});

test('Cảnh thiếu ảnh bị chặn khi đóng gói', () => {
  const scenes = [{ image: 'a' }, {}, { clip: 'c' }];
  const b = packagingBlockers(scenes);
  assert.equal(b.ok, false);
  assert.deepEqual(b.missing.map(m => m.index), [1]);
  assert.match(b.message, /1 cảnh chưa có ảnh/);
  assert.equal(packagingBlockers([{ image: 'a' }, { image: 'b' }]).ok, true);
});

test('YouTube quota separates 100 daily searches from the general 10,000-unit bucket', () => {
  const s = quotaSummary({ searches: 3, channels: 2, playlistItems: 1, videos: 1 });
  assert.equal(s.units, 2 * QUOTA.channels + 1 + 1);
  assert.equal(s.freeSearchesPerDay, 100);
  assert.match(s.note, /100 search/);
});

test('Thư viện khung thumbnail: ô chữ luôn trong khung, id cũ vẫn dùng được', () => {
  assert.equal(THUMB_LAYOUTS.length, 8);
  for (const l of THUMB_LAYOUTS) {
    for (const part of ['image', 'text', 'sub']) {
      const r = l.canvas[part];
      if (!r) continue;
      const [x, y, w, h] = r;
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0, `${l.id}.${part} có toạ độ hợp lệ`);
      assert.ok(x + w <= 1.0001 && y + h <= 1.0001, `${l.id}.${part} không tràn ra ngoài khung`);
    }
    assert.ok(l.name && l.text && l.scene, `${l.id} mô tả đủ ba chỗ`);
  }
  const ids = new Set(THUMB_LAYOUTS.map(l => l.id));
  assert.equal(ids.size, THUMB_LAYOUTS.length, 'không trùng id');
  // Kênh tạo trước khi có thư viện vẫn dùng được khung của mình.
  assert.equal(findLayout('split').id, 'split-2');
  assert.equal(findLayout('top').id, 'text-top');
  assert.equal(findLayout('hero').id, 'object-hero');
  assert.equal(findLayout('không-có').id, THUMB_LAYOUTS[0].id);
  assert.deepEqual(SUB_LINES, ['Nam', 'Địa danh', 'Câu phụ']);
});

test('Câu khóa cho prompt: không chữ trong ảnh, tràn khung, và ảnh tham chiếu không gợi ý vẽ', () => {
  assert.match(NO_TEXT_IN_IMAGE, /no readable text/);
  assert.match(FULL_BLEED, /ENTIRE image/);
  assert.match(FULL_BLEED, /touch all four edges/);
  assert.match(REFERENCE_RULE, /không bao giờ gợi ý cho máy vẽ/);
});

test('Kế hoạch nhạc: 4 đoạn cảm xúc, không lời, luôn dưới 24 dB', () => {
  assert.equal(MUSIC_PLAN.segments.length, 4);
  assert.deepEqual(MUSIC_PLAN.segments.map(s => s.id), ['mo', 'giang', 'nghiem', 'ket']);
  for (const s of MUSIC_PLAN.segments) {
    assert.match(s.prompt, /no vocals/, `${s.id} không có lời`);
    assert.ok(s.emotion && s.name);
  }
  assert.match(MUSIC_PLAN.rule, /24 dB/);
  assert.equal(MUSIC_PLAN.price, Number((COST_REFERENCE.perUnit.musicPerStyle * 3).toFixed(2)));
});

test('Ảnh tham chiếu bắt buộc khi bối cảnh lặp đủ ngưỡng', () => {
  assert.equal(BACKGROUND_REFERENCE_MIN_SCENES, 4);
  const scenes = Array.from({ length: 4 }, () => ({ background: 'Harbor', characters: [] }));
  assert.equal(referencePlan(scenes).needed.length, 1);
  assert.equal(referencePlan(scenes.slice(0, 3)).needed.length, 0);
});
