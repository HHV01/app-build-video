import test from 'node:test';
import assert from 'node:assert/strict';
import { findTemplate, templateCandidates, channelShelf, shelfGate, probeGate, nextStage, lockedNiche, groupCountGate, carriesTemplate, contentVideos, entityOf, overlapsShelf, suggestedQueries, validateTopics, RULES } from './rx.mjs';
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
test('B1 · khuôn không bao giờ kết thúc bằng mạo từ', () => {
  // 12/20 có "…of the X", 8/20 có "…of X". Khuôn 6 từ "the entire history of the"
  // đạt 60% nhưng kết thúc bằng mạo từ, nên phải lùi về khuôn 5 từ.
  const withArticle = ['Rome', 'Japan', 'Egypt', 'Greece', 'China', 'India', 'Korea', 'Maya', 'Aztec', 'Persia', 'Babylon', 'Assyria'];
  const without = ['Sumer', 'Hatti', 'Sparta', 'Carthage', 'Etruria', 'Nubia', 'Lydia', 'Moche'];
  const titles = [
    ...withArticle.map(e => `The Entire History of the ${e}`),
    ...without.map(e => `The Entire History of ${e}`),
  ];
  assert.equal(titles.length, 20);
  const r = findTemplate(titles);
  assert.equal(r.template, 'the entire history of');
  assert.equal(r.words, 4);
  assert.equal(r.ratio, 1);
  for (const bad of ['the', 'a', 'an']) assert.notEqual(r.template.split(' ').pop(), bad);
});
test('B1 · khuôn hợp lệ không bị bỏ nhầm vì có mạo từ ở giữa', () => {
  // "The" chỉ nằm ở đầu, cụm khuôn kết thúc bằng danh từ riêng.
  const titles = Array.from({ length: 20 }, (_, i) => `The Rise and Fall of Empire ${i}`);
  assert.equal(findTemplate(titles).template, 'the rise and fall of empire');
});
test('B1 · từ chứa mạo từ là chữ được, không phải mạo từ', () => {
  // "android" bắt đầu bằng "a" nhưng không phải mạo từ — không được loại.
  const titles = [
    ...Array.from({ length: 12 }, (_, i) => `Guide to android ${i}`),
    ...Array.from({ length: 8 }, (_, i) => `Guide to other ${i}`),
  ];
  assert.equal(findTemplate(titles).template, 'guide to android');
});
test('kênh: loại video chưa 90 ngày, ngưỡng 5 video và trung vị 20.000', () => {
  const ok = channelShelf([...mk('a', 6, 100, 30000), ...mk('a', 4, 10, 1)], now)[0];
  assert.equal(ok.pass, true); assert.equal(ok.matureCount, 6); assert.equal(ok.videos[0].multiple, 1);
  assert.equal(channelShelf(mk('b', 4, 100, 50000), now)[0].pass, false);
  assert.equal(channelShelf(mk('c', 8, 100, 19999), now)[0].pass, false);
});
test('B4 · contentVideos lọc Shorts và video quá ngắn theo MỘT ngưỡng duy nhất', () => {
  const v = (id, duration, format) => ({ id, duration, format });
  const list = [v('dai', 600, 'long'), v('short45', 45, 'short'), v('shortDai', 600, 'short'), v('ngan', 30, 'long'), v('dung120', 120, 'long'), v('dung121', 121, 'long')];
  assert.deepEqual(contentVideos(list, 'long').map(x => x.id), ['dai', 'dung120', 'dung121']);
  assert.deepEqual(contentVideos(list, 'short').map(x => x.id), ['short45', 'shortDai']);
  assert.deepEqual(contentVideos(null, 'long'), []);
  assert.deepEqual(contentVideos(undefined, 'short'), []);
  assert.equal(RULES.minContentSeconds, 120);
  // Không còn ngưỡng 180 rải rác: 121 giây là nội dung hợp lệ.
  assert.ok(contentVideos(list, 'long').some(x => x.duration === 121));
});
test('B4 · findTemplate lấy tối đa 20 nhưng chỉ cần tối thiểu minTitlesForTemplate', () => {
  assert.equal(RULES.minTitlesForTemplate, 10);
  const duoi = findTemplate(Array(9).fill('Entire history of one'));
  assert.equal(duoi.template, null); assert.equal(duoi.complete, false);
  assert.match(duoi.reason, new RegExp(String(RULES.minTitlesForTemplate)));
  // 14 video hợp lệ vẫn tìm ra khuôn (trước đây đòi đúng 20 nên báo thiếu dữ liệu).
  const r14 = findTemplate(Array.from({ length: 14 }, (_, i) => `Entire history of Rome ${i}`));
  assert.equal(r14.template, 'entire history of rome'); assert.equal(r14.total, 14); assert.equal(r14.complete, true);
  // Tỷ lệ "quá nửa" tính trên số tiêu đề THỰC CÓ, không phải trên 20.
  const mixed = [...Array.from({ length: 8 }, (_, i) => `Entire history of Rome ${i}`), ...Array.from({ length: 6 }, (_, i) => `Unrelated piece ${i}`)];
  const rm = findTemplate(mixed);
  assert.equal(rm.total, 14); assert.equal(rm.matches, 8); assert.equal(rm.ratio, 8 / 14);
  // Đúng nửa của số thực có vẫn KHÔNG đủ.
  const half = [...Array.from({ length: 6 }, (_, i) => `Alpha topic Rome ${i}`), ...Array.from({ length: 6 }, (_, i) => `Beta topic Rome ${i}`)];
  assert.equal(findTemplate(half).template, null);
  // Trên 20 tiêu đề thì vẫn chỉ lấy 20 mới nhất.
  const nhieu = findTemplate(Array.from({ length: 30 }, (_, i) => `Entire history of Rome ${i}`));
  assert.equal(nhieu.total, RULES.titlesForTemplate);
});
test('B6 · entityOf bỏ khuôn và mạo từ đầu, chuẩn hoá NFC/hoa thường', () => {
  assert.equal(entityOf('The Entire History of Rome', 'the entire history of'), 'rome');
  assert.equal(entityOf('The Entire History of the Rome', 'the entire history of'), 'rome');
  assert.equal(entityOf('The Entire History of a Rome', 'the entire history of'), 'rome');
  assert.equal(entityOf('The Entire History of an Rome', 'the entire history of'), 'rome');
  assert.equal(entityOf('The Entire History of Rome', 'the entire history of'), 'rome');
  assert.equal(entityOf('  The   ENTIRE   History Of   Rome  ', 'the entire history of'), 'rome');
  assert.equal(entityOf('The Entire History of Rome', 'nonexistent template'), 'entire history of rome', 'khuôn không khớp thì giữ nguyên tiêu đề, chỉ bỏ mạo từ đầu');
  assert.equal(entityOf('The Entire History of', 'the entire history of'), '', 'không có thực thể');
  assert.equal(entityOf(null, 'x'), '');
  assert.equal(entityOf('Rome', ''), 'rome');
});
test('B6 · overlapsShelf khớp theo ranh giới từ, không khớp chuỗi con', () => {
  const shelf = ['The Entire History of Egypt'];
  // Có "Egypt" trong kho thì "Ancient Egypt" là đã có.
  assert.equal(overlapsShelf('The Entire History of Ancient Egypt', 'the entire history of', shelf), true);
  // Ngược lại: kho có "Ancient Egypt" thì "Egypt" cũng là đã có.
  assert.equal(overlapsShelf('The Entire History of Egypt', 'the entire history of', ['The Entire History of Ancient Egypt']), true);
  // "Egyptian Empire" KHÔNG phải "Egypt" — ranh giới từ bắt buộc.
  assert.equal(overlapsShelf('The Entire History of the Egyptian Empire', 'the entire history of', shelf), false);
  // "Rome" không khớp trong "Romeo".
  assert.equal(overlapsShelf('The Entire History of Romeo', 'the entire history of', ['The Entire History of Rome']), false);
  assert.equal(overlapsShelf('The Entire History of Rome', 'the entire history of', ['The Entire History of Romeo']), false);
  // Cụm nhiều từ phải khớp trọn vẹn theo thứ tự.
  assert.equal(overlapsShelf('The Entire History of Ancient Roman Empire', 'the entire history of', ['The Entire History of Roman Republic']), false);
  assert.equal(overlapsShelf('The Entire History of the Roman Republic', 'the entire history of', ['The Entire History of Ancient Roman Empire']), false);
  // Chủ đề hoàn toàn khác thì không chặn.
  assert.equal(overlapsShelf('The Entire History of Japan', 'the entire history of', shelf), false);
  assert.equal(overlapsShelf('The Entire History of Japan', 'the entire history of', []), false);
  assert.equal(overlapsShelf('The Entire History of Japan', 'the entire history of', null), false);
});
test('B6 · validateTopics loại chủ đề trùng thực thể với kho, không chỉ trùng nguyên tiêu đề', () => {
  const template = 'the entire history of';
  const shelf = Array.from({ length: 20 }, (_, i) => `the entire history of egypt ${i}`);
  const trung = validateTopics(Array.from({ length: 20 }, (_, i) => `The Entire History of Ancient Egypt ${i}`), shelf, template);
  assert.equal(trung.passed, false, '"Ancient Egypt" phải bị loại vì kho đã có "Egypt"');
  assert.ok(trung.errors.some(e => /đã có trong kho/i.test(e)));
  // "Egyptian Empire" là thực thể khác, phải qua.
  const khac = validateTopics(Array.from({ length: 20 }, (_, i) => `The Entire History of the Egyptian Empire ${i}`), shelf, template);
  assert.equal(khac.passed, true, khac.errors.join(' | '));
});
test('B7 · suggestedQueries lấy 3 câu từ nhóm bội số trung vị cao nhất', () => {
  const V = (id, title, multiple) => ({ id, title, multiple });
  const videos = [
    V('a0', 'The Entire History of Rome 1', 6), V('a1', 'The Entire History of Rome 2', 5),
    V('a2', 'The Entire History of Rome 3', 4), V('a3', 'The Entire History of Rome 4', 0.2),
    V('b0', 'The Entire History of Japan 1', 1), V('b1', 'The Entire History of Japan 2', 1.1),
  ];
  const groups = [{ id: 'group-0', videoIds: ['a0', 'a1', 'a2', 'a3'] }, { id: 'group-1', videoIds: ['b0', 'b1'] }];
  // Nhóm 0 có trung vị 4.5, nhóm 1 chỉ ~1.05 → phải gợi ý từ nhóm 0.
  assert.deepEqual(suggestedQueries(groups, videos, 'the entire history of'),
    ['the entire history of rome 1', 'the entire history of rome 2', 'the entire history of rome 3']);
  // Nhóm "chưa phân loại" không được gợi ý.
  assert.deepEqual(suggestedQueries([{ id: 'unclassified', videoIds: ['a0', 'a1', 'a2', 'a3'] }], videos, 'the entire history of'), []);
  // Ít video hơn thì chỉ gợi ý được bấy nhiêu.
  assert.deepEqual(suggestedQueries([{ id: 'group-1', videoIds: ['b0', 'b1'] }], videos, 'the entire history of'),
    ['the entire history of japan 2', 'the entire history of japan 1']);
  // Cùng thực thể thì gộp, không gợi ý hai câu gần như giống nhau.
  const dup = [V('c0', 'The Entire History of Rome 1', 9), V('c1', 'The Entire History of the Rome 1', 8)];
  assert.deepEqual(suggestedQueries([{ id: 'group-0', videoIds: ['c0', 'c1'] }], dup, 'the entire history of'), ['the entire history of rome 1']);
  // Dữ liệu rỗng / sai kiểu thì trả về mảng rỗng chứ không ném lỗi.
  assert.deepEqual(suggestedQueries([], videos, 'the entire history of'), []);
  assert.deepEqual(suggestedQueries(null, null, 'the entire history of'), []);
  assert.deepEqual(suggestedQueries([{ id: 'group-0', videoIds: ['khong', 'co'] }], videos, 'the entire history of'), []);
  assert.deepEqual(suggestedQueries([null, { videoIds: null }], videos, 'the entire history of'), []);
  assert.deepEqual(suggestedQueries(groups, [V('a0', 'The Entire History of', 9)], 'the entire history of'), [], 'video không có thực thể thì không gợi ý');
});
test('B8 · suggestedQueries ưu tiên nhóm ĐỦ ba câu, không mắc kẹt ở nhóm trung vị cao nhất nhưng ít video', () => {
  const V = (id, title, multiple) => ({ id, title, multiple });
  // Ca thật từ kho YouTube: nhóm "s1 video" trung vị 9.1 cao nhất, nhóm 13 video trung vị 2.2.
  const nhieu = ['Japan', 'Korea', 'Egypt', 'Rome', 'Greece', 'Persia'];
  const videos = [
    V('n0', 'The Entire History of Henrich VIII', 9.1),
    ...nhieu.map((t, i) => V(`m${i}`, `The Entire History of ${t}`, 2.2 - i * 0.05)),
  ];
  const groups = [
    { id: 'group-nho', videoIds: ['n0'] },
    { id: 'group-lon', videoIds: nhieu.map((_, i) => `m${i}`) },
  ];
  // Nhóm nhỏ có trung vị cao hơn nhưng chỉ gợi ý được 1 câu → probe chặn "Nhập đúng ba câu".
  // Phải lấy 3 câu từ nhóm đủ video, và câu đầu phải là bội số cao nhất trong nhóm đó.
  assert.deepEqual(suggestedQueries(groups, videos, 'the entire history of'), [
    'the entire history of japan',
    'the entire history of korea',
    'the entire history of egypt',
  ], 'phải gợi ý đủ 3 câu từ nhóm có đủ thực thể khác nhau');
  // Nhóm lớn phải đủ ba thực thể; nếu chỉ hai thì vẫn lấy từ nhóm đó thay vì nhóm 1 video.
  const hai = [
    V('n0', 'The Entire History of Henrich VIII', 9.1),
    V('m0', 'The Entire History of Japan', 2.2), V('m1', 'The Entire History of Korea', 2.1),
  ];
  assert.deepEqual(suggestedQueries(
    [{ id: 'group-nho', videoIds: ['n0'] }, { id: 'group-hai', videoIds: ['m0', 'm1'] }],
    hai, 'the entire history of', 3),
    ['the entire history of japan', 'the entire history of korea'],
    'không nhóm nào đủ ba câu thì lấy nhóm nhiều nhất, không phải nhóm trung vị cao nhất');
  // Không nhóm nào đủ ba câu VÀ nhóm trung vị cao nhất cũng chỉ 1 câu → vẫn trả 1 câu
  // thay vì trả rỗng; UI hiển thị "Điền sẵn 3 câu" nên phải nói rõ được bao nhiêu.
  assert.deepEqual(suggestedQueries(
    [{ id: 'group-a', videoIds: ['n0'] }, { id: 'group-b', videoIds: ['m0'] }],
    hai.slice(0, 1).concat(hai.slice(2, 3)), 'the entire history of', 3),
    ['the entire history of henrich viii'],
    'chỉ còn một nhóm có video: lấy nhóm đó, trả ít câu hơn');
});
test('B3 · carriesTemplate nhận tiêu đề mang khuôn, từ chối phần còn lại', () => {
  assert.equal(carriesTemplate('The Entire History of Rome', 'the entire history of'), true);
  assert.equal(carriesTemplate('  The   Entire  History of   Rome  ', 'the entire history of'), true, 'chuẩn hoá khoảng trắng');
  assert.equal(carriesTemplate('The Entire History Of Rome', 'the entire history of'), true, 'không phân biệt hoa thường');
  assert.equal(carriesTemplate('The Entire History of', 'the entire history of'), false, 'bằng đúng khuôn thì chưa có thực thể');
  assert.equal(carriesTemplate('Completely Different Subject', 'the entire history of'), false);
  assert.equal(carriesTemplate('Why the Entire History of Rome matters', 'the entire history of'), false, 'phải ở đầu, không phải ở giữa');
  // Ranh giới từ: "ofempire" không phải là "of empire".
  assert.equal(carriesTemplate('The Entire History ofempire Today', 'the entire history of'), false);
  // "ofempire" là MỘT từ, không tách thành "of" + "empire".
  assert.equal(carriesTemplate('The Entire History ofempire Today', 'the entire history of empire'), false);
  // Khuôn đã chốt có thể ngắn hơn khuôn của riêng kênh — vẫn phải khớp.
  assert.equal(carriesTemplate('The Entire History of Empire Rome', 'the entire history of empire'), true);
  assert.equal(carriesTemplate('The Entire History of Empire Rome', 'the entire history of'), true);
  assert.equal(carriesTemplate('bất kỳ', ''), false, 'khuôn rỗng thì không video nào mang khuôn');
  assert.equal(carriesTemplate('bất kỳ', null), false);
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
