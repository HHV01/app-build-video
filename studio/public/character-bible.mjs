// Character bible: parse -> store (JSON) -> AI only picks tags -> code assembles the prompt.
// Pure functions, no I/O. Used by the channel "Nhân vật chủ đạo" screen and the scene step.

export const CAMERAS = ['wide', 'medium', 'close-up'];
export const slug = s => String(s || '').toLowerCase().normalize('NFC')
  .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

const KIND = { EXPRESSION: 'expressions', POSE: 'poses', OUTFIT: 'outfits', PROP: 'props', GRAPHICS: 'graphics' };

function parseTagLine(line) {
  const m = line.match(/^-\s*(.+?)\s*(?:\(([^)]*)\))?\s*(?::\s*(.+))?$/);
  if (!m) return null;
  const label = m[1].trim();
  return { tag: slug(label), label, vi: (m[2] || '').trim(), desc: (m[3] || '').trim() };
}

// Text format = the "CHARACTER BIBLE" block (sections "## 1." .. "## 4.").
export function parseCharacterBible(text) {
  const src = String(text || '').replace(/\r\n/g, '\n');
  const name = (src.match(/^#\s+CHARACTER BIBLE\s*[—-]\s*"?([^"\n(]+)/im) || [])[1]?.trim() || '';
  const sections = {};
  let current = null;
  for (const line of src.split('\n')) {
    const h = line.match(/^##\s*(\d+)\.\s*(.+)$/);
    if (h) { current = Number(h[1]); sections[current] = { title: h[2].trim(), lines: [] }; continue; }
    if (current !== null) sections[current].lines.push(line);
  }
  const body = n => (sections[n]?.lines || []).join('\n').trim();
  const errors = [];

  const style = body(1).replace(/\[[^\]]*REPLACE[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
  const identity = body(2).replace(/\s+/g, ' ').trim();
  if (!identity) errors.push('Thiếu mục 2 (IDENTITY BLOCK).');
  const doNotChange = body(3).split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());

  const out = { name, style, identity, doNotChange, expressions: [], poses: [], outfits: [], props: [], graphics: [] };
  let kind = null;
  for (const raw of body(4).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^([A-Z][A-Z /]+?)\s*(?:\([^)]*\))?\s*:\s*(.*)$/);
    if (head && !line.startsWith('-')) {
      const key = Object.keys(KIND).find(k => head[1].trim().startsWith(k));
      if (key) {
        kind = KIND[key];
        if (kind === 'graphics' && head[2]) {
          out.graphics = head[2].replace(/\.$/, '').split(',').map(s => s.trim()).filter(Boolean)
            .map(label => ({ tag: slug(label), label, vi: '', desc: '' }));
        }
        continue;
      }
    }
    if (line.startsWith('-') && kind && kind !== 'graphics') {
      const t = parseTagLine(line);
      if (t) out[kind].push(t);
    }
  }
  for (const k of ['expressions', 'poses', 'outfits']) if (!out[k].length) errors.push(`Thiếu danh sách ${k}.`);
  if (out.outfits.length && !out.outfits.some(o => o.tag === 'default')) errors.push('Cần một trang phục có tag "default".');
  const all = Object.values(KIND).flatMap(k => out[k].map(t => `${k}:${t.tag}`));
  const dup = all.filter((x, i) => all.indexOf(x) !== i);
  if (dup.length) errors.push(`Tag trùng: ${[...new Set(dup)].join(', ')}.`);
  return { character: out, errors };
}

// What the AI is allowed to choose from. Compact on purpose (tokens).
export function tagMenu(c) {
  const f = l => l.map(t => t.tag).join(' | ');
  return `expression: ${f(c.expressions)}\npose: ${f(c.poses)}\noutfit: ${f(c.outfits)}\nprop: ${f(c.props)}\ngraphics: ${f(c.graphics)}\ncamera: ${CAMERAS.join(' | ')}`;
}

const find = (list, tag) => list.find(t => t.tag === slug(tag));
const phrase = t => (t.desc ? `${t.label} (${t.desc})` : t.label);
const wc = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

// scene = { noCharacter?, expression, pose?, prop?, outfit?, graphics?, setting, camera, overlay?, subject? }
export function composeImagePrompt(scene, c, styleOverride) {
  const style = (styleOverride ?? c.style ?? '').trim();
  const parts = [];
  if (style) parts.push(style);
  if (scene.noCharacter) {
    if (scene.subject) parts.push(scene.subject.trim());
    if (scene.setting) parts.push(`Setting: ${scene.setting.trim()}`);
    if (CAMERAS.includes(scene.camera)) parts.push(`Camera: ${scene.camera}`);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  parts.push(c.identity);
  const outfit = scene.outfit && slug(scene.outfit) !== 'default' ? find(c.outfits, scene.outfit) : null;
  if (outfit) parts.push(`Outfit: ${phrase(outfit)}.`);
  const ex = scene.expression && find(c.expressions, scene.expression);
  if (ex) parts.push(`Expression: ${phrase(ex)}.`);
  const pose = scene.pose && find(c.poses, scene.pose);
  if (pose) parts.push(`Pose: ${phrase(pose)}.`);
  const prop = scene.prop && find(c.props, scene.prop);
  if (prop) parts.push(`Prop: ${phrase(prop)}.`);
  if (scene.setting) parts.push(`Setting: ${scene.setting.trim()}.`);
  if (CAMERAS.includes(scene.camera)) parts.push(`Camera: ${scene.camera}.`);
  const gfx = (scene.graphics || []).map(g => find(c.graphics, g)?.label).filter(Boolean);
  if (gfx.length) parts.push(`Extra graphics: ${gfx.join(', ')}.`);
  if (scene.overlay) parts.push(`Text in image: "${scene.overlay.trim()}".`);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

const LOOK_WORDS = /\b(hair|hairstyle|shirt|t-shirt|jacket|hat|cap|shorts|trousers|pants|dress|skin|eyes?|face|neckerchief|scarf|glasses|shoes|tall|short|fat|thin|blond|brown|black|white|red|blue)\b/i;

// Returns { errors, warnings }. errors => block / re-ask AI. warnings => show a flag.
export function validateSceneTags(scene, c, prev = []) {
  const errors = [], warnings = [];
  if (scene.noCharacter) {
    if (!scene.subject && !scene.setting) errors.push('Cảnh không nhân vật cần mô tả vật thể hoặc bối cảnh.');
    return { errors, warnings };
  }
  const need = (field, list) => { if (scene[field] && !find(list, scene[field])) errors.push(`Thẻ ${field} "${scene[field]}" không có trong bible.`); };
  need('expression', c.expressions); need('pose', c.poses); need('outfit', c.outfits); need('prop', c.props);
  if (!scene.expression) errors.push('Thiếu expression.');
  if (!scene.pose && !scene.prop) errors.push('Cần pose hoặc prop.');
  (scene.graphics || []).forEach(g => { if (!find(c.graphics, g)) errors.push(`Đồ họa "${g}" không có trong bible.`); });
  if (scene.camera && !CAMERAS.includes(scene.camera)) errors.push(`Camera "${scene.camera}" không hợp lệ.`);
  if (wc(scene.setting) > 12) warnings.push('Setting dài hơn 12 từ.');
  if (LOOK_WORDS.test(scene.setting || '')) warnings.push('Setting có từ mô tả ngoại hình/màu: AI có thể đang mô tả lại nhân vật.');
  const run = [...prev.map(p => p.expression), scene.expression];
  if (run.length >= 4 && run.slice(-4).every(x => x && x === run.at(-1))) warnings.push('4 cảnh liên tiếp cùng biểu cảm.');
  return { errors, warnings };
}

// Guarantee used by tests and by the UI "kiểm tra": identity appears verbatim.
export const hasIdentity = (prompt, c) => prompt.includes(c.identity);
