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