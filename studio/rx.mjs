// Nghiệp vụ khảo sát ngách (4 bước) + xưởng (9 bước).
// Nguyên tắc: mọi chỉ số ở đây đều TÍNH TỪ video người dùng đã thu thập.
// Không sinh lượt xem, không suy đoán retention/CTR, không phát minh nguồn.
// Không phụ thuộc module khác để chạy được cả trong Node lẫn trình duyệt.
const median = values => {
  const a = (values || []).filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2 : null;
};

// Sàn view để tính "video đã ăn". Đây là ngưỡng cấu hình, không phải số liệu thị trường.
export const HIT_FLOOR_VIEWS = 20000;

// Hai nhóm dưới ngưỡng này được coi là sát nhau -> gợi ý gộp thử.
export const GROUP_PROXIMITY = 0.16;

export const GATES = {
  rong: { id: 'rong', label: 'Rộng', minVideoAgeDays: 30, minChannelHits: 2, minGroupVideos: 3, minGroupChannels: 1 },
  vua: { id: 'vua', label: 'Vừa (mặc định)', minVideoAgeDays: 60, minChannelHits: 3, minGroupVideos: 4, minGroupChannels: 2 },
  chat: { id: 'chat', label: 'Chặt', minVideoAgeDays: 90, minChannelHits: 5, minGroupVideos: 5, minGroupChannels: 3 },
};

const pos = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function resolveGate(gate) {
  const g = typeof gate === 'string' ? GATES[gate] : gate || GATES.vua;
  const base = GATES.vua;
  return {
    id: String(g.id || base.id),
    label: String(g.label || base.label),
    minVideoAgeDays: pos(g.minVideoAgeDays, base.minVideoAgeDays),
    minChannelHits: pos(g.minChannelHits, base.minChannelHits),
    minGroupVideos: pos(g.minGroupVideos, base.minGroupVideos),
    minGroupChannels: pos(g.minGroupChannels, base.minGroupChannels),
  };
}

export function describeGate(gate) {
  const g = resolveGate(gate);
  return `video qua ${g.minVideoAgeDays} ngày · kênh ≥${g.minChannelHits} video đã ăn · nhóm ≥${g.minGroupVideos} video và ≥${g.minGroupChannels} kênh`;
}

export const fmt = n => (Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('vi-VN') : '—');
export const fmtMultiple = n => (Number.isFinite(Number(n)) ? `×${Number(n).toFixed(2)}` : '—');

export function ageDays(video, now = Date.now()) {
  const t = Date.parse(video?.publishedAt || '');
  return Number.isFinite(t) ? Math.max(0, (now - t) / 86400000) : null;
}

// ---------------------------------------------------------------- BƯỚC 1 + 2
// analyzeChannels: bảng kênh. Cột "đã ăn xong" chỉ tính video đã qua ngày cổng.
// Cột "vào khuôn" cho biết kênh có lặp khuôn tiêu đề đang học hay không.
export function analyzeChannels(videos, options = {}) {
  const gate = resolveGate(options.gate);
  const now = options.now ?? Date.now();
  const template = String(options.template || '').trim().toLowerCase();
  const map = new Map();
  for (const v of videos || []) {
    const id = String(v.channelId || '');
    if (!id) continue;
    if (!map.has(id)) map.set(id, { id, name: v.channelTitle || id, subscribers: v.subscribers ?? null, videos: [] });
    map.get(id).videos.push(v);
  }
  const channels = [];
  for (const c of map.values()) {
    const all = c.videos.filter(v => Number.isFinite(v.views));
    const mature = all.filter(v => { const a = ageDays(v, now); return a != null && a >= gate.minVideoAgeDays; });
    const hits = mature.filter(v => v.views >= HIT_FLOOR_VIEWS);
    const medianViews = median(mature.map(v => v.views));
    const maxViews = mature.reduce((m, v) => Math.max(m, v.views), 0);
    const templateVideos = template ? all.filter(v => String(v.title || '').toLowerCase().includes(template)).length : null;
    const viewPass = medianViews != null && medianViews > HIT_FLOOR_VIEWS;
    const hitPass = hits.length >= gate.minChannelHits;
    const reasons = [];
    if (!viewPass) reasons.push(`trung vị ${fmt(medianViews)} chưa vượt ${fmt(HIT_FLOOR_VIEWS)}`);
    if (!hitPass) reasons.push(`mới ${hits.length}/${gate.minChannelHits} video đã ăn`);
    channels.push({
      id: c.id,
      name: c.name,
      subscribers: c.subscribers,
      totalVideos: all.length,
      matureVideos: mature.length,
      hits: hits.length,
      medianViews,
      maxViews,
      templateVideos,
      templateShare: templateVideos == null ? null : all.length ? templateVideos / all.length : 0,
      viewPass,
      hitPass,
      gatePass: viewPass && hitPass,
      gateReason: reasons.length ? reasons.join(' · ') : 'đạt',
      clusterNote: templateVideos === 0 ? 'không có cụm mẫu nào lặp qua nơi này' : null,
    });
  }
  channels.sort((a, b) => Number(b.gatePass) - Number(a.gatePass) || (b.medianViews ?? -1) - (a.medianViews ?? -1));
  return { gate, channels };
}

// Kho gộp: video của các kênh đã chọn, kèm bội số so với trung vị chính kênh đó.
export function videoPool(videos, options = {}) {
  const now = options.now ?? Date.now();
  const gate = resolveGate(options.gate);
  const only = options.channelIds && options.channelIds.length ? new Set(options.channelIds.map(String)) : null;
  return (videos || [])
    .filter(v => v && v.id && (!only || only.has(String(v.channelId))))
    .filter(v => { const a = ageDays(v, now); return a != null && a >= gate.minVideoAgeDays && Number.isFinite(v.views); })
    .map(v => {
      const multiple = Number.isFinite(v.multiple) ? v.multiple : null;
      return { id: String(v.id), title: v.title, channelId: v.channelId, channelTitle: v.channelTitle, views: v.views, multiple, url: v.url || '', ageDays: Math.round(ageDays(v, now)) };
    })
    .sort((a, b) => (b.multiple ?? -1) - (a.multiple ?? -1));
}

// ---------------------------------------------------------------- BƯỚC 3
export function analyzeGroups(groups, videos, options = {}) {
  const gate = resolveGate(options.gate);
  const now = options.now ?? Date.now();
  const byId = new Map((videos || []).map(v => [String(v.id), v]));
  const rows = [];
  for (const g of groups || []) {
    const vs = (g.videoIds || []).map(id => byId.get(String(id))).filter(Boolean);
    const mature = vs.filter(v => { const a = ageDays(v, now); return a != null && a >= gate.minVideoAgeDays; });
    const channelNames = [...new Set(mature.map(v => v.channelTitle || String(v.channelId)))];
    const medianMultiple = median(mature.map(v => v.multiple).filter(Number.isFinite));
    const videoPass = mature.length >= gate.minGroupVideos;
    const channelPass = channelNames.length >= gate.minGroupChannels;
    const ages = mature.map(v => ageDays(v, now)).filter(Number.isFinite);
    rows.push({
      id: String(g.id),
      name: String(g.name || 'Nhóm chưa tên'),
      angle: String(g.angle || ''),
      reason: String(g.reason || ''),
      videos: mature.length,
      channels: channelNames.length,
      channelNames,
      medianMultiple,
      newestDaysAgo: ages.length ? Math.min(...ages) : null,
      gatePass: videoPass && channelPass,
      gateReason: videoPass && channelPass ? 'đạt' : [`${mature.length}/${gate.minGroupVideos} video`, `${channelNames.length}/${gate.minGroupChannels} kênh`].join(' · '),
      // Cột "máy kênh" quan trọng nhất: nhóm đủ số video nhưng dồn hết về một tên group là bẫy.
      clusterWarning: channelNames.length === 1 && mature.length >= gate.minGroupVideos ? 'bẫy: nhóm đủ số video nhưng dồn hết về một tên group — phải đổi tên nhóm' : null,
    });
  }
  rows.sort((a, b) => Number(b.gatePass) - Number(a.gatePass) || (b.medianMultiple ?? -1) - (a.medianMultiple ?? -1));
  return { gate, groups: rows, proximity: closeGroups(rows, options.proximity ?? GROUP_PROXIMITY) };
}

export function closeGroups(rows, threshold = GROUP_PROXIMITY) {
  const usable = (rows || []).filter(r => Number.isFinite(r.medianMultiple));
  const out = [];
  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      const gap = Math.abs(usable[i].medianMultiple - usable[j].medianMultiple);
      if (gap <= threshold) out.push({ a: usable[i].name, b: usable[j].name, gap: Number(gap.toFixed(2)) });
    }
  }
  return out.sort((x, y) => x.gap - y.gap);
}

// ---------------------------------------------------------------- TẠO KÊNH
// 10 kiểu hook 15 giây đầu, xoay vòng. verified = lấy từ app tham khảo, còn lại là mặc định của Studio.
export const HOOK_TYPES = [
  { id: 'shock-stat-then-misdirect', how: 'Mở bằng một con số chấn động, rồi phủ nhận điều hiển nhiên.', verified: true },
  { id: 'assumption-to-create-intrigue', how: 'Nêu điều đa số nghĩ, rồi bẻ lá tạo tò mò.', verified: true },
  { id: 'myth-buster', how: 'Đưa ra một điều được tin phổ biến rồi bác bỏ từ gốc.', verified: true },
  { id: 'defiance-paradox', how: 'Giới thiệu một dân tộc hay lực lượng phá vỡ mọi quy luật lịch sử.', verified: true },
  { id: 'in-medias-res-scene', how: 'Thả người xem vào một khoảnh khắc có ngày giờ, giữa hành động.', verified: true },
  { id: 'cost-of-choice', how: 'Mở bằng cái giá phải trả của một lựa chọn rất bình thường.', verified: false },
  { id: 'document-then-crack', how: 'Dựng bức tranh chính thống rồi chỉ ra chỗ nứt.', verified: false },
  { id: 'two-timelines', how: 'Đặt hai mốc thời gian cạnh nhau để thấy điều nghịch lý.', verified: false },
  { id: 'smallest-thing', how: 'Bắt đầu từ thứ nhỏ nhất rồi kéo ra thứ to nhất.', verified: false },
  { id: 'forgotten-stake', how: 'Mở bằng thứ ai đó sắp mất mà chưa ai nhắc tới.', verified: false },
];

export function nextHook(used = [], rotation = HOOK_TYPES) {
  const seen = new Set((used || []).map(String));
  return rotation.find(h => !seen.has(h.id)) || rotation[0];
}

// Chỉ trên thumbnail: tên chọn thế 1–4 tiếng, phải có trong tiêu đề.
export const THUMB_RULES = { maxWords: 4, maxChars: 17, requiredSections: ['chữ', 'nguoi/cảnh'] };
export function thumbLineCheck(text, title) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const inTitle = String(title || '').toLowerCase().includes(String(text || '').trim().toLowerCase());
  return { words: words.length, chars: String(text || '').trim().length, wordsOk: words.length >= 1 && words.length <= THUMB_RULES.maxWords, charsOk: String(text || '').trim().length <= THUMB_RULES.maxChars, inTitle };
}

// Chữ trong khung: không viết chữ có thể đọc được vào ảnh; chữ ghép ở trình soạn.
export const NO_TEXT_IN_IMAGE = 'no readable text, no captions, no title card, no watermark, no signature in the artwork';
export const STICKMAN_PROFILE = {
  source: 'STICKMAN FINANCE MODULE PDF · ANIMATION STYLE · trang 72–75; chỉ trích quy tắc hình ảnh',
  background: 'white or slightly warm white, generous negative space, very sparse environment',
  linework: 'bold organic rounded black contours, consistent 5–10px equivalent at 1920x1080',
  rendering: 'minimal hand-drawn 2D explainer, flat fills, expressive icon-like face, sparse pencil accents',
  lighting: 'flat 2D; no cinematic illumination, realistic shadows, gradients or elaborate scenery',
  identity: 'follow supplied character sheet; do not borrow the sample detective costume or redesign Tich',
  captions: {placement:'editor overlay, lower center',font:'heavy rounded sans serif',colors:'white with yellow emphasis and thick black outline',bakeIntoImage:false},
  avoid: 'photorealism, 3D, anime, thin lines, realistic anatomy, logos, borders, decorative backgrounds',
};

// Dòng phụ đặt dưới chữ chính trên thumbnail. Chọn một loại và dùng lại nhất quán cho cả kênh.
export const SUB_LINES = ['Nam', 'Địa danh', 'Câu phụ'];

// Thư viện khung thumbnail của Studio — bố cục tự thiết kế, không sao chép từ app khác.
// Mỗi khung mô tả ba chỗ: CHỮ (chính), CẢNH, DÒNG PHỤ. Chọn một khung làm mặc định cả kênh.
export const THUMB_LAYOUTS = [
  { id: 'split-2', legacy: 'split', name: 'Cảnh trái · chữ phải', text: 'Chữ chính 1 dòng lớn bên phải, tối đa 4 tiếng.', scene: 'Ảnh chiếm 2/3 bên trái, chủ thể nhìn ra mép phải để chữ không đè lên đầu nhân vật.', sub: 'không có', canvas: { image: [0, 0, 0.52, 1], text: [0.56, 0.3, 0.44, 0.4], sub: [0.56, 0.62, 0.44, 0.18] } },
  { id: 'text-top', legacy: 'top', name: 'Chữ trên · cảnh dưới', text: 'Dải chữ 1 dòng trên cùng, chữ chính to hơn dòng phụ.', scene: 'Cảnh chiếm phần dưới, chủ thể canh chừa khoảng trống phía trên.', sub: 'Dòng niên đại nhỏ hơn ngay dưới chữ chính.', canvas: { text: [0.04, 0.05, 0.92, 0.26], image: [0, 0.34, 1, 0.66], sub: [0.04, 0.24, 0.92, 0.1] } },
  { id: 'map-full', name: 'Bản đồ tràn khung · chữ dưới', text: 'Chữ chính đè trên dải tối ở 1/3 dưới.', scene: 'Bản đồ hoặc sơ đồ tràn tới bốn mép, không viền, không khung trắng.', sub: 'không có', canvas: { image: [0, 0, 1, 0.68], text: [0.06, 0.72, 0.88, 0.2], sub: [0.06, 0.92, 0.88, 0.08] } },
  { id: 'portrait-left', name: 'Người cách điệu trái · chữ phải', text: 'Chữ chính bên phải, xuống dòng tự nhiên theo độ dài.', scene: 'Nhân vật dạng que ở 2/3 chiều cao bên trái, chừa khoảng trống phía trên để đặt tiêu đề.', sub: 'Dòng phụ dạng tên hoặc địa danh.', canvas: { image: [0.02, 0.12, 0.46, 0.86], text: [0.52, 0.34, 0.44, 0.3], sub: [0.52, 0.62, 0.44, 0.14] } },
  { id: 'chart-focus', name: 'Số liệu lớn · chữ 1 dòng', text: 'Một con số hoặc cụm từ ngắn, cỡ rất lớn.', scene: 'Biểu đồ hoặc đối tượng số liệu chiếm nền, tương phản thấp để chữ nổi.', sub: 'Đơn vị hoặc mốc thời gian.', canvas: { image: [0, 0, 1, 1], text: [0.05, 0.4, 0.9, 0.24], sub: [0.05, 0.64, 0.9, 0.1] } },
  { id: 'three-frames', name: 'Ba khung nhỏ · chữ giữa', text: 'Chữ chính nằm giữa, ngắn.', scene: 'Ba khung hình nhỏ xếp ngang hoặc dọc, cùng một chủ thể ở ba thời điểm.', sub: 'không có', canvas: { image: [0.04, 0.04, 0.92, 0.36], text: [0.06, 0.48, 0.88, 0.24], sub: [0.06, 0.74, 0.88, 0.1] } },
  { id: 'document-band', name: 'Tài liệu · dải chữ giữa', text: 'Chữ chính trên dải giấy.', scene: 'Trang tài liệu, sổ sách hoặc giấy bạc chiếm nền, làm nền cho dải chữ.', sub: 'Dòng câu phụ kiểu trích dẫn.', canvas: { image: [0, 0, 1, 1], text: [0.08, 0.42, 0.84, 0.22], sub: [0.08, 0.66, 0.84, 0.12] } },
  { id: 'object-hero', legacy: 'hero', name: 'Một vật thể giữa khung · chữ trên', text: 'Chữ chính một dòng trên cùng, canh giữa.', scene: 'Một vật thể duy nhất giữa khung, nền trơn, bóng đổ nhẹ.', sub: 'không có', canvas: { text: [0.04, 0.08, 0.92, 0.24], image: [0.16, 0.36, 0.68, 0.6], sub: [0.04, 0.94, 0.92, 0.06] } },
];
// Chấp nhận cả id cũ (split / top / hero) để kênh đã tạo không mất khung đang dùng.
export function findLayout(id) {
  const key = String(id ?? '');
  return THUMB_LAYOUTS.find(l => l.id === key || l.legacy === key) || THUMB_LAYOUTS[0];
}
// Prompt full-bleed chuẩn cho mọi ảnh bìa.
export const FULL_BLEED = 'the artwork fills the ENTIRE image, edge to edge. NO border, NO frame, no outline around the picture, no white or coloured margin, no matte, no passe-partout, no rounded corners, no torn-paper or postcard edge, no drop shadow around the image. The drawing must touch all four edges of the canvas.';

// Ảnh tham chiếu chỉ để người xem và máy đọc, không gợi ý máy vẽ theo.
export const REFERENCE_RULE = 'Ảnh tham chiếu chỉ để bạn xem và máy đọc được; không bao giờ gợi ý cho máy vẽ.';

// ---------------------------------------------------------------- XƯỞNG
export const CLIP_BATCHES = [4, 6, 8];

// Chia cảnh theo lô 4s / 6s / 8s sao cho tổng khớp voice đã đo.
export function batchScenes(scenes, totalSeconds) {
  const list = (scenes || []).map(s => ({ duration: 4 }));
  const target = Number(totalSeconds);
  const wanted = Number.isFinite(target) && target > 0 ? target : list.length * 4;
  let extra = Math.max(0, wanted - list.length * 4);
  let pass = 0;
  while (extra >= 2 && pass < 4) {
    for (let i = 0; i < list.length && extra >= 2; i += 1) {
      if (list[i].duration < 8) { list[i].duration += 2; extra -= 2; }
    }
    pass += 1;
  }
  const batches = CLIP_BATCHES.map(seconds => ({ seconds, indices: [], count: 0 }));
  const bucket = new Map(batches.map(b => [b.seconds, b]));
  list.forEach((s, i) => { const b = bucket.get(s.duration) || bucket.get(4); b.indices.push(i); b.count += 1; });
  return batches;
}

// Gợi ý cảnh nên làm clip: có nhân vật + khoảnh khắc cao trào + 3–8 giây, mảnh xếp trước.
const CLIMAX_WORDS = /\b(rush|attack|battle|siege|storm|explod|burn|collaps|sank|sink|stab|crash|charge|fight|kill|drown|flee|fled|fell|fought|died|dead|broke|shatter|wave|waves|flood|revolt|riot|escap|crash)\w*\b/gi;
export function suggestClips(scenes, limit = 42) {
  const scored = (scenes || []).map((s, i) => {
    const narration = String(s?.narration || '');
    const words = narration.trim().split(/\s+/).filter(Boolean).length;
    const hits = (narration.match(CLIMAX_WORDS) || []).length;
    const chars = Array.isArray(s?.characters) ? s.characters.filter(Boolean).length : 0;
    const dur = Number(s?.duration) || 4;
    let score = 0;
    if (chars > 0) score += 2;
    score += Math.min(3, hits) * 2;
    if (words >= 8 && words <= 34) score += 1;
    if (dur >= 3 && dur <= 8) score += 1;
    return { index: i, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.max(0, limit)).sort((a, b) => a.index - b.index).map(s => s.index);
}

// Mã 3 chữ cho tên file, để G-Labs tự gán ảnh theo tên.
export function assetCode(seed) {
  let h = 2166136261;
  for (const ch of String(seed ?? '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const a = 'abcdefghijklmnopqrstuvwxyz';
  return a[(h >>> 0) % 26] + a[(h >>> 7) % 26] + a[(h >>> 14) % 26];
}
export function sceneFileName(seed, index, ext = 'png') {
  return `${assetCode(seed)}-${String(index).padStart(3, '0')}.${String(ext).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'}`;
}
export function clipFileName(index, ext = 'mp4') {
  return `scene-${String(index).padStart(3, '0')}.${String(ext).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4'}`;
}

// Bối cảnh cần ảnh gốc khi lặp ≥4 cảnh.
export const BACKGROUND_REFERENCE_MIN_SCENES = 4;
export function referencePlan(scenes, options = {}) {
  const min = options.min ?? BACKGROUND_REFERENCE_MIN_SCENES;
  const chars = new Map(), backgrounds = new Map();
  for (const s of scenes || []) {
    for (const c of Array.isArray(s.characters) ? s.characters : []) if (c) chars.set(c, (chars.get(c) || 0) + 1);
    if (s.background) backgrounds.set(s.background, (backgrounds.get(s.background) || 0) + 1);
  }
  const needed = [...backgrounds].filter(([, n]) => n >= min).map(([name, count]) => ({ name, count }));
  const optional = [...backgrounds].filter(([, n]) => n > 1 && n < min).map(([name, count]) => ({ name, count }));
  return {
    backgrounds: [...backgrounds].map(([name, count]) => ({ name, count, needsReference: count >= min })),
    characters: [...chars].map(([name, count]) => ({ name, count, needsReference: count > 2 })),
    needed, optional,
    summary: `${backgrounds.size} bối cảnh vẽ khi dùng — ${needed.length} cái cần ảnh gốc (từ ${min} cảnh); ${optional.length} cái >1 cảnh nên làm ảnh gốc`,
  };
}

// Ước đoạt thời lượng: tiếng tốc độ kênh, mặc định 150 câu/phút cho tiếng Anh tài liệu.
export const DEFAULT_WPM = 150;
export function estimateRead(words, wpm = DEFAULT_WPM) {
  const w = Number(words) || 0, rate = pos(wpm, DEFAULT_WPM);
  if (w <= 0) return { words: 0, seconds: 0, label: '0,0 phút' };
  const seconds = Math.round((w / rate) * 60);
  return { words: w, wpm: rate, seconds, label: `${(seconds / 60).toFixed(1).replace('.', ',')} phút` };
}

// Cân voice với timeline cảnh.
export function timingCheck(scenes, voiceSeconds) {
  const total = (scenes || []).reduce((a, s) => a + (Number(s.duration) || 0), 0);
  const voice = Number(voiceSeconds) || 0;
  return { sceneTotal: total, voice, diff: voice ? Number((voice - total).toFixed(1)) : null, ok: !voice || Math.abs(voice - total) <= 0.5 };
}

// ---------------------------------------------------------------- HẠN MỨC & CHI PHÍ
// Đơn vị hạn mức theo tài liệu YouTube Data API v3.
export const QUOTA = { search: 1, channels: 1, playlistItems: 1, videos: 1, freeDaily: 10000, searchDaily:100, uploadDaily:100 };
export function quotaSummary(usage = {}) {
  const unit = (usage.channels || 0) * QUOTA.channels + (usage.playlistItems || 0) * QUOTA.playlistItems + (usage.videos || 0) * QUOTA.videos;
  const perDay = QUOTA.searchDaily;
  return { units: unit, freeDaily: QUOTA.freeDaily, freeSearchesPerDay: perDay, note: `Mặc định ${perDay} search/ngày; các endpoint đọc khác dùng quỹ ${QUOTA.freeDaily.toLocaleString('vi-VN')} đơn vị/ngày. Kiểm tra quota thực tế trong Google Cloud.` };
}

// Chi phí tham khảo lấy từ app tham khảo. Sửa ở Kết nối API theo giá nhà cung cấp của bạn.
export const COST_REFERENCE = {
  note: 'Giá tham khảo, đơn vị USD, lấy từ app tham khảo — không phải giá của nhà cung cấp bạn dùng.',
  steps: { titles: 0.04, research: 1.26, script: 1.59, characters: 2.34, music: 2.4, total: 2.34 },
  perUnit: { groupSplitPerView: 0.03, thumbnailViaApi: 0.6, musicPerStyle: 0.8 },
};

// 4 đoạn cảm xúc, 3 kiểu nhạc — đề bài mẫu cho Suno, không có lời.
export const MUSIC_PLAN = {
  price: 2.4,
  segments: [
    { id: 'mo', name: 'Mở', emotion: 'curiosity', prompt: 'building cinematic underscore, rising strings, subtle pulse, sense of awe, cinematic documentary score, instrumental, no vocals' },
    { id: 'giang', name: 'Gây dựng', emotion: 'tension', prompt: 'slow tense orchestral, low strings, sparse percussion, dark, minimal, cinematic documentary score, instrumental, no vocals' },
    { id: 'nghiem', name: 'Nghiêm', emotion: 'solemn', prompt: 'solemn documentary underscore, strings and piano, steady, restrained, cinematic documentary score, instrumental, no vocals' },
    { id: 'ket', name: 'Kết', emotion: 'resolve', prompt: 'building cinematic underscore, rising strings, subtle pulse, sense of awe, cinematic documentary score, instrumental, no vocals' },
  ],
  rule: 'Luôn dưới 24 dB dưới giọng, tự hạ khi có lời. Nhạc đi theo video: 2 chặng trước để dựng, đoạn cao trào nâng, đoạn cuối tĩnh lại theo giọng thật.',
};

// Cảnh thiếu ảnh sẽ bị bỏ khi đóng gói — nói rõ trước khi dựng.
export function packagingBlockers(scenes) {
  const missing = (scenes || []).map((s, i) => ({ index: i, id: s?.id })).filter(x => x.index >= 0 && !(scenes[x.index]?.image || scenes[x.index]?.clip));
  return { missing, ok: missing.length === 0, message: missing.length ? `${missing.length} cảnh chưa có ảnh sẽ bị BỎ khỏi video — máy đóng gói bỏ cảnh thiếu file, mất ${missing.length} câu thoại.` : 'Đủ ảnh cho toàn bộ cảnh.' };
}

// ---------------------------------------------------------------- CỔNG NICHE (Giai đoạn 1)
// Toàn bộ phép đếm, lọc, ngưỡng và cổng do CODE làm, không giao cho AI.
// Ngưỡng cố định theo flow thủ công: video chín 90 ngày, kênh ≥5 video + trung vị ≥20.000,
// kho cần ≥3 kênh đạt, gõ thử 11/20, nhóm 4–7. Không thay GATES (rong/vừa/chặt) ở trên.
function deepFreeze(obj){if(obj&&typeof obj==='object'&&!Object.isFrozen(obj)){Object.freeze(obj);for(const k of Object.keys(obj))deepFreeze(obj[k]);}return obj;}

export const RULES = {
  titlesForTemplate: 20, templateRatio: 0.5, minTemplateWords: 2,
  // Guide chỉ nói "ít hơn 20 thì lấy hết" — 10 là ngưỡng tự chọn, chỉnh được ở đây.
  minTitlesForTemplate: 10,
  // Một ngưỡng duy nhất cho "video nội dung". Thay cho mốc 180 giây rải rác trong server.
  minContentSeconds: 120,
  matureDays: 90, minVideos: 5, minMedian: 20000, minChannels: 3,
  groupMin: 4, groupMax: 7,
  probeSize: 20, probePass: 11, probeViews: 20000,
  topicCount: 20,
};

const DAY = 86400000;
const tokens = t => String(t).normalize('NFC').toLowerCase().split(/\s+/)
  .map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
// Mạo từ tiếng Anh: một khuôn kết thúc bằng chúng không dùng được, vì nó ép
// cả 20 chủ đề mới phải bắt đầu bằng "…of the" thay vì "…of <thực thể>".
const ARTICLES = new Set(['the', 'a', 'an']);

// Chỉ giữ video nội dung đúng định dạng đang tìm. Shorts và video quá ngắn
// không đại diện cho dòng khuôn nên phải loại TRƯỚC khi lấy tiêu đề.
// Đây là nơi duy nhất quyết định "video nội dung".
export function contentVideos(videos, format = 'long', rules = RULES) {
  const list = Array.isArray(videos) ? videos : [];
  if (format === 'short') return list.filter(v => v && v.format === 'short');
  return list.filter(v => v && v.format !== 'short' && Number(v.duration || 0) >= rules.minContentSeconds);
}

// KHUÔN = cụm mở đầu DÀI NHẤT lặp ở hơn nửa số tiêu đề mới nhất. Được phép trả null.
export function findTemplate(titles, rules = RULES) {
  const list = Array.isArray(titles) ? titles.slice(0, rules.titlesForTemplate).filter(t => typeof t === 'string' && t.trim()) : [];
  const total = list.length;
  // Ít hơn 20 thì lấy hết, nhưng vẫn cần đủ mẫu để khuôn có ý nghĩa.
  if (total < rules.minTitlesForTemplate) {
    return { template: null, total, passed: false, complete: false, reason: `Cần ít nhất ${rules.minTitlesForTemplate} tiêu đề nội dung mới nhất, đang có ${total}.` };
  }
  const tok = list.map(tokens);
  for (let k = Math.max(...tok.map(t => t.length)); k >= rules.minTemplateWords; k--) {
    const counts = new Map();
    for (const t of tok) if (t.length >= k) { const key = t.slice(0, k).join(' '); counts.set(key, (counts.get(key) || 0) + 1); }
    let best = null;
    for (const [template, matches] of counts) if (matches / total > rules.templateRatio && (!best || matches > best.matches)) best = { template, matches };
    if (best) {
      // Khuôn kết thúc bằng mạo từ không dùng được. Bỏ qua k đó và thử k-1.
      if (ARTICLES.has(best.template.split(' ').pop())) continue;
      return {
        template: best.template,
        words: k,
        matches: best.matches,
        total,
        ratio: best.matches / total,
        titles: list.filter((_, i) => tok[i].slice(0, k).join(' ') === best.template),
        passed: true,
        complete: true
      };
    }
  }
  return { template: null, total, passed: false, complete: true, reason: 'Không có cụm mở đầu nào lặp quá nửa số tiêu đề: kênh này không có khuôn.' };
}

// Tiêu đề có mang khuôn không. Chuẩn hoá y hệt findTemplate rồi so tiền tố
// theo ranh giới từ, nên "…of empire" khớp "…of empire Rome" nhưng không
// khớp "…of empire 2".
export function carriesTemplate(title, template) {
  const want = tokens(template).join(' ');
  if (!want) return false;
  return tokens(title).join(' ').startsWith(want + ' ');
}

// Chỉ video đã đủ tuổi (>= 90 ngày) mới có view "chín".
export const matureVideos = (videos, now = Date.now(), rules = RULES) =>
  videos.filter(v => Number.isFinite(v.views) && (now - Date.parse(v.publishedAt)) / DAY >= rules.matureDays);

// Trung vị và bội số tính trên video đã chín của CẢ kênh. Kênh <5 video hoặc trung vị <20.000 bị loại.
export function channelShelf(videos, now = Date.now(), rules = RULES) {
  const by = new Map();
  for (const v of videos) { if (!by.has(v.channelId)) by.set(v.channelId, []); by.get(v.channelId).push(v); }
  return [...by].map(([channelId, all]) => {
    const mature = matureVideos(all, now, rules), med = median(mature.map(v => v.views));
    const pass = mature.length >= rules.minVideos && med >= rules.minMedian;
    const reason = pass ? '' : mature.length < rules.minVideos ? `Chỉ ${mature.length} video đã qua ${rules.matureDays} ngày (cần ≥ ${rules.minVideos}).` : `Trung vị ${Math.round(med)} view < ${rules.minMedian}.`;
    return {
      channelId, channelTitle: all[0].channelTitle, matureCount: mature.length, median: med, pass, reason,
      videos: pass ? mature.map(v => ({ ...v, multiple: v.views / med })) : []
    };
  });
}

// Cổng 3: cần ít nhất 3 kênh cùng khuôn đạt thước.
export function shelfGate(channels, rules = RULES) {
  const passed = channels.filter(c => c.pass).length;
  return { passed: passed >= rules.minChannels, count: passed, need: rules.minChannels };
}

// Cổng 5: gõ thử đủ 20 video, từ 11 video trở lên vượt 20.000 view là qua.
export function probeGate(views, rules = RULES) {
  const v = Array.isArray(views) ? views : [];
  if(v.some(x => !Number.isFinite(x) || x < 0)) return {passed:false,hits:null,error:'Lượt xem phải là số hữu hạn không âm.'};
  if (v.length !== rules.probeSize) return { passed: false, hits: null, error: `Cần đúng ${rules.probeSize} video, đang có ${v.length}.` };
  const hits = v.filter(x => x > rules.probeViews).length;
  return { passed: hits >= rules.probePass, hits, need: rules.probePass, size: v.length };
}

// Chia nhóm "mù": AI chỉ thấy id + tiêu đề, không thấy view nên không thiên vị.
export const blindTitles = videos => videos.map(v => ({ id: v.id, title: v.title }));

export function groupCountGate(groups, rules = RULES) {
  const count = (groups || []).filter(g => g.id !== 'unclassified').length;
  return { passed: count >= rules.groupMin && count <= rules.groupMax, count, min: rules.groupMin, max: rules.groupMax };
}

// Máy trạng thái: stage nào chưa passed thì chặn các stage sau.
export const STAGES = ['field', 'template', 'shelf', 'groups', 'probe', 'topics'];
export const nextStage = project => STAGES.find(s => !project?.niche?.[s]?.passed) || 'done';
export function validateTopics(titles, existing, template, rules = RULES) {
  if (!Array.isArray(titles) || !Array.isArray(existing) || typeof template !== 'string') {
    return { passed: false, errors: ['Invalid input types'] };
  }
  const norm = s => String(s).normalize('NFC').toLowerCase().trim().replace(/\s+/g,' ');
  const normTemplate = norm(template);
  const normTitles = titles.map(norm);
  const normExisting = new Set(existing.map(norm));
  const errors = [];
  if (!normTemplate) errors.push('Chưa có khuôn tiêu đề.');
  if (titles.some(t => typeof t !== 'string' || !t.trim())) errors.push('Tiêu đề phải là văn bản không rỗng.');
  if (normTitles.length !== rules.topicCount) errors.push(`Cần đúng ${rules.topicCount} tiêu đề.`);
  const distinct = new Set(normTitles);
  if (distinct.size !== normTitles.length) errors.push('Duplicate titles in input');
  for (const t of normTitles) {
    if (!t.startsWith(normTemplate + ' ')) errors.push(`Title does not start with template: ${t}`);
    if (normExisting.has(t)) errors.push(`Title already exists: ${t}`);
  }
  return { passed: errors.length === 0, errors, titles: normTitles };
}
export function lockedNiche(project) {
  if (nextStage(project) !== 'done') return null;
  const n = project.niche;
  const data = { template: n.template.value, angle: n.template.angle || '', group: n.groups.chosen, topics: n.topics.chosen };
  const clone = structuredClone(data);
  return deepFreeze(clone);
}
