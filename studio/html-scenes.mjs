// Cảnh chữ/số liệu/biểu đồ (html-video): đoạn HTML tĩnh + animation CSS được ghi
// thành clip bằng Chromium local, không tốn token AI, chạy offline.
export const HTML_SCENE_MIN_SECONDS = 3;
export const HTML_SCENE_MAX_SECONDS = 20;
export const HTML_SNIPPET_MAX_CHARS = 20000;

// Làm sạch đoạn HTML của cảnh: chỉ giữ nội dung + CSS animation, bỏ script,
// handler và mọi tham chiếu mạng để dựng offline, đơn định và an toàn.
export function sanitizeHtmlSnippet(html) {
  let out = String(html || '');
  if (!out.trim()) throw new Error('Cảnh HTML rỗng. Nhập nội dung chữ hoặc số liệu.');
  out = out.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/<\s*(iframe|object|embed|link|meta|base|form|input|button|video|audio|source)\b[^>]*>/gi, '');
  out = out.replace(/<\s*\/\s*(iframe|object|embed|form|video|audio)\s*>/gi, '');
  // Chặn URL ngoài (http, //, data: chỉ giữ ảnh data).
  out = out.replace(/(src|href)\s*=\s*"https?:[^"]*"/gi, '$1=""');
  out = out.replace(/(src|href)\s*=\s*'https?:[^']*'/gi, "$1=''");
  out = out.replace(/(src|href)\s*=\s*("\/\/[^"]*"|'\/\/[^']*')/gi, '$1=""');
  out = out.replace(/url\(\s*https?:[^)]+\)/gi, 'url()');
  out = out.replace(/url\(\s*\/\/[^)]+\)/gi, 'url()');
  if (!out.trim()) throw new Error('Cảnh HTML rỗng sau khi làm sạch.');
  if (out.length > HTML_SNIPPET_MAX_CHARS) throw new Error(`Cảnh HTML vượt ${HTML_SNIPPET_MAX_CHARS} ký tự. Rút gọn nội dung.`);
  return out.trim();
}

// Bọc đoạn cảnh vào khung 1280x720 để ghi hình.
export function stageHtml(snippet, { width = 1280, height = 720, background = '#101513' } = {}) {
  const clean = sanitizeHtmlSnippet(snippet);
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;background:${background};overflow:hidden}*{box-sizing:border-box}.hv-stage{width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;padding:64px;color:#f2f5f1;font-family:Segoe UI,Arial,sans-serif}.hv-card{max-width:1080px;text-align:center}.hv-card h1{font-size:84px;margin:0 0 24px;line-height:1.15}.hv-card p{font-size:40px;margin:12px 0;line-height:1.4}.hv-num{font-size:150px;font-weight:800;margin:0}</style></head><body><div class="hv-stage"><div class="hv-card">${clean}</div></div></body></html>`;
}

export function validateHtmlScene({ html, duration } = {}) {
  const d = Number(duration);
  if (!Number.isFinite(d) || d < HTML_SCENE_MIN_SECONDS || d > HTML_SCENE_MAX_SECONDS) {
    throw new Error(`Cảnh HTML cần thời lượng ${HTML_SCENE_MIN_SECONDS}–${HTML_SCENE_MAX_SECONDS} giây.`);
  }
  return { html: sanitizeHtmlSnippet(html), duration: d };
}
