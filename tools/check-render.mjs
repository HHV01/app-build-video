// Kiểm tra thật đường dựng video: tạo ảnh + tiếng bằng ffmpeg, gọi /api/render,
// rồi đo lại file MP4 trả về. Chạy khi Studio đang bật: node tools/check-render.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const ffprobe = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffprobe.exe');
const base = process.env.STUDIO_URL || 'http://localhost:3210';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tich-render-'));

function run(tool, args, capture = 'stderr') {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args, { windowsHide: true });
    let err = '', out = '';
    child.stderr.on('data', d => { err += d; });
    child.stdout.on('data', d => { out += d; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`${path.basename(tool)} exit ${code}\n${(err || out).slice(-600)}`));
      resolve(capture === 'stdout' ? out : err);
    });
  });
}

const colors = ['0x1d4f3a', '0x7a2f2f', '0x24405e'];
const durations = [4, 6, 8];
const scenes = [];
for (let i = 0; i < colors.length; i += 1) {
  const file = path.join(tmp, `s${i}.png`);
  await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=${colors[i]}:s=1280x720`, '-frames:v', '1', file]);
  scenes.push({ duration: durations[i], image: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}` });
}
// Giọng giả: hai hậu tố A3 để có thật tiếng người nghe được trong file.
const voice = path.join(tmp, 'voice.mp3');
await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=6', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=6', '-filter_complex', '[0:a][1:a]amix=inputs=2', '-c:a', 'libmp3lame', '-q:a', '5', voice]);

const caps = await (await fetch(`${base}/api/capabilities`)).json();
if (!caps.ffmpeg) { console.error('Studio chưa thấy ffmpeg. Cần tools/ffmpeg/bin/ffmpeg.exe'); process.exit(1); }
console.log(`ffmpeg: ${caps.ffmpegVersion}`);
console.log(`dựng ${scenes.length} cảnh, tổng ${durations.reduce((a, b) => a + b, 0)} giây, kèm voice 6 giây`);

const res = await fetch(`${base}/api/render`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' },
  body: JSON.stringify({ scenes, voice: `data:audio/mpeg;base64,${fs.readFileSync(voice).toString('base64')}`, voiceExt: 'mp3', name: 'kiem-tra-dung' }),
});
const result = await res.json();
if (!res.ok) { console.error('LỖI RENDER:', result.message || JSON.stringify(result).slice(0, 500)); process.exit(1); }

const out = path.join(tmp, result.fileName);
fs.writeFileSync(out, Buffer.from(result.data, 'base64'));
console.log(`nhận về: ${result.fileName} · ${(result.sizeBytes / 1024).toFixed(0)} KB · ${result.scenesRendered} cảnh · bỏ ${result.droppedScenes}`);
console.log(`ảnh ${result.scenesSeconds}s · voice ${result.voiceSeconds}s → cắt còn ${result.probe.duration}s`);

const probe = await run(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', out], 'stdout');
const info = JSON.parse(probe);
const v = info.streams.find(s => s.codec_type === 'video');
const a = info.streams.find(s => s.codec_type === 'audio');
const dur = Number(info.format.duration);
const want = Math.min(result.scenesSeconds, result.voiceSeconds);
const checks = [
  ['có stream video', Boolean(v)],
  ['có stream audio', Boolean(a)],
  ['codec video h264', v?.codec_name === 'h264'],
  ['codec audio aac', a?.codec_name === 'aac'],
  ['khung hình 1280x720', v?.width === 1280 && v?.height === 720],
  ['độ dài khớp chuẩn', Math.abs(dur - want) < 0.6],
  ['không vượt tổng ảnh', dur <= result.scenesSeconds + 0.3],
];
console.log('');
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`\nthời lượng thật: ${dur.toFixed(2)}s · ${v?.width}x${v?.height} ${v?.avg_frame_rate}fps · ${(Number(info.format.bit_rate) / 1000).toFixed(0)} kbps`);
fs.rmSync(tmp, { recursive: true, force: true });
const failed = checks.filter(([, ok]) => !ok);
console.log(failed.length ? `\n${failed.length} kiểm tra KHÔNG đạt.` : '\nTất cả kiểm tra đạt.');
process.exit(failed.length ? 1 : 0);