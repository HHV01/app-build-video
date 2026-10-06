import { spawn } from 'node:child_process';

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