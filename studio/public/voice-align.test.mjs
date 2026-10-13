import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPauses, alignScenes } from './voice-align.mjs';
let seed = 12345; // tất định: kết quả lặp lại được
 const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; const between = (a, b) => a + (b - a) * rnd();
function simulate({ scenes = 119, sr = 8000, midSentence = 0.2, commaProb = 0.3, rateJitter = 0.15, music = 0 } = {}) {
  const words = Array.from({ length: scenes }, () => Math.round(between(13, 21))), anchorable = [];
  const segs = []; let t = 0.4; const trueEnds = []; // 0.4 s im lặng đầu
  words.forEach((w, i) => {
    const wps = 1 / (0.38 * (1 + between(-rateJitter, rateJitter)));   // từ/giây của cảnh
    let dur = w / wps, commas = 0;
    if (rnd() < commaProb) { commas = 1; segs.push({ type: 'speech', a: t, b: t + dur * 0.45 }); t += dur * 0.45; const g = between(0.26, 0.4); t += g; segs.push({ type: 'speech', a: t, b: t + dur * 0.55 }); t += dur * 0.55; }
    else { segs.push({ type: 'speech', a: t, b: t + dur }); t += dur; }
    if (rnd() < midSentence && i < scenes - 1) { trueEnds.push(t); anchorable.push(false); }                 // cảnh kết thúc giữa câu, không ngắt nghỉ
    else if (i < scenes - 1) { const p = between(0.32, 0.9); trueEnds.push(t + p / 2); anchorable.push(true); t += p; }
    else trueEnds.push(t);
  });
  const total = t + 0.5, N = Math.floor(total * sr), x = new Float32Array(N);
  for (let i = 0; i < N; i++) x[i] = (rnd() - 0.5) * 0.006 + (music ? Math.sin(i / sr * 2 * Math.PI * 220) * music : 0);
  for (const s of segs) { const amp = between(0.3, 0.8); let tt = s.a;
    while (tt < s.b) { const syl = between(0.14, 0.2), gap = between(0.03, 0.09); const e = Math.min(tt + syl, s.b);
      for (let i = Math.floor(tt * sr); i < Math.floor(e * sr); i++) x[i] += amp * Math.sin(i / sr * 2 * Math.PI * (140 + 60 * Math.sin(i / sr * 5))) * (0.6 + 0.4 * Math.sin(i / sr * 30));
      tt = e + gap; } }
  return { x, sr, words, trueEnds, total, anchorable };
}

function measure(opts) {
  const { x, sr, words, trueEnds, anchorable } = simulate(opts), det = detectPauses(x, sr), tw = words.reduce((a, b) => a + b, 0);
  let cum = 0; const prop = words.map(w => (cum += w, det.speechStart + (det.speechEnd - det.speechStart) * cum / tw));
  const al = alignScenes(words, det, { anchorable }), n = words.length - 1;
  const eP = [], eA = []; for (let i = 0; i < n; i++) { eP.push(Math.abs(prop[i] - trueEnds[i])); eA.push(Math.abs(al.ends[i] - trueEnds[i])); }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  return { al, det, words, meanProp: mean(eP), meanAlign: mean(eA), maxAlign: Math.max(...eA) };
}
const monotonic = ends => ends.every((v, i) => i === 0 || v > ends[i - 1]);
for (const [name, opts] of [['voice sạch', {}], ['nhịp đọc thất thường ±30%', { rateJitter: 0.3 }], ['50% cảnh kết thúc giữa câu', { midSentence: 0.5 }], ['70% dấu phẩy ngắt', { commaProb: 0.7 }], ['nhạc nền nhẹ', { music: 0.05 }]]) {
  test(`căn cảnh theo ngắt nghỉ: ${name}`, () => {
    const r = measure(opts);
    assert.ok(r.meanAlign < 0.5, `sai lệch trung bình ${r.meanAlign.toFixed(2)} s`);
    assert.ok(r.maxAlign < 3, `lệch lớn nhất ${r.maxAlign.toFixed(2)} s`);
    assert.ok(r.meanAlign < r.meanProp / 3, 'phải tốt hơn chia theo số từ ít nhất 3 lần');
    assert.ok(monotonic(r.al.ends) && Math.abs(r.al.ends.at(-1) - r.det.speechEnd) < 1e-9);
  });
}
test('không có ranh giới neo được: suy về chia theo số từ, không lỗi', () => {
  const words = [15, 17, 14, 16], pauses = [], det = { pauses, speechStart: 0.5, speechEnd: 30.5 };
  const al = alignScenes(words, det, { anchorable: [false, false, false] });
  assert.equal(al.matched, 0); assert.ok(monotonic(al.ends));
  const tw = 62; let c = 0; words.forEach((w, i) => { c += w; assert.ok(Math.abs(al.ends[i] - (0.5 + 30 * c / tw)) < 1e-6); });
});
test('không phát hiện được ngắt nghỉ nào: vẫn trả kết quả hợp lệ', () => {
  const al = alignScenes([10, 12, 11], { pauses: [], speechStart: 0, speechEnd: 20 });
  assert.ok(monotonic(al.ends) && al.matched === 0 && al.ends.at(-1) === 20);
});
test('một cảnh duy nhất', () => { const al = alignScenes([50], { pauses: [], speechStart: 1, speechEnd: 21 }); assert.deepEqual(al.ends, [21]); });
test('phát hiện ngắt nghỉ bỏ qua im lặng đầu/cuối và đoạn quá ngắn', () => {
  const sr = 8000, x = new Float32Array(sr * 10); const tone = (a, b) => { for (let i = a * sr; i < b * sr; i++) x[i] = 0.5 * Math.sin(i / 20); };
  tone(1, 3); tone(3.1, 5); tone(5.6, 8);   // nghỉ 0,1 s (bỏ qua) và 0,6 s (giữ); im lặng đầu 1 s, cuối 2 s
  const d = detectPauses(x, sr); assert.equal(d.pauses.length, 1); assert.ok(Math.abs(d.pauses[0].len - 0.6) < 0.05);
  assert.ok(Math.abs(d.speechStart - 1) < 0.05 && Math.abs(d.speechEnd - 8) < 0.05);
});
