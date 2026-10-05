// Gắn ảnh cảnh + file giọng thật vào dự án demo để thử nút "Dựng MP4" và "Tạo SRT".
// Chỉ phục vụ kiểm thử cục bộ. Chạy khi Studio đang bật: node tools/seed-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ffmpeg = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const base = process.env.STUDIO_URL || 'http://localhost:3210';
const projectId = process.argv[2] || 'project-mau-thu-nghiem';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tich-media-'));

const HUES = ['0x1d4f3a', '0x7a2f2f', '0x24405e'];
const images = HUES.map((c, i) => {
  const file = path.join(tmp, `c${i}.png`);
  spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=${c}:s=1280x720`, '-frames:v', '1', file]);
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
});

// Giọng nói thật qua SAPI: file im lặng sẽ không chứng minh được gì.
const wav = path.join(tmp, 'v.wav');
spawnSync('powershell.exe', ['-NoProfile', '-Command', [
  'Add-Type -AssemblyName System.Speech;',
  '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
  '$s.Rate = 1;',
  `$s.SetOutputToWaveFile('${wav}');`,
  '$s.Speak("Vao nam mot nghin chin tram chin muoi lam, de che Ottoman bat dau lon manh. Trong vong ba muoi nam, ho da chiem duoc gan mot nua the gioi.");',
  '$s.Dispose();',
].join(' ')], { stdio: 'inherit' });
const mp3 = path.join(tmp, 'v.mp3');
spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '5', mp3]);
const seconds = Number(JSON.parse(spawnSync(ffmpeg, ['-hide_banner', '-i', mp3], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0)).toFixed(2));
console.log(`giọng mẫu: ${seconds} giây`);

const state = await (await fetch(`${base}/api/state`)).json();
const p = state.projects.find(x => x.id === projectId);
if (!p) throw new Error(`khong tim thay du an ${projectId}`);
images.forEach((image, i) => { if (p.scenes[i]) p.scenes[i].image = image; });
p.voiceData = `data:audio/mpeg;base64,${fs.readFileSync(mp3).toString('base64')}`;
p.voiceName = 'giong-mau.mp3';
p.voiceSeconds = seconds;
p.srt = ''; delete p.rendered;
await fetch(`${base}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' }, body: JSON.stringify(state) });
console.log(`da gan ${images.length} anh + giong cho ${projectId}`);
fs.rmSync(tmp, { recursive: true, force: true });