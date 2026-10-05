// Kiểm tra thật đường tạo SRT: sinh giọng đọc thật rồi gọi /api/transcribe,
// đối chiếu SRT trả về với file mp3 gốc bằng ffprobe.
// Chạy khi Studio đang bật: node tools/check-transcribe.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const ffprobe = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffprobe.exe');
const base = process.env.STUDIO_URL || 'http://localhost:3210';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tich-srt-'));

function run(tool, args, capture = 'stderr') {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args, { windowsHide: true });
    let err = '', out = '';
    child.stderr.on('data', d => { err += d; });
    child.stdout.on('data', d => { out += d; });
    child.on('error', reject);
    child.on('close', code => (code !== 0
      ? reject(new Error(`${path.basename(tool)} exit ${code}\n${(err || out).slice(-600)}`))
      : resolve(capture === 'stdout' ? out : err)));
  });
}

// Giọng nói thật để Whisper có mốc thời gian rõ ràng. Dùng SAPI của Windows vì
// Studio chưa có TTS nối sẵn; nội dung tiếng Anh để đối chiếu chữ nhận dạng được.
const SCRIPT = [
  'The Ottoman empire began its rapid expansion in the year fifteen ninety five.',
  'Within only thirty years it controlled nearly half of the known world.',
  'This is a longer third sentence so that the transcript spans several subtitle blocks.',
];
const wav = path.join(tmp, 'voice.wav');
const ps = [
  'Add-Type -AssemblyName System.Speech;',
  `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;`,
  `$s.Rate = 0;`,
  `$s.SetOutputToWaveFile('${wav.replace(/\\/g, '\\\\')}');`,
  `$s.Speak("${SCRIPT.join(' ').replace(/"/g, '`"')}");`,
  '$s.Dispose();',
].join(' ');
await run('powershell.exe', ['-NoProfile', '-Command', ps]);
if (!fs.existsSync(wav)) { console.error('Không tạo được file giọng thử bằng SAPI.'); process.exit(1); }
const mp3 = path.join(tmp, 'voice.mp3');
await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '5', mp3]);
const truth = await run(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', mp3], 'stdout');
const realSeconds = Number(JSON.parse(truth).format.duration);
console.log(`giọng thật: ${realSeconds.toFixed(2)} giây`);

const res = await fetch(`${base}/api/transcribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' },
  body: JSON.stringify({ audio: `data:audio/mpeg;base64,${fs.readFileSync(mp3).toString('base64')}`, mimeType: 'audio/mpeg', language: 'vi' }),
});
const out = await res.json();
if (!res.ok) { console.error('LỖI:', out.message || JSON.stringify(out).slice(0, 400)); process.exit(1); }

const blocks = String(out.srt).trim().split(/\r?\n\r?\n/);
const rows = blocks.map(b => b.split(/\r?\n/));
const stamps = rows.map(r => r[1] || '');
const toSec = s => {
  const m = String(s).match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : NaN;
};
// Dấu "-->" nằm giữa nên phải đọc riêng mốc cuối, không lấy mốc đầu.
const lastEnd = toSec(stamps[stamps.length - 1].split('-->')[1].trim());
const checks = [
  ['có SRT', blocks.length > 0],
  ['mọi khối có chữ', rows.every(r => r.length >= 3 && r.slice(2).join('').trim().length > 0)],
  ['đánh số khối liên tục', rows.every((r, i) => r[0] === String(i + 1))],
  ['mốc thời gian hợp lệ', stamps.every(s => !Number.isNaN(toSec(s)) && toSec(s) >= 0)],
  ['khối sau không chồng khối trước', rows.every((r, i) => !i || toSec(r[1].split('-->')[0].trim()) >= toSec(stamps[i - 1].split('-->')[1].trim()) - 0.05)],
  ['đuôi khớp thời lượng thật', Math.abs(lastEnd - realSeconds) < 1.5],
  ['mỗi khối không quá 2 dòng chữ', rows.every(r => r.length - 2 <= 2)],
  ['khối không quá 7 giây', rows.every(r => toSec(r[1].split('-->')[1].trim()) - toSec(r[1].split('-->')[0].trim()) <= 7.2)],
];
console.log(`\nSRT: ${blocks.length} khối · kết thúc ở ${lastEnd.toFixed(2)}s`);
console.log(`chữ nhận dạng: ${out.text.slice(0, 120)}`);
console.log('\n--- 8 dòng đầu SRT ---');
console.log(blocks.slice(0, 2).join('\n'));
console.log('');
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
fs.rmSync(tmp, { recursive: true, force: true });
const failed = checks.filter(([, ok]) => !ok);
console.log(failed.length ? `\n${failed.length} kiểm tra KHÔNG đạt.` : '\nTất cả kiểm tra đạt.');
process.exit(failed.length ? 1 : 0);