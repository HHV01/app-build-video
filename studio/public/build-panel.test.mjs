import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBuildPanel, collectBuildScenes, lastRender, rememberRender } from './build-panel.mjs';

const esc = String;
const btn = (t, a, c = '', e = '') => `<button data-action="${a}" class="${c}" ${e}>${t}</button>`;

test('thu thập cảnh dựng theo 3 loại: ảnh, HTML, Wan', () => {
  const p = {
    clipSeconds: 8,
    scenes: [
      { index: 1, narration: 'A', duration: 4, image: '/api/assets/x.png' },
      { index: 2, narration: 'B', duration: 5 },
      { index: 3, narration: 'C', duration: 6, buildKind: 'html', htmlSnippet: '<p>50%</p>' },
      { index: 4, narration: 'D', duration: 2, buildKind: 'wan' },
    ],
  };
  const r = collectBuildScenes(p);
  assert.equal(r.count, 4);
  assert.deepEqual(r.kinds, { image: 2, html: 1, wan: 1 });
  assert.deepEqual(r.missingImages, [2]);
  assert.deepEqual(r.missingHtml, []);
  assert.deepEqual(r.missingClips, [4]);
  assert.equal(r.readyCount, 2);
  assert.equal(r.total, 17);
});

test('panel dựng báo thiếu nội dung, thiếu ffmpeg và khóa nút khi chưa đủ', () => {
  const p = { clipSeconds: 8, scenes: [{ index: 1, narration: 'A', duration: 4 }] };
  const cold = renderBuildPanel(p, [], { esc, btn, caps: {} });
  assert.match(cold, /chưa thấy ffmpeg/);
  assert.match(cold, /ảnh 1/);
  assert.match(cold, /disabled/);
  const ready = renderBuildPanel({ ...p, voiceData: '/api/assets/v.mp3', scenes: [{ index: 1, narration: 'A', duration: 4, image: '/api/assets/x.png' }] }, [], { esc, btn, caps: { ffmpeg: true, ffmpegVersion: 'ffmpeg 7', htmlVideo: true, wan: false } });
  assert.match(ready, /FFmpeg sẵn sàng/);
  assert.match(ready, /Đủ nội dung mọi cảnh/);
  assert.match(ready, /Dựng MP4/);
  assert.match(ready, /Xuất phụ đề SRT/);
  assert.match(ready, /Chưa nối ComfyUI Wan/);
});

test('ghi nhớ bản dựng trong phiên để tải lại', () => {
  assert.equal(lastRender(), null);
  rememberRender({ name: 'a.mp4', data: 'AAA' });
  assert.equal(lastRender().name, 'a.mp4');
  rememberRender(null);
  assert.equal(lastRender(), null);
});
