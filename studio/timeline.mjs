const fail = message => Object.assign(new Error(message), { status: 422 });
const round = x => Math.round(x * 1000) / 1000;
const normalized = text => String(text).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function tokens(text) {
  return [...String(text).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(m => ({ text: m[0], key: normalized(m[0]), at: m.index, to: m.index + m[0].length }));
}

export function srtTime(seconds) {
  let ms = Math.max(0, Math.round(Number(seconds) * 1000));
  const h = Math.floor(ms / 3600000); ms %= 3600000;
  const m = Math.floor(ms / 60000); ms %= 60000;
  const s = Math.floor(ms / 1000); ms %= 1000;
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0');
}

export function parseSrt(text) {
  const blocks = String(text).replace(/^\uFEFF/, '').replace(/\r/g, '').trim().split(/\n\s*\n/);
  const cues = [];
  const seconds = (h, m, s, ms) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  for (const block of blocks) {
    const lines = block.split('\n');
    if (/^\d+$/.test(lines[0]?.trim())) lines.shift();
    const m = lines.shift()?.match(/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})\s*-->\s*(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})\s*$/);
    if (!m) throw fail('SRT có dòng thời gian không hợp lệ.');
    const start = seconds(...m.slice(1, 5)), end = seconds(...m.slice(5, 9));
    const cue = { start, end, text: lines.join(' ').replace(/<[^>]*>/g, '').trim() };
    if (!(end > start) || !cue.text || (cues.length && start < cues.at(-1).end - 0.02)) throw fail('SRT có câu rỗng, thời gian đảo hoặc các câu chồng nhau.');
    cues.push(cue);
  }
  if (!cues.length) throw fail('SRT chưa có câu nào.');
  return cues;
}

export function buildSrt(cues) {
  return cues.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n');
}

function align(script, heard) {
  if (script.length === heard.length && script.every((x, i) => x.key === heard[i].key)) return { pairs: script.map((_, i) => [i, i]), edits: 0 };
  const n = script.length, m = heard.length;
  if (n * m > 100000000) throw fail('Bản ghi quá dài để đối chiếu tự động. Nhập SRT đã khớp kịch bản hoặc chia voice thành các phần.');
  const trace = new Uint8Array((n + 1) * (m + 1));
  let previous = Uint32Array.from({ length: m + 1 }, (_, i) => i), current = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    current[0] = i;
    for (let j = 1; j <= m; j++) {
      const diagonal = previous[j - 1] + (script[i - 1].key !== heard[j - 1].key ? 1 : 0);
      const deletion = previous[j] + 1, insertion = current[j - 1] + 1;
      if (diagonal <= deletion && diagonal <= insertion) { current[j] = diagonal; trace[i * (m + 1) + j] = 0; }
      else if (deletion <= insertion) { current[j] = deletion; trace[i * (m + 1) + j] = 1; }
      else { current[j] = insertion; trace[i * (m + 1) + j] = 2; }
    }
    [previous, current] = [current, previous];
  }
  const edits = previous[m], pairs = [];
  let i = n, j = m;
  while (i && j) {
    const direction = trace[i * (m + 1) + j];
    if (direction === 0) { pairs.push([--i, --j]); }
    else if (direction === 1) i--;
    else j--;
  }
  return { pairs: pairs.reverse(), edits };
}

export function createTimeline(narration, segments, duration, ceiling = 10, source = 'srt') {
  const text = String(narration || '').trim(), script = tokens(text), seconds = Number(duration), limit = Number(ceiling);
  if (!script.length || !Number.isFinite(seconds) || seconds <= 0 || seconds > 3600 || !Number.isFinite(limit) || limit < 2 || limit > 15) throw fail('Cần kịch bản đã lưu, voice được đo và nhịp cảnh từ 2 đến 15 giây.');
  const heard = []; let previousStart = -1;
  for (const segment of segments || []) {
    const words = tokens(segment.text ?? segment.word ?? '');
    const start = Number(segment.start), end = Number(segment.end);
    if (!words.length) continue;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > seconds + 0.25 || start < previousStart) throw fail('Mốc lời đọc không hợp lệ hoặc vượt thời lượng voice.');
    previousStart = start;
    words.forEach((word, index) => heard.push({ ...word, start: Math.min(seconds, start + (end - start) * index / words.length), end: Math.min(seconds, start + (end - start) * (index + 1) / words.length) }));
  }
  if (!heard.length) throw fail('Không có lời đọc để đối chiếu. Nhập SRT hoặc tạo mốc từ voice.');
  const result = align(script, heard), similarity = Math.max(0, 1 - result.edits / Math.max(script.length, heard.length));
  if (similarity < 0.85) throw fail('Voice/SRT khác quá nhiều so với kịch bản đã lưu. Kiểm tra lại file voice; kịch bản được giữ nguyên.');
  const timed = script.map(w => ({ ...w, start: null, end: null }));
  for (const [i, j] of result.pairs) { timed[i].start = heard[j].start; timed[i].end = heard[j].end; }
  for (let i = 0; i < timed.length;) {
    if (timed[i].start !== null) { i++; continue; }
    const first = i; while (i < timed.length && timed[i].start === null) i++;
    const start = first ? timed[first - 1].end : 0, end = i < timed.length ? timed[i].start : seconds;
    for (let k = first; k < i; k++) { timed[k].start = start + (end - start) * (k - first) / (i - first); timed[k].end = start + (end - start) * (k - first + 1) / (i - first); }
  }
  const sentenceEnd = i => i === timed.length - 1 || /[.!?…]/u.test(text.slice(timed[i].to, timed[i + 1].at));
  const wordsText = (first, last) => text.slice(first ? timed[first].at : 0, last + 1 < timed.length ? timed[last + 1].at : text.length).trim();
  const cues = [], scenes = [], warnings = [];
  for (let first = 0; first < timed.length;) {
    let last = first;
    while (last + 1 < timed.length && timed[last + 1].end - timed[first].start <= 6 && wordsText(first, last + 1).length <= 84 && !sentenceEnd(last)) last++;
    cues.push({ start: round(timed[first].start), end: round(timed[last].end), text: wordsText(first, last) });
    first = last + 1;
  }
  for (let first = 0; first < timed.length;) {
    const start = scenes.length ? scenes.at(-1).end : 0;
    let last = first, preferred = -1;
    while (last + 1 < timed.length) {
      const next = last + 1, boundary = next + 1 < timed.length ? timed[next + 1].start : seconds;
      if (boundary - start > limit + 0.001) break;
      last = next;
    }
    for (let i = first; i <= last && i + 1 < timed.length; i++) {
      const boundary = timed[i + 1].start;
      const phraseEnd = /[,;:.!?…]/u.test(text.slice(timed[i].to, timed[i + 1].at)) || boundary - timed[i].end >= 0.3;
      if (phraseEnd && boundary - start >= limit * 0.4 && boundary - start <= limit + 0.001) preferred = i;
    }
    if (last !== timed.length - 1 && preferred >= first) last = preferred;
    const end = last === timed.length - 1 ? seconds : timed[last + 1].start;
    if (end - start > limit + 0.25) warnings.push(`Cảnh ${scenes.length + 1} có khoảng nghỉ dài, vượt nhịp ${limit}s. Kiểm tra trước khi làm clip AI.`);
    scenes.push({ id: `scene-${String(scenes.length + 1).padStart(4, '0')}`, start: round(start), end: round(end), duration: round(end - start), narration: wordsText(first, last), visual: '', prompt: '', overlay: '', renderMode: 'image', motion: scenes.length % 2 ? 'pan-left' : 'zoom-in', animationApproved: false, clipApproved: false, promptApproved: false });
    first = last + 1;
  }
  if (result.edits) warnings.unshift(`Có ${result.edits} khác biệt từ giữa voice/SRT và kịch bản. Đối chiếu lời đọc và mốc trước khi duyệt.`);
  return { narration: text, duration: seconds, source, cues, scenes, srt: buildSrt(cues), similarity: round(similarity), needsReview: result.edits > 0, warnings, precision: source === 'local' ? 'word' : 'cue' };
}

export function timelineCurrent(project) {
  if (!project.timeline || project.timeline.narration !== String(project.narration || '').trim() || project.timeline.voice !== project.voiceData || project.assetsStale) return false;
  if (project.scenes?.length) {
    let end = 0;
    for (const scene of project.scenes) {
      if (![scene.start, scene.end, scene.duration].every(Number.isFinite) || scene.duration <= 0 || Math.abs(scene.start - end) > 0.002 || Math.abs(scene.end - scene.start - scene.duration) > 0.002) return false;
      end = scene.end;
    }
    if (Math.abs(end - Number(project.voiceSeconds)) > 0.05) return false;
  }
  return true;
}

export function mergeSceneAssets(next, previous = []) {
  const used = new Set();
  return next.map(scene => {
    const index = previous.findIndex((old, i) => !used.has(i) && old.narration === scene.narration);
    if (index < 0) return scene;
    used.add(index);
    const old = previous[index], unchanged = Math.abs(Number(old.duration) - scene.duration) < 0.01;
    return { ...old, ...scene, visual: old.visual || '', prompt: old.prompt || '', overlay: old.overlay || '', image: old.image || '', clip: old.clip || '', animationPrompt: old.animationPrompt || '', animationApproved: !!old.animationApproved, promptApproved: !!old.promptApproved, clipApproved: unchanged && !!old.clipApproved, renderMode: old.renderMode || 'image', motion: old.motion || scene.motion };
  });
}

export function sceneCsv(scenes) {
  const cell = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
  const header = ['scene', 'image_file', 'start', 'end', 'duration', 'narration', 'visual', 'image_prompt', 'motion_prompt', 'overlay', 'render_mode'];
  return '\uFEFF' + [header, ...scenes.map((s, i) => [s.id, `scene-${String(i + 1).padStart(4, '0')}.${s.image?.match(/\.(png|jpg|webp)$/)?.[1] || 'png'}`, s.start, s.end, s.duration, s.narration, s.visual, s.prompt, s.animationPrompt, s.overlay, s.renderMode || 'image'])].map(row => row.map(cell).join(',')).join('\r\n');
}
