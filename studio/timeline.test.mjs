import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSrt, buildSrt, createTimeline, timelineCurrent, mergeSceneAssets, srtTime } from './timeline.mjs';

const narration = 'Đây là cảnh đầu tiên. Đây là cảnh thứ hai. Đây là cảnh cuối cùng.';
const srt = '1\n00:00:00,000 --> 00:00:02,000\nĐây là cảnh đầu tiên.\n\n2\n00:00:02,000 --> 00:00:04,000\nĐây là cảnh thứ hai.\n\n3\n00:00:04,000 --> 00:00:06,000\nĐây là cảnh cuối cùng.\n';

test('SRT round trip preserves valid timings, carries milliseconds, rejects overlaps and malformed data', () => {
  const cues = parseSrt(srt); assert.deepEqual(parseSrt(buildSrt(cues)), cues);
  assert.equal(srtTime(59.9996), '00:01:00,000');
  for (const bad of ['', '1\n00:00:00,000 --> 00:00:00,000\nhi', srt.replace('00:00:02,000 -->', '00:00:01,000 -->')]) assert.throws(() => parseSrt(bad));
});
test('Voice timeline retains every script word, covers leading/trailing silence and scene boundaries', () => {
  const result = createTimeline(narration, parseSrt(srt), 6, 2);
  assert.equal(result.scenes.length, 3); assert.equal(result.scenes.map(s => s.narration).join(' '), narration);
  assert.deepEqual(result.scenes.map(s => [s.start, s.end, s.duration]), [[0, 2, 2], [2, 4, 2], [4, 6, 2]]);
  assert.equal(result.needsReview, false); assert.equal(result.narration, narration);
  const silence = createTimeline('Xin chào bạn.', [{ start: 1, end: 2, text: 'Xin chào bạn.' }], 4, 10);
  assert.equal(silence.scenes[0].start, 0); assert.equal(silence.scenes.at(-1).end, 4);
  assert.equal(parseSrt(silence.srt)[0].start, 1);
});
test('Recognition differences require review without overwriting script; wrong voice is blocked', () => {
  const result = createTimeline(narration, parseSrt(srt.replace('đầu tiên', 'đầu tiêng')), 6, 2);
  assert.equal(result.needsReview, true); assert.equal(result.narration, narration); assert(result.warnings.length);
  assert.throws(() => createTimeline(narration, [{ start: 0, end: 6, text: 'Nội dung hoàn toàn khác.' }], 6, 10));
  assert.throws(() => createTimeline(narration, [{ start: 0, end: 9, text: narration }], 6, 10));
});
test('Timeline invalidates changed voice/script; media survive only matching scene narration', () => {
  const timeline = { narration, voice: '/api/assets/voice.wav' }, p = { narration, voiceData: timeline.voice, timeline };
  assert(timelineCurrent(p)); assert(!timelineCurrent({ ...p, voiceData: 'new.wav' })); assert(!timelineCurrent({ ...p, narration: narration + ' thêm' }));
  const next = createTimeline(narration, parseSrt(srt), 6, 2).scenes;
  const old = next.map(s => ({ ...s, image: 'image.png', clip: 'clip.mp4', clipApproved: true, prompt: 'keep this' }));
  const merged = mergeSceneAssets(next, old); assert.equal(merged[0].image, 'image.png'); assert.equal(merged[0].prompt, 'keep this'); assert(merged[0].clipApproved);
  const changed = mergeSceneAssets([{ ...next[0], duration: 2.5 }], old); assert.equal(changed[0].clipApproved, false);
});
