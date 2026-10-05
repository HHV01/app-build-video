// Gói ZIP tối giảu, phương pháp STORE (không nén).
// Dùng được cả trong Node và trình duyệt: không phụ thuộc thư viện ngoài.
// Ảnh đã nén sẵn nên STORE gần như không tốn thêm dung lượng.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

export function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return encoder.encode(String(data));
}

class Writer {
  constructor() { this.parts = []; this.length = 0; }
  push(bytes) { this.parts.push(bytes); this.length += bytes.length; return this; }
  u16(value) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]); }
  u32(value) { return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]); }
}

function dosStamp(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

// entries: [{ name, data }]
export function makeZip(entries, when = new Date()) {
  const list = (entries || []).filter(e => e && e.name);
  if (!list.length) throw new Error('Gói rỗng: không có tệp nào để nén.');
  const { time, date } = dosStamp(when);
  const body = new Writer();
  const central = [];
  for (const entry of list) {
    const nameBytes = encoder.encode(String(entry.name).replace(/[\\/]+/g, '/').slice(0, 200));
    const data = toBytes(entry.data);
    const crc = crc32(data);
    const offset = body.length;
    body.push(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    body.push(body.u16(20));            // version needed
    body.push(body.u16(0x0800));        // flag: tên tệp dạng UTF-8
    body.push(body.u16(0));             // method: store
    body.push(body.u16(time)).push(body.u16(date));
    body.push(body.u32(crc));
    body.push(body.u32(data.length)).push(body.u32(data.length));
    body.push(body.u16(nameBytes.length)).push(body.u16(0));
    body.push(nameBytes).push(data);
    central.push({ nameBytes, crc, size: data.length, offset });
  }
  const dirStart = body.length;
  for (const entry of central) {
    body.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
    body.push(body.u16(20)).push(body.u16(20));
    body.push(body.u16(0x0800)).push(body.u16(0));
    body.push(body.u16(time)).push(body.u16(date));
    body.push(body.u32(entry.crc));
    body.push(body.u32(entry.size)).push(body.u32(entry.size));
    body.push(body.u16(entry.nameBytes.length));
    body.push(body.u16(0)).push(body.u16(0)).push(body.u16(0)).push(body.u16(0));
    body.push(body.u32(0));
    body.push(body.u32(entry.offset));
    body.push(entry.nameBytes);
  }
  const dirSize = body.length - dirStart;
  body.push(new Uint8Array([0x50, 0x4b, 0x05, 0x06]));
  body.push(body.u16(0)).push(body.u16(0));
  body.push(body.u16(central.length)).push(body.u16(central.length));
  body.push(body.u32(dirSize)).push(body.u32(dirStart));
  body.push(body.u16(0));
  const out = new Uint8Array(body.length);
  let at = 0;
  for (const part of body.parts) { out.set(part, at); at += part.length; }
  return out;
}
