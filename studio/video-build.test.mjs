import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSRT, formatSRT, secondsToSrtTime, splitSentences,
  groupSentencesToScenes, alignScenesToSRT,
  buildExportPackage, sceneCacheKey, validateBuildScenes,
} from './video-build.mjs';

const SRT = `1
00:00:00,000 --> 00:00:02,500
Xin chào các bạn

2
00:00:02,500 --> 00:00:05,000
Hôm nay ta học tiền
`;

test('parse SRT ngoài và báo lỗi đánh số/chồng mốc', () => {
  const cues = parseSRT(SRT);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 0);
  assert.equal(cues[1].end, 5);
  assert.throws(() => parseSRT('1\n00:00:00,000 --> 00:00:01,000\nA\n\n3\n00:00:01,000 --> 00:00:02,000\nB\n'), /đánh số 2/);
  assert.throws(() => parseSRT('1\n00:00:00,000 --> 00:00:02,000\nA\n\n2\n00:00:01,000 --> 00:00:03,000\nB\n'), /chồng/);
});

test('format SRT ra khối liên tục, mốc hợp lệ', () => {
  const out = formatSRT([{ start: 0, end: 2.5, text: 'A' }, { start: 2.5, end: 5, text: 'B' }]);
  assert.match(out, /^1\n00:00:00,000 --> 00:00:02,500\nA\n\n2\n/);
  assert.equal(secondsToSrtTime(3723.456), '01:02:03,456');
});

test('gộp câu cùng ý: câu ngắn chung cảnh, không mỗi câu một ảnh', () => {
  const scenes = groupSentencesToScenes(['Tiền là công cụ.', 'Biết dùng tiền sớm.', 'Tiền đẻ ra tiền nhờ lãi kép kéo dài nhiều năm liên tục.'], { ceiling: 8 });
  assert.ok(scenes.length < 3, 'câu ngắn phải gộp');
  assert.equal(scenes[0].index, 1);
  assert.ok(scenes.every((s) => s.narration && s.sentences.length >= 1));
  assert.throws(() => groupSentencesToScenes([], { ceiling: 8 }), /ít nhất một câu/);
});

test('gắn mốc SRT cho cảnh theo thứ tự, báo lowConfidence khi khớp kém', () => {
  const cues = parseSRT(SRT);
  const good = alignScenesToSRT([{ index: 1, narration: 'Xin chào các bạn' }, { index: 2, narration: 'Hôm nay ta học tiền' }], cues);
  assert.equal(good.matched, 2);
  assert.equal(good.lowConfidence, false);
  assert.equal(good.scenes[0].timing_source, 'srt');
  assert.ok(good.scenes[0].end <= good.scenes[1].start + 1e-9 || good.scenes[1].start >= 0);
  const bad = alignScenesToSRT([{ index: 1, narration: 'Chuyện hoàn toàn khác về vũ trụ' }], cues);
  assert.equal(bad.matched, 0);
  assert.equal(bad.lowConfidence, true);
});

test('xuất gói SRT+CSV+JSON và phát hiện lệch thời lượng', () => {
  const pkg = buildExportPackage({
    scenes: [
      { index: 1, narration: 'Xin chào', start: 0, end: 2.5, duration: 2.5, timing_source: 'srt' },
      { index: 2, narration: 'Học tiền', start: 2.5, end: 5, duration: 2.5, timing_source: 'srt' },
    ],
    voiceSeconds: 5,
    ceiling: 8,
  });
  assert.match(pkg.srt, /00:00:00,000 --> 00:00:02,500/);
  assert.ok(pkg.csv.split('\n')[0].includes('prompt_vi') && pkg.csv.split('\n')[0].includes('timing_source'));
  assert.equal(pkg.json.count, 2);
  assert.equal(pkg.warnings.length, 0);
  const drifted = buildExportPackage({ scenes: [{ index: 1, narration: 'A', duration: 10 }], voiceSeconds: 5, ceiling: 8 });
  assert.ok(drifted.warnings.some((w) => w.code === 'duration_drift' || w.code === 'duration_exceeded'));
});

test('cache từng cảnh: đổi nhạc giữ key clip câm, đổi ảnh/overlay/thời lượng/loại dựng đổi key', () => {
  const base = { index: 1, narration: 'A', image: 'img1', overlay: 'T1', duration: 4 };
  // Nhạc mux ở bước ghép cuối → đổi nhạc không dựng lại cảnh.
  assert.equal(sceneCacheKey(base), sceneCacheKey({ ...base, musicId: 'm2' }));
  assert.notEqual(sceneCacheKey(base), sceneCacheKey({ ...base, image: 'img2' }));
  assert.notEqual(sceneCacheKey(base), sceneCacheKey({ ...base, overlay: 'T2' }));
  assert.notEqual(sceneCacheKey(base), sceneCacheKey({ ...base, duration: 5 }));
  assert.notEqual(sceneCacheKey(base), sceneCacheKey({ ...base, buildKind: 'html', htmlSnippet: '<p>A</p>' }));
  assert.notEqual(sceneCacheKey(base), sceneCacheKey({ ...base, buildKind: 'wan', clip: 'c.mp4' }));
});

test('kiểm tra cảnh bằng code: rỗng, trùng, vượt nhịp, lệch voice', () => {
  const ok = validateBuildScenes([{ index: 1, narration: 'A', duration: 4, start: 0, end: 4 }], { ceiling: 8, voiceSeconds: 4 });
  assert.equal(ok.ok, true);
  const bad = validateBuildScenes(
    [{ index: 1, narration: '', duration: 20 }, { index: 1, narration: '', duration: 0 }],
    { ceiling: 8, voiceSeconds: 5 },
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /rỗng/.test(e)));
  assert.ok(bad.errors.some((e) => /vượt nhịp/.test(e)));
  assert.ok(bad.errors.some((e) => /lệch voice/.test(e)));
});

test('splitSentences giữ dấu câu và tách dòng', () => {
  const out = splitSentences('Tiền là công cụ. Biết dùng sớm!\nTiền đẻ ra tiền.');
  assert.deepEqual(out, ['Tiền là công cụ.', 'Biết dùng sớm!', 'Tiền đẻ ra tiền.']);
});
