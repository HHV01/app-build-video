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
await writeFile(copy, source.replace("from '/rx.mjs'", `from '${alias}'`).replace("from './niche-workflow.mjs'",`from '${pathToFileURL(path.join(here,'public','niche-workflow.mjs')).href}'`), 'utf8');
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
test('B8 older passed results request candidate refresh instead of claiming no template',()=>{
 const html=renderNiche(survey({nicheStep:1}),ui);assert.match(html,/Chạy lại/);assert(!html.includes('Kênh này không có khuôn.'));
});

test('Quick start puts the reference channel first and optional settings in details',()=>{
 const html=renderNiche(survey({nicheStep:0}),ui);
 assert(html.indexOf('survey.leadChannel')<html.indexOf('survey.name'));
 assert.match(html,/Phân tích kênh/);assert.match(html,/data-action="niche-analyze"/);
 assert.match(html,/<details[^>]*>[\s\S]*Tên khảo sát/);
 assert(!html.includes("survey.angle"));
});
test('Recommended template keeps alternatives collapsed and explains the next action',()=>{
 const template={passed:true,value:'the entire history of',candidates:[{template:'the entire history of',words:4,matches:20,total:20},{template:'the entire history',words:3,matches:20,total:20}],examples:['The Entire History of Rome']};
 const html=renderNiche(survey({nicheStep:1,nicheFlow:{...flow,template}}),ui);
 assert.match(html,/<details[^>]*><summary>Xem thêm lựa chọn/);
 assert.match(html,/Đề xuất/);assert.match(html,/tự kiểm tra kho/);
});
test('Failed shelf states the missing channel count and offers recovery actions',()=>{
 const html=renderNiche(survey({nicheStep:2,nicheFlow:{...flow,shelf:{...flow.shelf,passed:false,count:2}}}),ui);
 assert.match(html,/Còn thiếu 1 kênh đạt/);assert.match(html,/data-action="niche-add-channel"/);
 assert.match(html,/Thử khuôn khác/);
});
test('D3 topic review always explains the limits of word-based duplicate checks',()=>{
 assert.match(renderNiche(survey({nicheStep:5}),ui),/Code chỉ bắt trùng theo từ; chủ đề đồng nghĩa \(Rome \/ Roman Empire\) cần bạn tự đối chiếu\./);
});

test('B8 · candidate radios show counts, examples, broad/tight labels and escaped text',()=>{
 const template={passed:true,value:'the entire history of ancient',examples:['The Entire History of Ancient Rome <img>'],candidates:[{template:'the entire history of ancient',words:5,matches:20,total:20},{template:'the entire history of',words:4,matches:20,total:20},{template:'the entire history',words:3,matches:20,total:20}]};
 const html=renderNiche(survey({nicheStep:1,nicheFlow:{...flow,template}}),ui);
 assert.equal((html.match(/type="radio"/g)||[]).length,3);assert.match(html,/20\/20/);assert.match(html,/rộng nhất/);assert.match(html,/chặt nhất/);assert.match(html,/Dùng khuôn này/);assert.match(html,/Rome &lt;img&gt;/);assert(!html.includes('Rome <img>'));
});
test('B8 · no candidate hides radios and blocks later steps',()=>{
 const html=renderNiche(survey({nicheStep:1,nicheFlow:{field:{passed:true},template:{passed:false,candidates:[],reason:'không có khuôn'}}}),ui);
 assert(!html.includes('type="radio"'));assert.match(html,/Hãy đổi kênh chỉ đường/);assert.match(html,/data-step="2" disabled/);
});
test('B8 · manual channel input is live-only and failed manually added rows show reasons',()=>{
 const shelf={...flow.shelf,channels:[{channelTitle:'Manual',addedByUser:true,sameTemplate:false,matureCount:0,median:null,pass:false,reason:'Lặp khuôn khác'}]};
 const html=renderNiche(survey({nicheStep:2,nicheFlow:{...flow,shelf}}),ui);assert.match(html,/survey.extraChannelsText/);assert.match(html,/do bạn thêm/);assert.match(html,/Lặp khuôn khác/);
 const imported=renderNiche(survey({nicheStep:2,nicheMode:'import',nicheFlow:{...flow,shelf}}),ui);assert(!imported.includes('survey.extraChannelsText'));
});

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

test('B8 · gợi ý dựng được ít hơn ba câu thì phải nói đúng số câu, không hứa ba câu', () => {
  // Ca thật từ kho YouTube: nhóm trung vị cao nhất chỉ có 1 video nên chỉ dựng được 1 câu.
  // Ô này bắt buộc đúng ba dòng, nên ghi "Điền sẵn 3 câu" sẽ khiến người dùng bấm nút rồi bị chặn.
  const one = survey({ nicheFlow: { ...flow, groups: { ...flow.groups, suggestedQueries: ['entire history of rome'] } } });
  const html = renderNiche(one, ui);
  assert.doesNotMatch(html, /Điền sẵn 3 câu/, 'không được hứa ba câu khi chỉ dựng được một');
  assert.match(html, /1 câu/, 'phải nói đúng số câu thực tế');
  assert.match(html, /cần ba câu/, 'phải nhắc bước gõ thử cần đúng ba câu');
  // Đủ ba câu thì vẫn giữ câu chữ cũ, không đổi.
  assert.match(renderNiche(survey(), ui), /Điền sẵn 3 câu từ nhóm có bội số trung vị cao nhất/);
});

test('five-step navigation retains all six gated screens', () => {
  const names = ['Kênh tham khảo', 'Chọn khuôn tiêu đề', 'Kiểm tra kho kênh', 'Chọn nhóm chủ đề', 'Kiểm tra nhu cầu', 'Chốt 20 chủ đề'];
  for (let step = 0; step < 6; step++) {
    const html = renderNiche(survey({ nicheStep: step }), ui);
    const section=step<2?step:step<5?2:3;
    assert.match(html, new RegExp(`Bước ${section + 1}/5 · ${names[step]}`), `bước ${step} phải render đúng tiêu đề`);
    assert.ok(html.length > 200, `bước ${step} phải có nội dung`);
  }
  assert.doesNotThrow(() => renderNiche({}, ui), 'không có nicheFlow vẫn phải render được');
});

test('angle is chosen after analysis, outside collapsed channel settings',()=>{
 const first=renderNiche(survey({nicheStep:0}),ui);
 assert(!first.includes('data-bind="survey.angle"'));
 const second=renderNiche(survey({nicheStep:1,nicheFlow:{...flow,template:{...flow.template,angleSuggestions:[{angle:'Giải thích lựa chọn',reason:'Dựa trên tiêu đề nguồn'}]}}}),ui);
 assert.match(second,/niche-choose-angle/);
 assert(second.indexOf('data-bind="survey.angle"')<second.indexOf('Đổi kênh tham khảo'));
});

test('G3 shelf DNA panel shown only with sufficient videos and has copy',()=>{const s={nicheStep:2,nicheFlow:{template:{value:'History of'},shelf:{channels:[],count:0,videos:Array.from({length:10},(_,i)=>({title:'History of Egypt '+i,multiple:i<5?3:1,tags:['Egypt']}))}}};const html=renderNiche(s,ui);assert.match(html,/DNA tiêu đề và tag/);assert.match(html,/niche-copy-dna/);assert.match(html,/vai trò nhỏ/);s.nicheFlow.shelf.videos=[];assert(!renderNiche(s,ui).includes('DNA tiêu đề và tag'));});

test('G3 DNA uses reader-facing percentages rather than raw field names',()=>{const s={nicheStep:2,nicheFlow:{template:{value:'History of'},shelf:{channels:[],count:0,videos:Array.from({length:10},(_,i)=>({title:'History of Egypt '+i,multiple:i<5?3:1,tags:['Egypt']}))}}};const html=renderNiche(s,ui);assert.match(html,/Có số: 100%/);assert(!html.includes('&quot;numbers&quot;'));});

test('angle niche input and suggestion selector render separately from reference proposals',()=>{
 const s=survey({nicheStep:1,angleNiche:'Tài chính cá nhân',angleSource:'niche',nicheAngleFor:'Tài chính cá nhân',nicheAngleSuggestions:[{angle:'Quyết định nhỏ thay đổi tiền bạc',reason:'Hợp ngách'}],angle:'Quyết định nhỏ thay đổi tiền bạc'}),html=renderNiche(s,ui);assert(html.includes('survey.angleNiche'));assert(html.includes('niche-suggest-angles'));assert(html.includes('Quyết định nhỏ thay đổi tiền bạc'));assert(html.includes('✓ Đã chọn'));assert(html.includes('niche-reference-angles'));s.angleNiche='Lịch sử';assert(!renderNiche(s,ui).includes('<h2>Quyết định nhỏ thay đổi tiền bạc</h2>'));
});
