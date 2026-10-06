import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';

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