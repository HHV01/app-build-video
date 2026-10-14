// Wan local qua ComfyUI — công thức đã chạy thành công trên máy (RTX 3060,
// clip 2,04s 640x352 hết ~107s). Chỉ dùng cho cảnh cần nhân vật cử động;
// cảnh thường dùng ảnh + hiệu ứng để tiết kiệm thời gian.
import { randomUUID } from 'node:crypto';

export const WAN_URL = process.env.WAN_API_URL || 'http://127.0.0.1:8188';
export const WAN_UNET = 'wan2.2_ti2v_5B_fp16.safetensors';
export const WAN_CLIP = 'umt5_xxl_fp8_e4m3fn_scaled.safetensors';
export const WAN_VAE = 'wan2.2_vae.safetensors';
export const WAN_FPS = 24;
export const WAN_DEFAULT_NEGATIVE = 'style change, face distortion, extra characters, extra fingers, flicker, morphing, new text, watermark';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

let wanOkCache = null;
export async function wanAvailable(base = WAN_URL) {
  if (base === WAN_URL && wanOkCache !== null) return wanOkCache;
  try {
    const r = await fetch(`${base}/object_info/Wan22ImageToVideoLatent`, { signal: AbortSignal.timeout(10000) });
    if (base === WAN_URL) wanOkCache = r.ok;
    return r.ok;
  } catch {
    if (base === WAN_URL) wanOkCache = false;
    return false;
  }
}

export const snap16 = (v) => Math.max(16, Math.min(1280, Math.round(Number(v) / 16) * 16));

// Wan cần số frame = 4n+1. Mặc định clip ~2s (49 frame @24fps) như bản thử.
export function wanLengthFrames(durationSeconds, fps = WAN_FPS) {
  const d = Number(durationSeconds);
  if (!Number.isFinite(d) || d < 1 || d > 8) throw fail('Clip Wan dài 1–8 giây.');
  return Math.max(9, Math.min(121, Math.round((d * fps - 1) / 4) * 4 + 1));
}

export function buildWanWorkflow({ imageName, positive, negative = WAN_DEFAULT_NEGATIVE, width = 640, height = 352, length = 49, seed = 1, steps = 16 }) {
  if (!imageName) throw fail('Thiếu ảnh khung hình đầu cho Wan.');
  if (!String(positive || '').trim() || String(positive).length > 2000) throw fail('Mô tả chuyển động 1–2000 ký tự.');
  const job = randomUUID().replace(/-/g, '').slice(0, 32);
  return {
    job,
    prompt: {
      1: { class_type: 'UNETLoader', inputs: { unet_name: WAN_UNET, weight_dtype: 'default' } },
      2: { class_type: 'CLIPLoader', inputs: { clip_name: WAN_CLIP, type: 'wan', device: 'cpu' } },
      3: { class_type: 'VAELoader', inputs: { vae_name: WAN_VAE } },
      4: { class_type: 'LoadImage', inputs: { image: imageName } },
      5: { class_type: 'Wan22ImageToVideoLatent', inputs: { vae: ['3', 0], start_image: ['4', 0], width: snap16(width), height: snap16(height), length, batch_size: 1 } },
      6: { class_type: 'ModelSamplingSD3', inputs: { model: ['1', 0], shift: 8.0 } },
      7: { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: String(positive) } },
      8: { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: String(negative) } },
      9: { class_type: 'KSampler', inputs: { model: ['6', 0], positive: ['7', 0], negative: ['8', 0], latent_image: ['5', 0], seed, steps, cfg: 5.0, sampler_name: 'uni_pc', scheduler: 'simple', denoise: 1.0 } },
      10: { class_type: 'VAEDecode', inputs: { samples: ['9', 0], vae: ['3', 0] } },
      11: { class_type: 'CreateVideo', inputs: { images: ['10', 0], fps: WAN_FPS } },
      12: { class_type: 'SaveVideo', inputs: { video: ['11', 0], filename_prefix: `studio/${job}`, format: 'mp4', 'format.codec': 'h264' } },
    },
  };
}

async function comfyJson(base, route, options) {
  let res;
  try {
    res = await fetch(`${base}${route}`, options);
  } catch {
    throw fail(`Không nối được ComfyUI ở ${base}. Mở ComfyUI rồi thử lại.`, 503);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw fail(data.error || data.message || `ComfyUI trả HTTP ${res.status}.`, res.status >= 500 ? 502 : res.status);
  return data;
}

export async function generateWanClip({ imageBytes, imageExt = 'png', positive, negative, width, height, durationSeconds = 2, steps = 16, seed = Math.floor(Math.random() * 2 ** 31), base = WAN_URL, timeoutMs = 20 * 60 * 1000 } = {}) {
  if (!imageBytes?.length) throw fail('Thiếu ảnh đầu vào cho Wan.');
  if (imageBytes.length > 12 * 1024 * 1024) throw fail('Ảnh đầu vào vượt 12 MB.');
  const length = wanLengthFrames(durationSeconds);
  const { job, prompt } = buildWanWorkflow({ imageName: 'studio-TEMP', positive, negative, width, height, length, seed, steps });
  void job;
  const name = `studio-${randomUUID().replace(/-/g, '').slice(0, 16)}.${imageExt}`;
  prompt[4].inputs.image = name;
  const form = new FormData();
  form.append('image', new Blob([imageBytes], { type: imageExt === 'png' ? 'image/png' : 'image/jpeg' }), name);
  form.append('overwrite', 'true');
  let up;
  try {
    const r = await fetch(`${base}/upload/image`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
    up = await r.json();
    if (!r.ok) throw fail(up.error || `Tải ảnh lên ComfyUI lỗi HTTP ${r.status}.`);
  } catch (e) {
    if (e.status) throw e;
    throw fail(`Không nối được ComfyUI ở ${base}. Mở ComfyUI rồi thử lại.`, 503);
  }
  const queued = await comfyJson(base, '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
  const promptId = queued.prompt_id;
  if (!promptId) throw fail('ComfyUI không nhận workflow.');
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > timeoutMs) {
      await fetch(`${base}/interrupt`, { method: 'POST' }).catch(() => {});
      throw fail('Wan quá thời gian (20 phút). GPU bận hoặc tham số quá nặng.', 504);
    }
    await new Promise((r) => setTimeout(r, 5000));
    const history = await comfyJson(base, `/history/${promptId}`, {});
    const entry = history[promptId];
    if (!entry) continue;
    for (const msg of entry.status?.messages || []) {
      if (msg?.[0] === 'execution_error') throw fail(`Wan lỗi: ${msg[1]?.exception_message || 'xem console ComfyUI'}.`);
    }
    const files = [];
    for (const node of Object.values(entry.outputs || {})) {
      for (const item of node.images || node.gifs || []) {
        if (String(item.filename || '').endsWith('.mp4')) files.push(item);
      }
    }
    if (!files.length) {
      if (entry.status?.completed) throw fail('Wan xong nhưng không có file MP4.');
      continue;
    }
    const f = files[0];
    const view = await fetch(`${base}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${encodeURIComponent(f.type || 'output')}`);
    if (!view.ok) throw fail('Không tải được clip Wan từ ComfyUI.');
    return {
      bytes: Buffer.from(await view.arrayBuffer()),
      filename: f.filename,
      width: Number(f.metadata?.width) || snap16(width),
      height: Number(f.metadata?.height) || snap16(height),
      fps: Number(f.metadata?.fps) || WAN_FPS,
      frames: Number(f.metadata?.frame_count) || length,
      duration: (Number(f.metadata?.frame_count) || length) / (Number(f.metadata?.fps) || WAN_FPS),
    };
  }
}
