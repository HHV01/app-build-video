// Gói dựng video từ voice + ảnh (flow đã chốt).
// Tất cả hàm thuần túy, không gọi AI/API — tiết kiệm token: chỉ kịch bản và
// prompt cảnh dùng AI, còn mốc thời gian, kiểm tra, xuất file làm bằng code.
const WORD_SPLIT = /\s+/;

export function srtTimeToSeconds(text) {
  const m = String(text || '').trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)[,.](\d{1,3})$/);
  if (!m) throw new Error('Mốc SRT phải dạng HH:MM:SS,mmm (ví dụ 00:01:23,456).');
  const h = Number(m[1] || 0);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const ms = Number(String(m[4]).padEnd(3, '0'));
  return h * 3600 + min * 60 + sec + ms / 1000;
}

export function secondsToSrtTime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0 || s > 86400) throw new Error('Giây SRT không hợp lệ.');
  const totalMs = Math.round(s * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss},${String(ms).padStart(3, '0')}`;
}

// Phân tích SRT ngoài (từ app làm voice). Ném lỗi tiếng Việt khi sai định dạng.
export function parseSRT(text) {
  const raw = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!raw) throw new Error('File SRT rỗng.');
  const blocks = raw.split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trimEnd()));
  const cues = [];
  blocks.forEach((lines, bi) => {
    const rows = lines.filter((l, i) => i === 0 || l.trim() !== '');
    if (rows.length < 3) throw new Error(`Khối SRT ${bi + 1} thiếu dòng (cần số + mốc + chữ).`);
    const index = Number(rows[0].trim());
    if (!Number.isInteger(index) || index !== bi + 1) throw new Error(`Khối SRT ${bi + 1} phải đánh số ${bi + 1}.`);
    const mm = rows[1].match(/^(.*?)\s*-->\s*(.*?)$/);
    if (!mm) throw new Error(`Khối SRT ${index} thiếu mũi tên --> ở dòng mốc.`);
    const start = srtTimeToSeconds(mm[1].trim());
    const end = srtTimeToSeconds(mm[2].trim());
    if (!(end > start)) throw new Error(`Khối SRT ${index} có mốc kết thúc không sau mốc bắt đầu.`);
    const body = rows.slice(2).join('\n').trim();
    if (!body) throw new Error(`Khối SRT ${index} thiếu chữ phụ đề.`);
    if (rows.slice(2).length > 2) throw new Error(`Khối SRT ${index} quá 2 dòng chữ (giữ tối đa 2 dòng).`);
    if (end - start > 7.2 + 1e-9) throw new Error(`Khối SRT ${index} dài quá 7 giây.`);
    const prev = cues[cues.length - 1];
    if (prev && start < prev.end - 0.05 - 1e-9) throw new Error(`Khối SRT ${index} chồng lên khối trước.`);
    cues.push({ index, start, end, text: body });
  });
  return cues;
}

export function formatSRT(cues) {
  if (!Array.isArray(cues) || !cues.length) throw new Error('Cần ít nhất một mốc phụ đề để xuất SRT.');
  return cues.map((c, i) => `${i + 1}\n${secondsToSrtTime(c.start)} --> ${secondsToSrtTime(c.end)}\n${String(c.text || '').trim()}`).join('\n\n') + '\n';
}

// Tách câu giữ dấu câu. Dấu : cũng là ranh giới neo như voice-align hiện tại.
export function splitSentences(text) {
  const parts = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/(?<=[.?!…:。？！])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

export const normalizeWords = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(WORD_SPLIT)
    .filter(Boolean);

const estimateSeconds = (words, wpm) => Math.max(1, (words / wpm) * 60);

// Gộp câu cùng ý thành cảnh: tránh mỗi câu một ảnh. Gom câu ngắn liên tiếp
// đến khi gần nhịp cảnh (ceiling) nhưng không vượt quá tol.
export function groupSentencesToScenes(sentences, { ceiling = 8, wpm = 150, minSceneSeconds = 4 } = {}) {
  const list = (Array.isArray(sentences) ? sentences : []).map((s) => String(s || '').trim()).filter(Boolean);
  if (!list.length) throw new Error('Cần ít nhất một câu để chia cảnh.');
  const clip = Number(ceiling);
  if (!Number.isFinite(clip) || clip <= 0 || clip > 15) throw new Error('Nhịp cảnh phải trong 1–15 giây.');
  const scenes = [];
  let cur = [];
  let curWords = 0;
  const flush = () => {
    if (!cur.length) return;
    scenes.push({ narration: cur.join(' '), sentences: [...cur], estDuration: estimateSeconds(curWords, wpm) });
    cur = [];
    curWords = 0;
  };
  for (const sentence of list) {
    const w = sentence.split(WORD_SPLIT).filter(Boolean).length;
    const nextWords = curWords + w;
    const nextSec = estimateSeconds(nextWords, wpm);
    // Nếu thêm câu này vượt nhịp mà cảnh hiện tại đã đủ dài tối thiểu → chốt cảnh.
    if (cur.length && nextSec > clip && estimateSeconds(curWords, wpm) >= minSceneSeconds) flush();
    cur.push(sentence);
    curWords += w;
  }
  flush();
  return scenes.map((s, i) => ({ index: i + 1, ...s }));
}

// Gắn mốc SRT cho từng cảnh bằng khớp từ mờ, giữ đúng thứ tự cues.
// Không gọi AI. Cảnh khớp kém bị đánh dấu để duyệt bằng mắt.
export function alignScenesToSRT(scenes, cues, { minScore = 0.15, maxSpan = 12 } = {}) {
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('Cần danh sách cảnh để gắn mốc.');
  if (!Array.isArray(cues) || !cues.length) throw new Error('Cần cues SRT để gắn mốc.');
  const cueWordSets = cues.map((c) => new Set(normalizeWords(c.text)));
  const cueWordCounts = cues.map((c) => normalizeWords(c.text).length);
  let cursor = 0;
  let matched = 0;
  const out = scenes.map((scene, si) => {
    const sceneWords = normalizeWords(scene.narration);
    const sceneSet = new Set(sceneWords);
    let best = null;
    const lastStart = Math.min(cursor, cues.length - 1);
    for (let a = lastStart; a < cues.length; a += 1) {
      // Không bỏ quá 3 cues giữa các cảnh liên tiếp (tránh trôi mốc).
      if (a - cursor > 3 && si > 0) break;
      let union = new Set();
      let spanWords = 0;
      for (let b = a; b < Math.min(cues.length, a + maxSpan); b += 1) {
        for (const w of cueWordSets[b]) union.add(w);
        spanWords += cueWordCounts[b];
        let overlap = 0;
        for (const w of sceneSet) if (union.has(w)) overlap += 1;
        const score = (2 * overlap) / (sceneSet.size + union.size || 1);
        if (!best || score > best.score) best = { a, b, score, overlap };
        // Dừng nới span khi đã khớp gần trọn cảnh.
        if (overlap >= sceneSet.size) break;
      }
    }
    if (best && best.score >= minScore) {
      matched += 1;
      cursor = best.b + 1;
      const start = cues[best.a].start;
      const end = cues[best.b].end;
      return { ...scene, start, end, duration: end - start, timing_source: 'srt', srtCues: [cues[best.a].index, cues[best.b].index], alignScore: Number(best.score.toFixed(3)) };
    }
    return { ...scene, start: null, end: null, duration: null, timing_source: 'srt-unmatched', alignScore: best ? Number(best.score.toFixed(3)) : 0 };
  });
  const total = scenes.length;
  return { scenes: out, matched, total, lowConfidence: total ? matched / total < 0.6 : true };
}

function wrapTwoLines(text, width = 42) {
  const words = String(text || '').trim().split(WORD_SPLIT).filter(Boolean);
  if (!words.length) return '';
  const lines = [''];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (!last) lines[lines.length - 1] = w;
    else if ((last + ' ' + w).length <= width) lines[lines.length - 1] = last + ' ' + w;
    else if (lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = lines[lines.length - 1] + ' ' + w;
  }
  return lines.join('\n');
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Xuất gói dựng SRT + CSV + JSON. Kiểm tra thiếu cảnh/lệch thời lượng/sai
// định dạng bằng code trước khi tạo ảnh.
export function buildExportPackage({ scenes, voiceSeconds = null, ceiling = 8 } = {}) {
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('Cần danh sách cảnh để xuất gói dựng.');
  const clip = Number(ceiling);
  const rows = scenes.map((s, i) => {
    const index = Number(s.index ?? i + 1);
    const narration = String(s.narration || '').trim();
    let { start, end, duration } = s;
    start = start == null ? null : Number(start);
    end = end == null ? null : Number(end);
    duration = duration == null ? null : Number(duration);
    if (duration == null && start != null && end != null) duration = end - start;
    if (start == null && end == null && duration != null) {
      // Mốc cộng dồn sẽ điền sau.
    }
    return { ...s, index, narration, start, end, duration };
  });
  // Điền mốc cộng dồn cho cảnh thiếu start/end nhưng có duration.
  let cursor = 0;
  let anchored = false;
  for (const r of rows) {
    if (r.start != null && r.end != null) {
      cursor = r.end;
      anchored = true;
    } else if (r.duration != null) {
      r.start = anchored || cursor > 0 || r.index > 1 ? cursor : 0;
      r.end = r.start + r.duration;
      cursor = r.end;
    }
  }
  const warnings = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    if (r.index !== i + 1) warnings.push({ scene: r.index, code: 'bad_index', message: `Thiếu hoặc sai số cảnh tại vị trí ${i + 1}.` });
    if (!r.narration) warnings.push({ scene: r.index, code: 'empty', message: `Cảnh ${r.index} rỗng lời kể.` });
    const key = r.narration.toLowerCase();
    if (key && seen.has(key)) warnings.push({ scene: r.index, code: 'duplicate', message: `Cảnh ${r.index} trùng lời kể cảnh trước.` });
    if (key) seen.add(key);
    if (!(Number(r.duration) > 0)) warnings.push({ scene: r.index, code: 'bad_duration', message: `Cảnh ${r.index} thiếu thời lượng.` });
    else if (Number.isFinite(clip) && r.duration > clip + 0.5 + 1e-9) warnings.push({ scene: r.index, code: 'duration_exceeded', message: `Cảnh ${r.index} dài ${r.duration.toFixed(1)}s, vượt nhịp ${clip}s.` });
  });
  const total = rows.reduce((n, r) => n + (Number(r.duration) > 0 ? Number(r.duration) : 0), 0);
  const drift = voiceSeconds == null ? 0 : total - Number(voiceSeconds);
  if (voiceSeconds != null && Math.abs(drift) > 0.5) {
    warnings.push({ scene: 0, code: 'duration_drift', message: `Tổng cảnh ${total.toFixed(1)}s lệch voice ${Number(voiceSeconds).toFixed(1)}s (chênh ${drift > 0 ? '+' : ''}${drift.toFixed(1)}s).` });
  }
  const timed = rows.filter((r) => r.start != null && r.end != null && r.end > r.start);
  const srt = formatSRT(timed.map((r) => ({ start: r.start, end: r.end, text: wrapTwoLines(r.narration) })));
  const header = ['scene', 'narration', 'image_prompt', 'animation_prompt', 'overlay', 'sfx', 'characters', 'background', 'tags', 'warnings', 'duration', 'start', 'end', 'prompt_vi', 'timing_source'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    const w = warnings.filter((x) => x.scene === r.index).map((x) => x.code).join(',');
    lines.push([r.index, r.narration, r.image_prompt || '', r.animation_prompt || '', r.overlay || '', r.sfx || '', (r.characters || []).join(','), r.background || '', (r.tags || []).join(','), w, Number(r.duration) > 0 ? Number(r.duration.toFixed(3)) : '', r.start ?? '', r.end ?? '', r.prompt_vi || '', r.timing_source || ''].map(csvCell).join(','));
  }
  const json = { exportedAt: new Date().toISOString(), voiceSeconds, total: Number(total.toFixed(3)), drift: Number(drift.toFixed(3)), count: rows.length, scenes: rows };
  return { srt, csv: lines.join('\n') + '\n', json, total, drift, warnings };
}

// Khóa cache từng cảnh: clip cảnh là video câm (ảnh/HTML/Wan + overlay + thời lượng).
// Voice/nhạc mux ở bước ghép cuối nên đổi nhạc chỉ ghép lại, không dựng lại cảnh.
export function sceneCacheKey(scene) {
  const src = JSON.stringify({ n: scene.narration || '', img: scene.image || scene.image_prompt || '', ov: scene.overlay || '', d: Number(scene.duration) || 0, k: scene.buildKind || 'image', html: scene.htmlSnippet || '', clip: scene.clip || '' });
  let h = 5381;
  for (let i = 0; i < src.length; i += 1) h = ((h << 5) + h + src.charCodeAt(i)) >>> 0;
  return `scene-${scene.index || 0}-${h.toString(16).padStart(8, '0')}`;
}

// Kiểm tra gói cảnh bằng code: thiếu cảnh, lệch thời lượng, sai định dạng.
export function validateBuildScenes(scenes, { ceiling = 8, voiceSeconds = null } = {}) {
  const errors = [];
  if (!Array.isArray(scenes) || !scenes.length) return { ok: false, errors: ['Chưa có cảnh để kiểm tra.'] };
  scenes.forEach((s, i) => {
    const idx = Number(s.index ?? i + 1);
    if (idx !== i + 1) errors.push(`Thiếu hoặc sai số cảnh tại vị trí ${i + 1}.`);
    if (!String(s.narration || '').trim()) errors.push(`Cảnh ${idx} rỗng lời kể.`);
    if (!(Number(s.duration) > 0)) errors.push(`Cảnh ${idx} thiếu thời lượng.`);
    else if (Number(s.duration) > Number(ceiling) + 0.5 + 1e-9) errors.push(`Cảnh ${idx} vượt nhịp (${Number(s.duration).toFixed(1)}s > ${ceiling}s).`);
    if (s.start != null && s.end != null && !(Number(s.end) > Number(s.start))) errors.push(`Cảnh ${idx} có mốc kết thúc không sau mốc bắt đầu.`);
  });
  const narrations = scenes.map((s) => String(s.narration || '').trim().toLowerCase()).filter(Boolean);
  if (new Set(narrations).size !== narrations.length) errors.push('Có cảnh trùng lời kể.');
  if (voiceSeconds != null) {
    const total = scenes.reduce((n, s) => n + (Number(s.duration) > 0 ? Number(s.duration) : 0), 0);
    if (Math.abs(total - Number(voiceSeconds)) > 0.5) errors.push(`Tổng cảnh ${total.toFixed(1)}s lệch voice ${Number(voiceSeconds).toFixed(1)}s.`);
  }
  return { ok: errors.length === 0, errors };
}
