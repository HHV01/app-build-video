// Sinh kho video mẫu để thử giao diện Tìm niche mà không cần API YouTube.
// LƯU Ý TRUNG THỰC: tên kênh và trung vị view lấy từ ảnh chụp màn hình app tham khảo.
// Các view từng video là số GIẢ LẬP để bố trí bảng cho đẹp — không phải số liệu thị trường.
// Không dùng kho này để kết luận gì về kênh nào ăn hay không.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NOW = Date.parse('2026-10-01T00:00:00Z');
const day = n => new Date(NOW - n * 86400000).toISOString();

// Trung vị của danh sách chẵn = trung bình hai giá trị giữa; danh sách lẻ = giá trị giữa.
// Dựng quanh trung vị cần tới để số trung vị đúng bằng giá trị tham chiếu.
function withMedian(count, median, spread) {
  const odd = count % 2 === 1;
  const side = odd ? (count - 1) / 2 : count / 2 - 1;
  const out = [];
  for (let i = 1; i <= side; i += 1) out.push(Math.round(median * (1 - spread * i / (side + 1))));
  out.push(median);
  if (!odd) out.push(median);
  for (let i = 1; i <= side; i += 1) out.push(Math.round(median * (1 + spread * i / (side + 1))));
  return out;
}

// Bội số thực tế quan sát được trên bảng kênh của app tham khảo (tiêu đề nổi bật so với trung vị kênh).
const OUTLIER_MULTIPLES = [7.65, 5.62, 5.45, 4.6, 4.16, 3.95, 3, 2.7, 2.55, 2.33];

const CHANNELS = [
  { id: 'UC-beginning-to-now', name: 'Beginning To Now', subs: 899000, median: 2072938, spread: 0.8, titles: ['The ENTIRE History of Human Civilizations | Ancient to Modern (4K Documentary)', 'The ENTIRE History of ROME', 'The ENTIRE History of Ancient Egypt', 'The ENTIRE History of the Persian Empire', 'The ENTIRE History of China', 'The ENTIRE History of Greece', 'The ENTIRE History of the Mongol Empire', 'The ENTIRE History of the Ottoman Empire', 'The ENTIRE History of India', 'The ENTIRE History of Mesopotamia', 'The ENTIRE History of the Aztec Empire', 'The ENTIRE History of the Inca Empire'] },
  { id: 'UC-this-is-history', name: 'This Is History', subs: 2310000, median: 789979, spread: 0.9, titles: ['The ENTIRE History of the British Empire', 'The Entire History of Israel', 'The ENTIRE History of the Vietnam War | 1862 - 1975', 'The ENTIRE History of the French Empire', 'The ENTIRE History of Ancient Greece', 'The ENTIRE History of the Soviet Union', 'The ENTIRE History of the Roman Empire', 'The ENTIRE History of Japan', 'The ENTIRE History of the Ottoman Empire', 'The ENTIRE History of the Holy Roman Empire', 'The ENTIRE History of the Spanish Empire', 'The ENTIRE History of the Maurya Empire', 'The ENTIRE History of the Byzantine Empire', 'The ENTIRE History of Carthage', 'The ENTIRE History of the Mongol Empire', 'The ENTIRE History of the Portuguese Empire', 'The ENTIRE History of the Dutch Empire', 'The ENTIRE History of the Han Dynasty', 'The ENTIRE History of the Abbasid Caliphate', 'The ENTIRE History of the Kingdom of Prussia'] },
  { id: 'UC-the-entire-history', name: 'The Entire History', subs: 403000, median: 197402, spread: 1.1, titles: ['The Entire History of the Portuguese Empire', 'The Entire History of the Roman Empire', 'The Entire History of Ancient Greece', 'The Entire History of the Mongol Empire', 'The Entire History of the Holy Roman Empire', 'The Entire History of the Spanish Empire', 'The Entire History of the Ottoman Empire', 'The Entire History of the Byzantine Empire', 'The Entire History of the Aztec Empire', 'The Entire History of the Persian Empire', 'The Entire History of the Maurya Empire', 'The Entire History of the Han Dynasty', 'The Entire History of the Abbasid Caliphate', 'The Entire History of the Kingdom of Prussia', 'The Entire History of the French Empire'] },
];

const videos = [];
let outlierCursor = 0;
for (const c of CHANNELS) {
  const views = withMedian(c.titles.length, c.median, c.spread);
  c.titles.forEach((title, i) => {
    // Rải video nổi bật mỗi kênh để bảng có bội số cao như dữ liệu thật.
    // Chỉ đặt ở nửa trên để không làm lệch trung vị kênh khỏi giá trị tham chiếu.
    const top = Math.ceil(c.titles.length / 2);
    if (i >= top && (i - top) % 4 === 1) views[i] = Math.round(c.median * OUTLIER_MULTIPLES[outlierCursor++ % OUTLIER_MULTIPLES.length]);
    const id = `${c.id}-v${i + 1}`;
    videos.push({
      id, title, channelId: c.id, channelTitle: c.name, subscribers: c.subs,
      views: views[i], publishedAt: day(70 + i * 17 + c.name.length), format: 'long', multiple: null,
    });
  });
}

// Kho gộp chỉ lấy video đã qua ngày cổng; bải số so với trung vị chính kênh đó.
const byChannel = new Map();
for (const v of videos) {
  const list = byChannel.get(v.channelId) || [];
  list.push(v);
  byChannel.set(v.channelId, list);
}
for (const list of byChannel.values()) {
  const sorted = [...list].map(v => v.views).sort((a, b) => a - b);
  const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  for (const v of list) v.multiple = Number((v.views / med).toFixed(2));
}

// Lấy video xen kẽ để mỗi nhóm trải trên cả dải view, không dồn một đầu.
const pick = (channelIndex, n) => {
  const list = videos.filter(v => v.channelId === CHANNELS[channelIndex].id);
  const step = Math.max(1, Math.floor(list.length / Math.max(1, n)));
  return list.filter((_, i) => i % step === 0).slice(0, n).map(v => v.id);
};
const ids = (...groups) => [...new Set(groups.flat())];
const GROUPS = [
  { name: 'ĐẾ CHẾ · NHÀ NƯỚC LỚN · TỔ CHỨC', angle: 'Quyền lực tập trung thành một khối rồi tự vỡ ra', reason: 'Cùng một câu hỏi: quyền lực tập trung bằng cách nào và mất vì lý do gì', videoIds: ids(pick(0, 5), pick(1, 6), pick(2, 4)) },
  { name: 'THÀNH PHỐ', angle: 'Đô thị là thứ quyết định cách người ta sống', reason: 'Cùng hỏi cách một thành phố định hình đời sống dân', videoIds: ids(pick(0, 3), pick(1, 5)) },
  { name: 'CHIẾN TRANH · XUNG ĐỘT', angle: 'Chiến tranh quyết định đường đi của một quốc gia', reason: 'Cùng hỏi hậu quả dài hạn của một cuộc chiến', videoIds: ids(pick(1, 8), pick(2, 3)) },
  { name: 'QUỐC GIA · VÙNG ĐẤT', angle: 'Ranh giới địa lý định đoạt số phận', reason: 'Cùng hỏi đất đai quyết định chính trị thế nào', videoIds: ids(pick(0, 4), pick(1, 8), pick(2, 5)) },
  { name: 'SỰ KIỆN · HIỆN TƯỢNG', angle: 'Một biến cố nhỏ đổi cả một thời đại', reason: 'Cùng hỏi điều gì đã thực sự thay đổi lịch sử', videoIds: ids(pick(1, 5), pick(2, 3)) },
  { name: 'KINH TẾ · TÀ NGUYÊN', angle: 'Vàng, muối, đường và thương mại dựng nên một thế giới', reason: 'Cùng hỏi hàng hóa định đoạt quyền lực ra sao', videoIds: ids(pick(0, 2), pick(1, 4)) },
  { name: 'KHOA HỌC · KỸ THUẬT', angle: 'Một phát minh đổi cân bằng cũ', reason: 'Cạn hết số video mẫu trước — nhóm này cố ý chỉ có một kênh để thử cảnh báo bẫy', videoIds: ids(pick(2, 2)) },
];

const sample = {
  _note: 'KHO MẪU GIẢ LẬP. Tên kênh và trung vị view lấy từ ảnh app tham khảo; view từng video là số bố trí cho dễ đọc bảng, KHÔNG phải số liệu thị trường. Không dùng để kết luận kênh nào ăn hay không.',
  _source: 'Ảnh chụp màn hình RX Studio (bước 2 và bước 3) — ngày 2026-10-01',
  _now: new Date(NOW).toISOString(),
  template: 'entire history of',
  gate: 'vua',
  videos,
  groups: GROUPS.map((g, i) => ({ id: `group-${i + 1}`, ...g })),
};

const dir = path.join(root, 'studio', 'fixtures');
mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'kho-mau-thu-nghiem.json');
writeFileSync(file, JSON.stringify(sample, null, 2));
console.log(`Đã ghi ${file}`);
console.log(`video: ${videos.length} · nhóm: ${GROUPS.length}`);
for (const c of CHANNELS) console.log(`  ${c.name}: ${c.titles.length} video · trung vị ${c.median.toLocaleString('vi-VN')}`);