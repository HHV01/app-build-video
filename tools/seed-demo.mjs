// Nạp kho mẫu vào Studio đang chạy để xem thử mà không cần API YouTube.
// Dùng: node tools/seed-demo.mjs [bước]   (bước 0..3, mặc định 2)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NO_TEXT_IN_IMAGE, FULL_BLEED } from '../studio/rx.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = process.env.STUDIO_URL || 'http://localhost:3210';
const step = Number(process.argv[2] ?? 2);

const headers = { 'Content-Type': 'application/json', 'X-Studio-Request': '1' };
const current = await (await fetch(`${base}/api/state`, { headers })).json();
const sample = JSON.parse(readFileSync(path.join(root, 'studio', 'fixtures', 'kho-mau-thu-nghiem.json'), 'utf8'));

const survey = {
  id: 'survey-mau-thu-nghiem',
  name: 'Khuôn: entire history of — kho mẫu thử nghiệm',
  language: 'en', market: 'US', format: 'long', days: 90,
  queryText: 'entire history of\nfull history documentary\nhistory of every empire',
  linksText: 'https://www.youtube.com/@genius_history01',
  template: sample.template, templateId: sample._channels?.[0] || 'UC-beginning-to-now',
  gate: sample.gate,
  templates: [
    { name: 'entire history of', matches: 12, ratio: 1, channelName: 'Beginning To Now', channelId: 'UC-beginning-to-now' },
    { name: 'entire history of', matches: 20, ratio: 1, channelName: 'This Is History', channelId: 'UC-this-is-history' },
    { name: 'entire history of', matches: 15, ratio: 1, channelName: 'The Entire History', channelId: 'UC-the-entire-history' },
  ],
  videos: sample.videos,
  groups: sample.groups,
  selectedChannels: ['UC-beginning-to-now', 'UC-this-is-history', 'UC-the-entire-history'],
  selectedGroup: sample.groups[0].id,
  niche: 'Lịch sử vĩ mô: vì sao một đế chế hình thành, chạm đỉnh rồi tự vỡ',
  audience: 'Người xem tài liệu thích bối cảnh lớn nhưng không biết bắt đầu từ đâu',
  angle: 'Một đế chế thành công vì cái nó làm đúng một việc, và chết vì cái nó làm đúng một việc đó quá lâu.',
  difference: 'Nhân vật Tích kể, có hậu quả cụ thể tới tiền nhà và tiền lương.',
  step,
};

const next = {
  ...current,
  revision: current.revision,
  surveys: [survey, ...(current.surveys || []).filter(s => s.id !== survey.id)],
};
if (process.argv.includes('--project')) {
  const baseChannel = (current.channels || [])[0] || {};
  const channel = {
    ...baseChannel,
    id: 'channel-mau-thu-nghiem',
    name: 'Tích Lịch Sử',
    language: 'en',
    style: 'Doodle 2D',
    type: 'mascot',
    thumbnailLayout: 'split',
    niche: survey.niche,
    angle: survey.angle,
    audience: survey.audience,
    identity: { voice: 'Tích — giọng trầm, chậm, rõ chữ', titlePattern: 'entire history of' },
  };
  const visuals = ['Bản đồ thuộc quộc lần dần chuyển màu đỏ', 'Sổ thuế chồng cao trên bàn đá', 'Kho chất chứa đầy thùng muối', 'Thợ mỏ đập đá dưới ánh đuốc', 'Thành phố vắng dần qua mùa bệnh', 'Bảng giá ngày bị xóa sạch chỗ số liệu', 'Cảng nhỏ mọc lên bên bờ sông', 'Hàng rào thuế dựng giữa hai bờ', 'Đường sứt tắc giữa rừng nhiệt đới', 'Cánh đồng lúa trải tới chân đồi', 'Hai cảng tranh nhau một dòng trên bản đồ', 'Sổ sách phá sản nằm rải trên sàn'];
  const overlays = ['', 'THUẾ', 'GIÁ', 'ĐÀO MỎ', 'BỆNH DỊCH', 'LẠM PHÁT', 'THƯƠNG MẠI', 'THUẾ QUAN', 'ĐƯỜNG SẮT', 'NÔNG NGHIỆP', 'BẾN CẢNG', 'TÍN DỤNG'];
  const backgrounds = ['Bản đồ vẽ thời Trung Cổ', 'Phòng thuế nội bộ', 'Kho cảng ven sông', 'Mỏ đá trong núi', 'Đường phố thành phố cổ'];
  const scenes = visuals.map((visual, i) => ({
    id: `scene-${i + 1}`,
    narration: `${visual}. Kênh này bắt đầu từ bối cảnh năm 1200 và đi tiếp mười hai bước cho tới khi đế chế tự tan rã, mỗi bước có một nguyên nhân riêng.`,
    visual,
    prompt: `Wide documentary establishing shot, matte painting style, warm dusk light, slow push in, ${NO_TEXT_IN_IMAGE}, ${FULL_BLEED}`,
    overlay: overlays[i],
    sfx: ['ambience', 'paper', 'crowd murmur', 'hammering', 'wind', 'coins', 'waves', 'crowd', 'train', 'rain', 'gulls', 'paper'][i],
    characters: i % 3 === 0 ? ['Tích'] : [],
    background: backgrounds[i % backgrounds.length],
    duration: 4,
    image: '',
  }));
  const project = {
    id: 'project-mau-thu-nghiem',
    channelId: channel.id,
    topic: 'Vì sao đế chế mạnh nhất lịch sử tự vỡ dù thắng mọi trận',
    minutes: 5,
    clipSeconds: '15',
    structure: 'consequence',
    step: 6,
    approved: [0, 1, 2, 3, 4, 5],
    sources: [{ id: 'src-1', name: 'Ghi chú nghiên cứu', url: '', text: 'Số liệu lấy từ tài liệu tham khảo, cần kiểm chứng lại trước khi dùng trong lời kể.' }],
    outline: [],
    packaging: [
      { title: 'The Entire History of the Empire That Ate Itself', thumbnailVisual: 'A cracked imperial map with a red border eating inward, cinematic light', overlay: 'ATE ITSELF', flavour: 'entire history of + pattern interrupt hook', hookType: 'pattern', hook: 'The empire won every battle. It still collapsed.', promise: 'Bạn sẽ thấy chính xác lần đầu quyền lực bắt đầu tự ăn mình.' },
      { title: 'Why the Richest Empire on Earth Collapsed', thumbnailVisual: 'A coin pile sinking into black water, dramatic lighting', overlay: 'WHY IT FELL', flavour: 'why + paradox hook', hookType: 'paradox', hook: 'The more money it printed, the poorer the streets became.', promise: 'Ba cơ chế tiền bạc đã gặm mòn đế chế mạnh nhất lịch sử.' },
    ],
    selectedPackaging: 0,
    narration: visuals.map((v, i) => `${v}. Bước ${i + 1} nằm giữa chuỗi mười hai nguyên nhân, và mỗi nguyên nhân đều dựa trên một con số.`).join(' '),
    scenes,
    voiceSeconds: 48,
    voiceName: '',
    voiceData: '',
    srt: '',
  };
  next.channels = [channel, ...(current.channels || []).filter(c => c.id !== channel.id)];
  next.projects = [project, ...(current.projects || []).filter(p => p.id !== project.id)];
  console.log(`Đã nạp dự án mẫu: ${scenes.length} cảnh, ${new Set(scenes.map(s => s.background)).size} bối cảnh.`);
}
const res = await fetch(`${base}/api/state`, { method: 'PUT', headers, body: JSON.stringify(next) });
console.log(res.ok ? `Đã nạp kho mẫu · mở ${base}/#niche/${survey.id} (đường dẫn có dấu #, không có dấu / sau #)` : `Lỗi: ${res.status} ${await res.text()}`);