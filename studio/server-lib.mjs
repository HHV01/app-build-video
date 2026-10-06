import { spawn } from 'node:child_process';
import http from 'node:http';

// Hàm thuần cho server.mjs. Tách riêng để kiểm thử được, vì server.mjs chạy
// ngay khi được import (nó mở cổng ngay ở top-level).
// Nguyên tắc: đuôi file do người dùng gửi lên KHÔNG được chứa ký tự đường dẫn.

/**
 * Chuẩn hoá đuôi file do người dùng gửi lên.
 * Chỉ nhận chữ và số, tối đa 5 ký tự, không dấu chấm, không phân tách thư mục.
 * Mọi thứ khác trả về `fallback`.
 */
export function safeExt(value, fallback) {
  const text = String(value ?? '');
  return /^[a-z0-9]{1,5}$/i.test(text) ? text.toLowerCase() : fallback;
}

// Chạy một lệnh ngoài và trả về stdout. Không dùng shell.
// Tách riêng khỏi server.mjs để kiểm thử được với một lệnh bất kỳ.
export function runBinary(binary, args, { timeout = 180000, tool = 'ffmpeg' } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let out = [], err = '', killed = false;
    const timer = setTimeout(() => { killed = true; child.kill(); }, timeout);
    child.stdout.on('data', d => out.push(d));
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); reject(Object.assign(new Error(`Không chạy được ${tool}: ${e.message}`), { status: 500 })); });
    child.on('close', code => {
      clearTimeout(timer);
      // killed chỉ đúng khi ta đã tự giết vì hết giờ. Phải kiểm ở đây, ở
      // dưới spawn thì killed luôn false nên nhánh lỗi không bao giờ chạy.
      if (killed) return reject(Object.assign(new Error(`${tool} chạy quá ${Math.round(timeout / 1000)} giây.`), { status: 504 }));
      resolve({ code, stdout: Buffer.concat(out).toString('utf8'), stderr: err });
    });
  });
}

const failure = (message, status = 400) => Object.assign(new Error(message), { status });

/**
 * Dựng payload metadata cho videos.insert.
 * `selfDeclaredMadeForKids` chỉ hợp lệ trong `status`. Đặt trong `snippet`
 * khiến Google từ chối cả phiên tải lên.
 */
export function buildUploadPayload({ title, description, tags, categoryId, madeForKids, privacy }) {
  return {
    snippet: {
      title,
      description: String(description || '').trim(),
      tags: (Array.isArray(tags) ? tags : String(tags || '').split(',')).map(t => String(t).trim()).filter(Boolean).slice(0, 30),
      categoryId: String(categoryId || '27'),
      defaultLanguage: 'vi',
    },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: Boolean(madeForKids), embeddable: true },
  };
}

// Tải video lên YouTube bằng resumable upload: mở phiên, rồi gửi từng khối.
// Upload ẩn danh không được — Google yêu cầu báo "made for kids" và ID kết quả.
// HTTP 308 (Resume Incomplete) KHÔNG phải lỗi: nghĩa là server đã nhận một phần
// khối và báo bằng header `Range: bytes=0-N`. Phải gửi tiếp từ N+1.
export async function uploadResumable({
  openUrl, token, payload, bytes, chunk = 8 * 1024 * 1024,
  mime = 'video/mp4', maxResumes = 3,
  onSessionError, openTimeout = 120000, chunkTimeout = 600000,
}) {
  // 1) Mở phiên resumable. Location trả về nơi gửi từng khối.
  let open;
  try {
    open = await fetch(openUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mime,
        'X-Upload-Content-Length': String(bytes.length),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(openTimeout),
    });
  } catch { throw failure('Không mở được phiên tải lên YouTube. Kiểm tra mạng rồi thử lại.', 502); }
  const session = open.headers.get('location');
  if (!open.ok || !session) {
    if (onSessionError) return onSessionError(open, session);
    throw failure(`YouTube trả HTTP ${open.status}.`, 502);
  }

  // 2) Gửi từng khối.
  let uploaded = 0, resumes = 0;
  while (uploaded < bytes.length) {
    const slice = bytes.subarray(uploaded, Math.min(uploaded + chunk, bytes.length));
    const last = slice.length === bytes.length - uploaded;
    let put;
    try {
      put = await fetch(session, {
        method: 'PUT',
        headers: { 'Content-Length': String(slice.length), 'Content-Range': `bytes ${uploaded}-${uploaded + slice.length - 1}/${bytes.length}` },
        body: slice,
        signal: AbortSignal.timeout(chunkTimeout),
      });
    } catch { throw failure(`Mất kết nối khi tải ở ${(uploaded / 1048576).toFixed(0)} MB. Thử lại — phiên tải đã hết hiệu lực.`, 502); }

    // 308 Resume Incomplete: KHÔNG phải lỗi. Google đã nhận một phần khối và báo
    // bằng `Range: bytes=0-N` (N là byte cuối đã lưu). Phải gửi tiếp từ N+1.
    if (put.status === 308) {
      const m = /^bytes=(\d+)-(\d+)$/.exec(String(put.headers.get('range') || '').trim());
      const next = m ? Number(m[2]) + 1 : uploaded;
      if (next > uploaded) { uploaded = next; resumes = 0; continue; }
      // Không có Range hoặc N+1 không tiến: server chưa nhận thêm byte nào.
      resumes++;
      if (resumes > maxResumes) {
        throw failure(`YouTube không nhận thêm byte nào sau ${maxResumes} lần gửi lại ở ${(uploaded / 1048576).toFixed(0)} MB. Dừng để không gửi vô hạn; thử lại hoặc đổi mạng.`, 502);
      }
      continue;
    }

    if (!put.ok) {
      const detail = await put.json().catch(() => ({}));
      const code = detail.error?.errors?.[0]?.reason || String(put.status);
      if (/finalizeRequired|uploadNotFinalizable|404/.test(code)) throw failure(`YouTube đã nhận đủ file nhưng không hoàn tất: ${code}.`, 502);
      throw failure(`Tải lên thất bại ở ${(uploaded / 1048576).toFixed(0)} MB (HTTP ${put.status}).`, 502);
    }
    uploaded += slice.length;
    if (last) {
      const done = await put.json().catch(() => ({}));
      if (!done.id) throw failure('YouTube không trả về mã video.', 502);
      return { id: done.id, sizeBytes: bytes.length };
    }
  }
  throw failure('Không hoàn tất tải lên.', 502);
}