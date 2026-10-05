import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const envPath = join(root, '.env');

let baseUrl = process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1';
let apiKey = process.env.OPENAI_API_KEY || 'omniroute';
let model = process.env.OPENAI_MODEL || 'auto';

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    const val = v.join('=').replace(/^["']|["']$/g, '');
    if (k === 'OPENAI_BASE_URL') baseUrl = val;
    if (k === 'OPENAI_API_KEY') apiKey = val;
    if (k === 'OPENAI_MODEL') model = val;
  }
}

if (process.argv[2]) {
  model = process.argv[2];
}

console.log('====================================================');
console.log('🤖 KIỂM TRA KẾT NỐI OMNIROUTE AI GATEWAY');
console.log('====================================================');
console.log(`🌐 Base URL: ${baseUrl}`);
console.log(`🧠 Model:    ${model}`);
console.log(`🔑 Key:      ${apiKey.slice(0, 10)}...`);
console.log('----------------------------------------------------');

const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

try {
  const startTime = Date.now();
  console.log(`⏳ Đang gửi request test tới ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.2,
      max_tokens: 150,
      messages: [
        { role: 'user', content: 'Trả lời ngắn gọn bằng tiếng Việt: Bạn là ai và đang chạy qua provider nào?' }
      ]
    }),
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Lỗi kết nối (${response.status}): ${errorText}`);
    console.log('\n💡 Gợi ý:');
    console.log('1. Đảm bảo OmniRoute đang chạy bằng lệnh: npm run omniroute (hoặc start_omniroute.bat)');
    console.log('2. Truy cập Dashboard tại: http://localhost:20128/dashboard để kiểm tra trạng thái providers.');
    process.exit(1);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || '(Không có nội dung phản hồi)';

  console.log(`✅ Kết nối thành công! (${duration}ms)`);
  console.log('----------------------------------------------------');
  console.log(`💬 Phản hồi: \n${reply.trim()}`);
  console.log('----------------------------------------------------');
  if (data.usage) {
    console.log(`📊 Token usage: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens}, total=${data.usage.total_tokens}`);
  }
} catch (err) {
  console.error(`❌ Không thể kết nối tới OmniRoute: ${err.message}`);
  console.log('\n💡 OmniRoute có thể chưa được khởi động:');
  console.log('👉 Chạy lệnh: npm run omniroute (hoặc click chạy file start_omniroute.bat)');
  console.log('👉 Mở Dashboard: npm run omniroute:dashboard');
}
