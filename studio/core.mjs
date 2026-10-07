import { videoMetadata } from './rx.mjs';
export const median = values => {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2 : null;
};
export function enrichVideos(videos, now = Date.now()) {
  return videos.map(v => {
    const ageDays = Math.max(0, (now - Date.parse(v.publishedAt)) / 86400000);
    const peers = videos.filter(p => p.channelId === v.channelId && p.id !== v.id && p.format === v.format && Number.isFinite(p.views));
    const nearby = peers.filter(p => Math.abs(Date.parse(p.publishedAt) - Date.parse(v.publishedAt)) <= 30 * 86400000);
    const sample = nearby.length >= 3 ? nearby : peers;
    const baseline = sample.length >= 3 ? median(sample.map(p => p.views)) : null;
    return { ...v, ageDays: Number.isFinite(ageDays) ? ageDays : null, baseline, multiple: baseline > 0 ? v.views / baseline : null, baselineApproximate: nearby.length < 3, peerCount: sample.length };
  });
}
export function normalizeImport(rows) {
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Nhập tối đa 500 dòng video.');
  const ids = new Set();
  return rows.map((r, i) => {
    const id = String(r.id || `import-${i}-${Date.now()}`);
    const views = Number(r.views);
    if (!r.title || !r.channelId || !Number.isFinite(views) || views < 0 || !Number.isFinite(Date.parse(r.publishedAt))) throw new Error(`Dòng ${i + 1}: cần title, channelId, views không âm và publishedAt hợp lệ.`);
    if (ids.has(id)) throw new Error(`Video ID bị trùng ở dòng ${i + 1}.`);
    ids.add(id);
    return { ...videoMetadata(r), id, title: String(r.title).slice(0, 300), channelId: String(r.channelId).slice(0, 100), channelTitle: String(r.channelTitle || r.channelId).slice(0, 150), views, publishedAt: new Date(r.publishedAt).toISOString(), duration: Math.max(0, Number(r.duration) || 0), format: r.format === 'short' ? 'short' : 'long', url: safeYouTube(r.url), thumbnail: '', source: 'import', capturedAt: new Date().toISOString() };
  });
}
export function safeYouTube(raw) {
  try { const url = new URL(raw); return url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname) ? url.href : ''; } catch { return ''; }
}
export function durationSeconds(iso) {
  const m = String(iso).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}
export function validateGroups(groups, videos) {
  if (!Array.isArray(groups) || !groups.length) throw new Error('AI chưa trả nhóm hợp lệ. Hãy thử lại hoặc tự chia nhóm.');
  const valid = new Set(videos.map(v => v.id)), assigned = new Set();
  const result = groups.slice(0, 12).map((g, i) => ({ id: `group-${i}`, name: String(g.name || `Nhóm ${i + 1}`), angle: String(g.angle || ''), reason: String(g.reason || ''), videoIds: (g.videoIds || []).filter(id => { if (!valid.has(id) || assigned.has(id)) return false; assigned.add(id); return true; }) })).filter(g => g.videoIds.length);
  const unassigned = videos.filter(v => !assigned.has(v.id));
  if (unassigned.length) result.push({ id: 'unclassified', name: 'Chưa phân loại', angle: '', reason: 'AI chưa phân loại được các video này.', videoIds: unassigned.map(v => v.id) });
  return result;
}
export function parseAIJSON(text) {
  const cleaned = String(text).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(cleaned); } catch { throw new Error('AI trả dữ liệu không đúng cấu trúc. Thử lại với phạm vi nhỏ hơn.'); }
}
