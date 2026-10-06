import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

// niche-ui.mjs import '/rx.mjs' — đường dẫn tuyệt đối chỉ có nghĩa trong trình duyệt.
// Test nạp lại đúng file thật, chỉ đổi import sang đường dẫn tuyệt đối trên đĩa,
// rồi render bằng bộ helper tối giản giống app.js. Mục tiêu: một lỗi cú pháp
// hoặc template literal trong niche-ui.mjs phải làm test ĐỎ, không phải để
// trang trắng im lặng trên trình duyệt.
const here = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(here, 'public', 'niche-ui.mjs'), 'utf8');
const alias = pathToFileURL(path.join(here, 'rx.mjs')).href;
const dir = await mkdtemp(path.join(tmpdir(), 'studio-niche-ui-'));
const copy = path.join(dir, 'niche-ui.mjs');
await writeFile(copy, source.replace("from '/rx.mjs'", `from '${alias}'`), 'utf8');
try {
  var { renderNiche } = await import(pathToFileURL(copy).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = {
  heading: (t, d, a = '') => `<div class="page-heading"><div><h1>${t}</h1><p>${d}</p></div>${a}</div>`,
  panel: (t, b) => `<section><h2>${t}</h2>${b}</section>`,
  notice: (text, type = '') => `<div class="notice ${type}" role="note">${text}</div>`,
  field: (label, binding, value, type = 'text', help = '', placeholder = '') =>
    `<label>${label}<input data-bind="${binding}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">${help ? `<small>${help}</small>` : ''}</label>`,
  select: (label, binding, value, options, help = '') =>
    `<label>${label}<select data-bind="${binding}">${options.map(([v, t]) => `<option value="${v}"${v === value ? ' selected' : ''}>${t}</option>`).join('')}</select>${help ? `<small>${help}</small>` : ''}</label>`,
  btn: (text, action, cls = '', extra = '') => `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`,
  esc,
  n: x => Number(x || 0).toLocaleString('vi-VN'),
};

// Trạng thái đầy đủ cho từng bước, đúng hình dạng server.mjs / niche-api.mjs ghi ra.
const flow = {
  field: { passed: true },
  template: { passed: true, value: 'the entire history of', result: { matches: 18, total: 20 } },
  shelf: { passed: true, count: 3, formatWarning: 'Phân loại Shorts theo thời lượng là gần đúng.', videos: [
    { id: 'v1', channelId: 'UCaaa', channelTitle: 'Kênh A', multiple: 2.4 },
    { id: 'v2', channelId: 'UCbbb', channelTitle: 'Kênh B', multiple: 0.8 },
  ], channels: [{ channelTitle: 'Kênh A', sameTemplate: true, matureCount: 20, median: 30000, pass: true }] },
  groups: { passed: true, chosen: 'group-0', suggestedQueries: ['entire history of rome', 'entire history of china', 'entire history of japan'],
    groups: [{ id: 'group-0', name: 'Thành phố', angle: 'vì sao thành phố lớn lên', videoIds: ['v1', 'v2'] }] },
  probe: { passed: false, medianHits: 9, results: [{ hits: 12 }, { hits: 9 }, { hits: 8 }] },
  topics: { passed: false, chosen: [], errors: ['Thực thể đã có trong kho: the entire history of rome'] },
};
const survey = (extra = {}) => ({ id: 's1', name: 'Test', market: 'US', language: 'en', format: 'long', nicheMode: 'live', probeMode: 'live', nicheStep: 4, nicheFlow: flow, ...extra });

test('B7 · màn gõ thử điền sẵn 3 câu từ nhóm bội số trung vị cao nhất', () => {
  const html = renderNiche(survey(), ui);
  // Mỗi câu một dòng, đúng thứ tự server đề xuất.
  assert.match(html, /value="entire history of rome[\r\n]+entire history of china[\r\n]+entire history of japan"/, 'phải điền sẵn 3 câu gợi ý');
  assert.match(html, /Điền sẵn 3 câu từ nhóm có bội số trung vị cao nhất/, 'phải nói rõ 3 câu này lấy từ đâu');
});

test('B7 · gõ thử trượt thì có nút Thử nhóm khác, đạt thì không', () => {
  const fail = renderNiche(survey(), ui);
  assert.match(fail, /data-action="niche-step" data-step="3"/, 'nút phải quay về bước Chia nhóm');
  assert.match(fail, /Thử nhóm khác/);
  assert.match(fail, /Câu 1: 12\/20 · Câu 2: 9\/20 · Câu 3: 8\/20/, 'phải hiện kết quả từng câu');
  assert.match(fail, /Trung vị 9\/20 · Chưa đạt/);
  assert.match(fail, /không có nghĩa ngách sai/, 'phải tránh khiến người dùng tưởng ngách sai');
  const pass = renderNiche(survey({ nicheFlow: { ...flow, probe: { passed: true, medianHits: 14, results: [{ hits: 15 }, { hits: 14 }, { hits: 13 }] } } }), ui);
  assert.doesNotMatch(pass, /Thử nhóm khác/, 'đã đạt thì không hiện nút thử nhóm khác');
  assert.match(pass, /Trung vị 14\/20 · Đạt/);
});

test('B7 · câu tìm đã sửa tay không bị gợi ý đè lên; kho cũ không có gợi ý vẫn render', () => {
  assert.match(renderNiche(survey({ probeQueries: 'cua toi viet' }), ui), /value="cua toi viet"/, 'phải giữ câu người dùng đã sửa');
  const old = renderNiche(survey({ nicheFlow: { ...flow, groups: { passed: true, chosen: 'group-0' } } }), ui);
  assert.doesNotMatch(old, /Điền sẵn 3 câu/, 'không có gợi ý thì không hiện dòng giải thích');
  assert.match(old, /data-bind="survey\.probeQueries"/, 'ô câu tìm vẫn phải còn');
});

test('B7 · chế độ nhập mẫu không lẫn gợi ý câu tìm', () => {
  const html = renderNiche(survey({ nicheMode: 'import', probeMode: 'import' }), ui);
  assert.match(html, /survey\.probeSamples/, 'vẫn phải có ô ba mẫu lượt xem');
  assert.doesNotMatch(html, /data-bind="survey\.probeQueries"/, 'chế độ nhập mẫu không hiện ô câu tìm');
});

test('B7 · cả sáu màn hình đều render được', () => {
  const names = ['Chọn sân', 'Khuôn tiêu đề', 'Kho', 'Chia nhóm', 'Gõ thử', '20 chủ đề'];
  for (let step = 0; step < 6; step++) {
    const html = renderNiche(survey({ nicheStep: step }), ui);
    assert.match(html, new RegExp(`Bước ${step + 1}/6 · ${names[step].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `bước ${step} phải render đúng tiêu đề`);
    assert.ok(html.length > 200, `bước ${step} phải có nội dung`);
  }
  assert.doesNotThrow(() => renderNiche({}, ui), 'không có nicheFlow vẫn phải render được');
});
