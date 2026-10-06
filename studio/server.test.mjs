import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { safeExt, runBinary, uploadResumable, buildUploadPayload } from './server-lib.mjs';

const root = path.resolve('.');
const tempRoot = path.join(root, 'tmp');

// Mỗi test dựng server riêng với cổng và thư mục dữ liệu nằm trong workspace.
let nextPort = 33400;
async function boot(env = {}) {
  const dir = await mkdtemp(path.join(tempRoot, 'srv-test-'));
  const port = nextPort++;
  const child = spawn(process.execPath, ['studio/server.mjs'], {
    cwd: root,
    env: { ...process.env, STUDIO_PORT: String(port), STUDIO_DATA_DIR: dir, ...env },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw Error(`server chết khi khởi động: ${stderr}`);
    try { await fetch(`${base}/api/state`); break; } catch { await new Promise(r => setTimeout(r, 50)); }
  }
  const req = async (route, method = 'GET', body) => {
    const r = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1', ...(body === undefined ? {} : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: r.status, body: await r.json() };
  };
  return {
    base, port, dir, req,
    stderr: () => stderr,
    exited: () => child.exitCode !== null,
    exitCode: () => child.exitCode,
    async stop() {
      if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
      await rm(dir, { recursive: true, force: true });
    },
  };
}

test('B9 · PUT state từ chối khảo sát videos hỏng và bổ sung videos mảng rỗng', async () => {
  const s = await boot();
  try {
    const current = await s.req('/api/state');
    const revision = current.body.revision;
    const bad = await s.req('/api/state', 'PUT', { revision, channels: [], projects: [], surveys: [{ id: 'sv1', name: 'X', videos: { khong: 'phai mang' } }] });
    assert.equal(bad.status, 400, 'videos không phải mảng phải bị chặn');
    const fixed = await s.req('/api/state', 'PUT', { revision, channels: [], projects: [], surveys: [{ id: 'sv1', name: 'X' }] });
    assert.equal(fixed.status, 200);
    const after = await s.req('/api/state');
    assert.deepEqual(after.body.surveys[0].videos, [], 'thiếu videos phải được bổ sung mảng rỗng');
  } finally { await s.stop(); }
});

test('A1 · bản dựng không tồn tại trả JSON lỗi và không làm sập server', async () => {
  const s = await boot();
  const alive = async () => {
    if (s.exited()) return null;
    try { return (await fetch(`${s.base}/`)).status; } catch { return null; }
  };
  try {
    let missing, invalid;
    try {
      missing = await s.req('/api/build/00000000-0000-0000-0000-000000000000');
      invalid = await s.req('/api/build/xyz');
    } catch (e) {
      // Kết nối đứt khi gọi API = process đã chết do unhandled rejection.
      assert.fail(`Kết nối đứt khi gọi /api/build (lỗi: ${e.message}).\n` +
        `Server còn sống: ${await alive() === 200 ? 'có' : 'KHÔNG'}.\n` +
        `exitCode=${s.exitCode()}\nstderr:\n${s.stderr()}`);
    }
    assert.equal(missing.status, 404);
    assert.match(missing.body.error, /Không còn bản dựng/);
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /không hợp lệ/);

    // Quan trọng nhất: process phải còn sống sau hai lỗi trên.
    await new Promise(r => setTimeout(r, 300));
    const home = await fetch(`${s.base}/`);
    assert.equal(home.status, 200, `server đã chết. stderr:\n${s.stderr()}`);
  } finally { await s.stop(); }
});

test('A2 · đuôi file độc hại không ghi ra ngoài thư mục tạm của request', async () => {
  const s = await boot();
  try {
    const marker = { youtubeKey: 'SENTINEL-KHONG-DUOC-GHI-DE', keep: true };
    await writeFile(path.join(s.dir, 'settings.json'), JSON.stringify(marker), 'utf8');
    const before = await readFile(path.join(s.dir, 'settings.json'), 'utf8');

    // Đuôi chứa đường dẫn: nối thẳng vào path.join sẽ thoát ra khỏi thư mục tạm.
    const evil = 'x/../../../settings.json';
    await s.req('/api/probe', 'POST', { data: 'data:application/octet-stream;base64,' + Buffer.from('x').toString('base64'), ext: evil });

    assert.equal(await readFile(path.join(s.dir, 'settings.json'), 'utf8'), before, 'settings.json bị ghi đè');

    // Không được tạo file nào ngoài thư mục tạm (dataRoot/tmp/<uuid>).
    const created = (await readdir(s.dir, { recursive: true }))
      .map(String)
      .filter(p => !p.startsWith('tmp') && p !== 'settings.json' && p !== 'state.json' && p !== 'build');
    assert.deepEqual(created, [], `tạo file ngoài thư mục tạm: ${created.join(', ')}`);

    assert.equal((await fetch(`${s.base}/`)).status, 200, `server chết. stderr:\n${s.stderr()}`);
  } finally { await s.stop(); }
});

test('A2 · safeExt chỉ nhận đuôi file an toàn', async () => {
  assert.equal(safeExt('mp4', 'bin'), 'mp4');
  assert.equal(safeExt('MP3', 'bin'), 'mp3');
  assert.equal(safeExt('x/../../../settings.json', 'bin'), 'bin');
  assert.equal(safeExt('', 'bin'), 'bin');
  assert.equal(safeExt(null, 'bin'), 'bin');
  assert.equal(safeExt(undefined, 'bin'), 'bin');
  assert.equal(safeExt('toolong', 'bin'), 'bin');
  assert.equal(safeExt('a.b', 'bin'), 'bin');
  assert.equal(safeExt('..', 'bin'), 'bin');
  assert.equal(safeExt('exe', 'mp3'), 'exe', 'đuôi ngắn, chữ và số là hợp lệ');
  // Phải dùng đúng fallback của từng chỗ trong server.mjs.
  assert.equal(safeExt('../../evil', 'mp3'), 'mp3');
});

test('A3 · lệnh quá thời gian phải báo lỗi 504 chứ không âm thầm trả kết quả rỗng', async () => {
  // Lệnh ngủ 60 giây, timeout 200 ms: chắc chắn bị giết.
  const slow = ['-e', 'setTimeout(() => {}, 60000)'];
  await assert.rejects(
    () => runBinary(process.execPath, slow, { timeout: 200, tool: 'ffmpeg' }),
    e => {
      assert.equal(e.status, 504, `phải là lỗi 504, nhận được: ${e.status} — ${e.message}`);
      assert.match(e.message, /chạy quá/);
      return true;
    },
  );
});

test('A3 · lệnh chạy xong bình thường thì trả kết quả, không phải lỗi timeout', async () => {
  const result = await runBinary(process.execPath, ['-e', 'process.stdout.write("OK-123")'], { timeout: 20000, tool: 'ffprobe' });
  assert.equal(result.stdout, 'OK-123');
  assert.equal(result.code, 0);
});

// ---- A4: khối trung gian trả 308 (Resume Incomplete) không phải lỗi ----

// Dựng mock YouTube: POST mở phiên (trả Location), PUT nhận từng khối.
// `onChunk(range, attempt)` trả {status, range?, body?} để kịch bản hoá từng bước.
async function mockYouTube(onChunk) {
  const seen = [];
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST') {
      res.writeHead(200, { Location: `http://127.0.0.1:${srv.address().port}/session` });
      return res.end();
    }
    const range = req.headers['content-range'];
    seen.push(range);
    const body = [];
    req.on('data', d => body.push(d));
    req.on('end', () => {
      const out = onChunk(range, seen.length, Buffer.concat(body));
      const headers = { 'Content-Length': String(Buffer.byteLength(JSON.stringify(out.body ?? {}))) };
      if (out.range) headers.Range = out.range;
      res.writeHead(out.status, headers);
      res.end(JSON.stringify(out.body ?? {}));
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return {
    seen, openUrl: `http://127.0.0.1:${srv.address().port}/upload`,
    stop: () => new Promise(r => srv.close(r)),
  };
}

test('A4 · khối trung gian 308 + Range thì gửi tiếp đúng chỗ và vẫn trả id', async () => {
  const TOTAL = 250;
  const bytes = Buffer.alloc(TOTAL, 7);
  const mock = await mockYouTube(range => {
    if (range === 'bytes 0-99/250') return { status: 308, range: 'bytes=0-49' };   // chỉ nhận được 1/2 khối
    if (range === 'bytes 50-149/250') return { status: 308, range: 'bytes=0-149' }; // nhận đủ khối thứ hai
    return { status: 200, body: { id: 'VID-123' } };                                // khối cuối
  });
  try {
    const result = await uploadResumable({ openUrl: mock.openUrl, token: 't', payload: {}, bytes, chunk: 100 });
    assert.equal(result.id, 'VID-123');
    assert.equal(result.sizeBytes, TOTAL);
    assert.deepEqual(mock.seen, ['bytes 0-99/250', 'bytes 50-149/250', 'bytes 150-249/250']);
  } finally { await mock.stop(); }
});

test('A4 · 308 không kèm Range thì gửi lại khối đó, tối đa 3 lần', async () => {
  const bytes = Buffer.alloc(200, 3);
  let attempts = 0;
  const mock = await mockYouTube(() => {
    attempts++;
    // Lần 1: 308 không có Range (server chưa nhận byte nào). Lần sau thành công.
    if (attempts === 1) return { status: 308 };
    return { status: 200, body: { id: 'VID-456' } };
  });
  try {
    const result = await uploadResumable({ openUrl: mock.openUrl, token: 't', payload: {}, bytes, chunk: 100 });
    assert.equal(result.id, 'VID-456');
    // 200 byte / chunk 100 = 2 khối. Khối 1 phải gửi lại sau 308 không có Range,
    // khối 2 là khối cuối nên mới trả id.
    assert.deepEqual(mock.seen, ['bytes 0-99/200', 'bytes 0-99/200', 'bytes 100-199/200']);
  } finally { await mock.stop(); }
});

test('A4 · 308 lặp vô hạn thì báo lỗi thay vì treo', async () => {
  const bytes = Buffer.alloc(200, 3);
  const mock = await mockYouTube(() => ({ status: 308 }));
  try {
    await assert.rejects(
      () => uploadResumable({ openUrl: mock.openUrl, token: 't', payload: {}, bytes, chunk: 100, maxResumes: 3 }),
      e => { assert.equal(e.status, 502); assert.match(e.message, /không nhận thêm byte nào/); return true; },
    );
    // 1 lần gửi + tối đa 3 lần gửi lại, mỗi lần 1 request.
    assert.equal(mock.seen.length, 4, `phải dừng sau 4 request, thấy ${mock.seen.length}`);
  } finally { await mock.stop(); }
});

test('A4 · selfDeclaredMadeForKids chỉ nằm trong status, không có trong snippet', async () => {
  const payload = buildUploadPayload({
    title: 'Tên video', description: 'mô tả', tags: 'a, b', categoryId: '27',
    madeForKids: true, privacy: 'private',
  });
  assert.equal('selfDeclaredMadeForKids' in payload.snippet, false, 'snippet không được chứa selfDeclaredMadeForKids');
  assert.equal(payload.status.selfDeclaredMadeForKids, true);
  assert.equal(payload.status.privacyStatus, 'private');
  assert.deepEqual(payload.snippet.tags, ['a', 'b']);
});

test('A4 · payload giới hạn 30 thẻ và luôn có mặc định hợp lệ', async () => {
  const payload = buildUploadPayload({ title: 'x', tags: Array.from({ length: 50 }, (_, i) => `t${i}`) });
  assert.equal(payload.snippet.tags.length, 30);
  assert.equal(payload.snippet.categoryId, '27');
  assert.equal(payload.snippet.defaultLanguage, 'vi');
  assert.equal(payload.status.privacyStatus, undefined, 'privacy phải do server chọn từ danh sách cho phép');
  assert.equal(payload.status.selfDeclaredMadeForKids, false);
});

// ---- A5: max_tokens phải đủ lớn cho từng tác vụ ----

// Gateway giả theo chuẩn OpenAI, ghi lại max_tokens của mỗi lượt gọi.
async function mockGateway() {
  const seen = [];
  const reply = {
    ok: true, groups: [{ name: 'Nhóm 1', angle: 'a', reason: 'r', videoIds: ['v1'] }],
    ideas: [], variants: [], names: [], topics: [], animations: [],
    segments: [], scenes: [], channels: [], summary: '', sensory: '', cast: [], angles: [],
    claims: [], questions: [], facts: [], timeline: [], narration: '', editorNotes: [],
  };
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      let sent = null;
      try { sent = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* bỏ qua */ }
      seen.push({ max_tokens: sent?.max_tokens, model: sent?.model });
      const payload = JSON.stringify({ model: sent?.model || 'mock', choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { seen, url: `http://127.0.0.1:${srv.address().port}/v1`, stop: () => new Promise(r => srv.close(r)) };
}

const AI_ACTIONS = ['templates', 'groups', 'packaging', 'identity', 'ideas', 'topics', 'animation', 'research', 'outline', 'script', 'scenes'];

test('A5 · mỗi tác vụ AI gửi max_tokens đủ lớn, không action nào dùng chung mức 700', async () => {
  const gw = await mockGateway();
  const envFile = path.join(tempRoot, `env-a5-${Date.now()}.env`);
  await writeFile(envFile, `OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`, 'utf8');
  const s = await boot({ STUDIO_ENV_FILE: envFile });
  try {
    for (const action of AI_ACTIONS) {
      const r = await s.req('/api/generate', 'POST', { action, context: { note: 'x' } });
      assert.equal(r.status, 200, `${action}: ${r.body.error}\n${s.stderr()}`);
    }
    const byCall = Object.fromEntries(AI_ACTIONS.map((a, i) => [a, gw.seen[i]]));
    for (const action of AI_ACTIONS) {
      const sent = byCall[action]?.max_tokens;
      assert.equal(typeof sent, 'number', `${action}: không gửi max_tokens`);
      assert.ok(sent >= 1600, `${action} chỉ có ${sent} token, cần ít nhất 1600`);
    }
    // 30 ý tưởng / 16 phương án bao bì không thể vừa 700 token.
    assert.ok(byCall.ideas.max_tokens >= 4000, `ideas có ${byCall.ideas.max_tokens}, cần ≥ 4000 cho 30 mục`);
    assert.ok(byCall.packaging.max_tokens >= 3500, `packaging có ${byCall.packaging.max_tokens}, cần ≥ 3500 cho 16 mục`);
  } finally { await s.stop(); await gw.stop(); await rm(envFile, { force: true }); }
});

// ---- B6: prompt topics không được đẩy AI về chủ đề ít nổi tiếng ----

// Gateway giả ghi lại TOÀN BỘ thân yêu cầu để kiểm tra prompt gửi đi.
async function promptGateway() {
  const seen = [];
  const reply = {
    ok: true, groups: [], ideas: [], variants: [], names: [], topics: [], animations: [],
    segments: [], scenes: [], channels: [], summary: '', sensory: '', cast: [], angles: [],
    claims: [], questions: [], facts: [], timeline: [], narration: '', editorNotes: [],
  };
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      let sent = null;
      try { sent = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* bỏ qua */ }
      seen.push(sent);
      const payload = JSON.stringify({ model: sent?.model || 'mock', choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { seen, url: `http://127.0.0.1:${srv.address().port}/v1`, stop: () => new Promise(r => srv.close(r)) };
}

test('B6 · prompt topics đòi thực thể nhiều người biết, không đẩy sang chủ đề vắng', async () => {
  const gw = await promptGateway();
  const envFile = path.join(tempRoot, `env-b6-${Date.now()}.env`);
  await writeFile(envFile, `OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`, 'utf8');
  const s = await boot({ STUDIO_ENV_FILE: envFile });
  try {
    const r = await s.req('/api/generate', 'POST', {
      action: 'topics',
      context: { group: 'Thành phố', template: 'the entire history of', shelfTitles: ['the entire history of egypt'] },
    });
    assert.equal(r.status, 200, r.body.error);
    const prompt = JSON.stringify(gw.seen[0] || {});
    assert.ok(!/ÍT NỔI TIẾNG HƯỢN HƠN/i.test(prompt), 'prompt không được bảo AI chọn chủ đề ít nổi tiếng hơn');
    assert.match(prompt, /nhiều người biết/, 'phải yêu cầu thực thể nhiều người biết');
    assert.match(prompt, /trùng thực thể/, 'phải yêu cầu loại trùng thực thể với kho');
    assert.match(prompt, /knownBy/, 'phải yêu cầu điền knownBy để xếp hạng');
  } finally { await s.stop(); await gw.stop(); await rm(envFile, { force: true }); }
});