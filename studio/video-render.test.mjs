import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';

const root = path.resolve('.');
const tempRoot = path.join(root, 'tmp');
await mkdir(tempRoot, { recursive: true });

let nextPort = 33600;
async function boot() {
  const dir = await mkdtemp(path.join(tempRoot, 'render-test-'));
  const port = nextPort++;
  const child = spawn(process.execPath, ['studio/server.mjs'], {
    cwd: root,
    env: { ...process.env, STUDIO_PORT: String(port), STUDIO_DATA_DIR: dir },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw Error(`server chết khi khởi động: ${stderr}`);
    try { await fetch(`${base}/api/state`); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  const req = async (route, method = 'GET', body) => {
    const r = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: r.status, body: await r.json() };
  };
  return { base, req, async stop() { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } await rm(dir, { recursive: true, force: true }); } };
}

function localFFmpeg() {
  const bundled = path.join(root, 'tools', 'ffmpeg', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  return existsSync(bundled) ? bundled : null;
}

function runTool(tool, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args, { windowsHide: true });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(Error(`${tool} exit ${code}: ${err.slice(-300)}`))));
  });
}

test('dựng video: capabilities báo ffmpeg, render ảnh+voice ra MP4 h264/aac', async (t) => {
  const s = await boot();
  try {
    const caps = await s.req('/api/capabilities');
    assert.equal(caps.status, 200);
    assert.equal(typeof caps.body.ffmpeg, 'boolean');
    const ffmpeg = localFFmpeg();
    if (!caps.body.ffmpeg || !ffmpeg) { t.skip('thiếu ffmpeg, bỏ qua dựng thật'); return; }
    const dir = await mkdtemp(path.join(tempRoot, 'render-fix-'));
    try {
      const ffprobe = path.join(root, 'tools', 'ffmpeg', 'bin', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
      const colors = ['0x1d4f3a', '0x24405e'];
      const durations = [2, 3];
      const scenes = [];
      for (let i = 0; i < colors.length; i += 1) {
        const file = path.join(dir, `s${i}.png`);
        await runTool(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=${colors[i]}:s=320x180`, '-frames:v', '1', file]);
        scenes.push({ duration: durations[i], image: `data:image/png;base64,${(await readFile(file)).toString('base64')}` });
      }
      const voiceFile = path.join(dir, 'voice.mp3');
      await runTool(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'libmp3lame', '-q:a', '5', voiceFile]);
      const res = await s.req('/api/render', 'POST', { scenes, voice: `data:audio/mpeg;base64,${(await readFile(voiceFile)).toString('base64')}`, voiceExt: 'mp3', name: 'kiem-tra' });
      assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 300));
      assert.match(res.body.fileName, /\.mp4$/);
      assert.ok(res.body.sizeBytes > 10000);
      assert.equal(res.body.scenesRendered, 2);
      assert.equal(res.body.droppedScenes, 0);
      // Tổng ảnh 5s, voice 4s → cắt theo bên ngắn (4s).
      assert.ok(Math.abs(res.body.probe.duration - 4) < 0.6, `probe ${res.body.probe.duration}`);
      const outFile = path.join(dir, 'out.mp4');
      await import('node:fs/promises').then((fs) => fs.writeFile(outFile, Buffer.from(res.body.data, 'base64')));
      const probeOut = await new Promise((resolve, reject) => {
        const child = spawn(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_streams', outFile], { windowsHide: true });
        let stdout = '';
        child.stdout.on('data', (d) => { stdout += d; });
        child.on('error', reject);
        child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(Error('ffprobe exit ' + code))));
      });
      const info = JSON.parse(probeOut);
      const v = info.streams.find((x) => x.codec_type === 'video');
      const a = info.streams.find((x) => x.codec_type === 'audio');
      assert.equal(v.codec_name, 'h264');
      assert.equal(a.codec_name, 'aac');
      assert.equal(v.width, 1280);
      assert.equal(v.height, 720);
      const drop = await s.req('/api/render', 'POST', { scenes: [{ duration: 2, image: scenes[0].image }, { duration: 2 }], voice: `data:audio/mpeg;base64,${(await readFile(voiceFile)).toString('base64')}`, voiceExt: 'mp3', name: 'thieu-anh' });
      assert.equal(drop.status, 200);
      assert.equal(drop.body.scenesRendered, 1);
      assert.equal(drop.body.droppedScenes, 1);
      const up = await s.req('/api/assets', 'POST', { data: scenes[0].image });
      assert.equal(up.status, 200);
      const viaAsset = await s.req('/api/render', 'POST', { scenes: [{ duration: 2, image: up.body.url }], voice: `data:audio/mpeg;base64,${(await readFile(voiceFile)).toString('base64')}`, voiceExt: 'mp3', name: 'asset-url' });
      assert.equal(viaAsset.status, 200, JSON.stringify(viaAsset.body).slice(0, 200));
      assert.equal(viaAsset.body.droppedScenes, 0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  } finally { await s.stop(); }
});

test('dựng video: từ chối cảnh sai và thiếu voice; transcribe báo chưa có', async () => {
  const s = await boot();
  try {
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const badDur = await s.req('/api/render', 'POST', { scenes: [{ duration: 0, image: tiny }], voice: 'data:audio/mpeg;base64,AAA=' });
    assert.equal(badDur.status, 400);
    const badKind = await s.req('/api/render', 'POST', { scenes: [{ kind: 'gif', duration: 2, image: tiny }], voice: 'data:audio/mpeg;base64,AAA=' });
    assert.equal(badKind.status, 400);
    const badHtml = await s.req('/api/render', 'POST', { scenes: [{ kind: 'html', html: '   ', duration: 5 }], voice: 'data:audio/mpeg;base64,AAA=' });
    assert.equal(badHtml.status, 400);
    const noVoice = await s.req('/api/render', 'POST', { scenes: [{ duration: 2, image: tiny }] });
    assert.equal(noVoice.status, 400);
    const tr = await s.req('/api/transcribe', 'POST', { audio: 'data:audio/mpeg;base64,AAA=', mimeType: 'audio/mpeg' });
    assert.equal(tr.status, 501);
    assert.match(tr.body.error, /SRT/);
  } finally { await s.stop(); }
});

test('dựng video: cảnh HTML ghi hình offline, ghép cùng cảnh ảnh', async (t) => {
  const s = await boot();
  try {
    const caps = await s.req('/api/capabilities');
    assert.equal(typeof caps.body.htmlVideo, 'boolean');
    const ffmpeg = localFFmpeg();
    if (!caps.body.ffmpeg || !caps.body.htmlVideo || !ffmpeg) { t.skip('thiếu ffmpeg/chromium, bỏ qua dựng HTML thật'); return; }
    const dir = await mkdtemp(path.join(tempRoot, 'render-html-'));
    try {
      const imgFile = path.join(dir, 's0.png');
      await runTool(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x1d4f3a:s=320x180', '-frames:v', '1', imgFile]);
      const voiceFile = path.join(dir, 'voice.mp3');
      await runTool(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=5', '-c:a', 'libmp3lame', '-q:a', '5', voiceFile]);
      const voice = `data:audio/mpeg;base64,${(await readFile(voiceFile)).toString('base64')}`;
      const res = await s.req('/api/render', 'POST', {
        scenes: [
          { kind: 'html', html: '<h1>50%</h1><p>Tăng trưởng</p>', duration: 3 },
          { duration: 2, image: `data:image/png;base64,${(await readFile(imgFile)).toString('base64')}` },
        ],
        voice, voiceExt: 'mp3', name: 'html-test',
      });
      assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 300));
      assert.equal(res.body.scenesRendered, 2);
      assert.deepEqual(res.body.kinds, { image: 1, html: 1, wan: 0 });
      assert.ok(Math.abs(res.body.probe.duration - 5) < 0.8, `probe ${res.body.probe.duration}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  } finally { await s.stop(); }
});

test('wan: từ chối thiếu mô tả/ảnh trước khi chạm GPU', async () => {
  const s = await boot();
  try {
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const noMotion = await s.req('/api/wan', 'POST', { image: tiny });
    assert.equal(noMotion.status, 400);
    const noImage = await s.req('/api/wan', 'POST', { motionPrompt: 'Nhân vật giơ tay' });
    assert.equal(noImage.status, 400);
  } finally { await s.stop(); }
});
