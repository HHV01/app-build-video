// Bước 4 · Xem trước + xuất: gói dựng SRT/CSV/JSON và dựng MP4 từ 3 loại cảnh
// (ảnh FFmpeg, chữ/số liệu HTML, nhân vật cử động Wan) + voice.
// Render local không gọi AI. State lưu mã job và URL tải MP4 trên ổ đĩa.
let rendered = null;
export function rememberRender(entry) { rendered = entry; }
export function lastRender() { return rendered; }

// Giữ mọi cảnh để chặn dựng khi thiếu nội dung; không làm trôi voice.
export function collectBuildScenes(project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const items = scenes.map((s, i) => ({
    duration: Number(s?.duration) > 0 ? Number(s.duration) : 0,
    kind: s?.buildKind || 'image',
    image: s?.image || null,
    html: s?.htmlSnippet || '',
    clip: s?.clip || null,
    index: s?.index ?? i + 1,
  }));
  const missingImages = items.filter((x) => x.kind === 'image' && !x.image).map((x) => x.index);
  const missingHtml = items.filter((x) => x.kind === 'html' && !x.html.trim()).map((x) => x.index);
  const missingClips = items.filter((x) => x.kind === 'wan' && !x.clip).map((x) => x.index);
  const kinds = { image: 0, html: 0, wan: 0 };
  for (const x of items) kinds[x.kind] = (kinds[x.kind] || 0) + 1;
  const readyItems = items.filter((x) => x.duration > 0 && ((x.kind === 'image' && x.image) || (x.kind === 'html' && x.html.trim()) || (x.kind === 'wan' && x.clip)));
  const total = items.reduce((n, x) => n + (x.duration > 0 ? x.duration : 0), 0);
  return { items, missing: missingImages, missingImages, missingHtml, missingClips, kinds, clipsReady: items.filter((x) => x.kind === 'wan' && x.clip).length, readyCount: readyItems.length, withImage: items.filter((x) => x.image).length, count: items.length, total };
}

export function renderBuildPanel(p, rows, { esc, btn, caps = {}, voice = null, render = null } = {}) {
  const c = collectBuildScenes(p);
  const ffmpeg = Boolean(caps.ffmpeg);
  const voiceName = voice?.name || p.voiceFile?.name || (typeof p.voiceData === 'string' && p.voiceData ? 'voice đã lưu trong dự án' : '');
  const exceeded = c.items.filter((x) => x.duration > (Number(p.clipSeconds) || 8) + 0.5 + 1e-9).map((x) => x.index);
  const drift = p.voiceSeconds != null ? c.total - Number(p.voiceSeconds) : 0;
  const skipped = [...c.missingImages.map((i) => 'ảnh ' + i), ...c.missingHtml.map((i) => 'HTML ' + i), ...c.missingClips.map((i) => 'clip ' + i)];
  const ready = ffmpeg && (voice || p.voiceData) && c.count > 0 && c.readyCount === c.count && !exceeded.length && Math.abs(drift) <= 0.5;
  const res = p.buildResult;
  return `<section class="panel build-panel"><div class="panel-head"><h2>Dựng video · ảnh + HTML + Wan + voice thành MP4</h2></div>`
    + `<p>${c.count} cảnh: ${c.kinds.image} ảnh · ${c.kinds.html} HTML · ${c.kinds.wan} Wan (có clip ${c.clipsReady}/${c.kinds.wan}) · sẵn sàng dựng ${c.readyCount}/${c.count}, tổng ${c.total.toFixed(1)}s</p>`
    + (skipped.length ? `<p class="muted tiny">Cần bổ sung trước khi dựng: ${esc(skipped.join(', '))}.</p>` : '<p class="muted tiny">Đủ nội dung mọi cảnh.</p>')
    + (ffmpeg ? `<p class="muted tiny">FFmpeg sẵn sàng${caps.ffmpegVersion ? ' · ' + esc(caps.ffmpegVersion) : ''}.</p>` : '<div class="notice error">Studio chưa thấy ffmpeg. Cần tools/ffmpeg/bin/ffmpeg.exe (Windows) hoặc ffmpeg trong PATH.</div>')
    + (caps.htmlVideo ? '' : '<div class="notice warning">Chưa thấy Chromium/Chrome nên cảnh HTML chưa dựng được. Cài Chrome rồi tải lại.</div>')
    + (caps.wan ? '' : '<div class="notice warning">Chưa nối ComfyUI Wan (127.0.0.1:8188). Cảnh Wan cần tạo clip trước; cảnh khác vẫn dựng bình thường.</div>')
    + `<div class="field"><label for="build-voice-file">Voice để ghép · MP3/WAV/M4A ≤64 MB</label><input id="build-voice-file" type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"><p class="muted tiny">${voiceName ? 'Đã chọn: ' + esc(voiceName) + (voice?.size ? ' · ' + Math.round(voice.size / 1024) + ' KB' : '') : 'Chưa chọn voice. Voice được lưu trong dự án để dùng lại.'}</p></div>`
    + (exceeded.length ? `<div class="notice warning">Cảnh vượt nhịp: ${exceeded.join(', ')}.</div>` : '')
    + (p.voiceSeconds != null && Math.abs(drift) > 0.5 ? `<div class="notice warning">Tổng cảnh ${c.total.toFixed(1)}s lệch voice ${Number(p.voiceSeconds).toFixed(1)}s.</div>` : '')
    + `<p id="render-progress" aria-live="polite">${p.renderJobId ? 'Có bản dựng đang xử lý. Nhấn Xem tiến trình dựng để tiếp tục theo dõi.' : ''}</p>`
    + (p.buildError ? `<div class="notice error">${esc(p.buildError)}</div>` : '')
    + (res ? `<p>Kết quả dựng gần nhất: <strong>${esc(res.fileName)}</strong> · ${esc(res.sizeKB)} KB · ${esc(res.duration)}s · ${esc(res.scenes)} cảnh${res.dropped ? ' · bỏ ' + esc(res.dropped) + ' cảnh thiếu nội dung' : ''}.</p>` : '')
    + `<div class="actions">${btn('Xuất phụ đề SRT', 'export-build-srt', '', c.count ? '' : 'disabled')}${btn('Xuất gói CSV', 'export-build-csv', '', c.count ? '' : 'disabled')}${btn('Xuất gói JSON', 'export-build-json', '', c.count ? '' : 'disabled')}${btn(p.renderJobId ? 'Xem tiến trình dựng' : 'Dựng MP4 1080p', 'render-video', 'primary', (ready || p.renderJobId) ? '' : 'disabled')}${(p.buildResult?.url || render) ? btn('Tải MP4 vừa dựng', 'download-rendered-mp4') : ''}</div>`
    + `<p class="muted tiny">Video cố định 1920 × 1080 · 30 FPS. Gói SRT/CSV/JSON tạo bằng code, không tốn token. Đổi phụ đề hoặc nhạc chỉ cần dựng lại; đổi ảnh/HTML/clip mới cần nhập lại cảnh đó. Clip Wan tạo lần lượt trên GPU, duyệt động tác trước khi dựng.</p></section>`;
}
