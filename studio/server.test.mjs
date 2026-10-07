import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';

const root = path.resolve('.');
const tempRoot = path.join(root, 'tmp');
await mkdir(tempRoot,{recursive:true});

// Mỗi test dựng server riêng với cổng và thư mục dữ liệu nằm trong workspace.
let nextPort = 33400;
async function boot(env = {},seed={}) {
  const dir = await mkdtemp(path.join(tempRoot, 'srv-test-'));
  if(seed.settings)await writeFile(path.join(dir,'settings.json'),JSON.stringify(seed.settings));
  if(seed.state)await writeFile(path.join(dir,'state.json'),JSON.stringify(seed.state));
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

const AI_ACTIONS = ['templates', 'groups', 'packaging', 'identity', 'ideas', 'topics', 'research', 'outline', 'script'];

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

test('AI HTTP 503 switches model through gateway and retains primary setting',async()=>{
 const models=[];const gateway=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw);models.push(b.model);res.setHeader('Content-Type','application/json');if(b.model==='primary'){res.writeHead(503);res.end(JSON.stringify({error:{message:'overloaded'}}));}else res.end(JSON.stringify({model:'backup',choices:[{message:{content:'{"angles":[{"angle":"Test angle","reason":"Titles"}]}'},finish_reason:'stop'}]}));});
 gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 const envDir=await mkdtemp(path.join(tempRoot,'fallback-env-'));const envPath=path.join(envDir,'test.env');await writeFile(envPath,`OPENAI_BASE_URL=http://127.0.0.1:${gateway.address().port}/v1\nOPENAI_API_KEY=test-key\n`);
 const s=await boot({STUDIO_ENV_FILE:envPath});
 try{
  assert.equal((await s.req('/api/settings','PUT',{model:'primary',autoFallback:true,fallbackModels:['backup']})).status,200);
  const result=await s.req('/api/generate','POST',{action:'angles',context:{titles:['Title']}});
  assert.equal(result.status,200);assert.equal(result.body.model,'backup');assert.equal(result.body.fallback.used,true);assert.deepEqual(models,['primary','backup']);
  assert.equal((await s.req('/api/settings')).body.model,'primary');
  assert.equal((await s.req('/api/settings','PUT',{fallbackModels:['a','b','c','d']})).status,400);
 }finally{await s.stop();gateway.close();await rm(envDir,{recursive:true,force:true});}
});

test('E2 removed routes return 404 and scene AI action is rejected',async()=>{
 const s=await boot();try{
 for(const route of ['tts','image','transcribe','render','probe','youtube/connect','youtube/callback','youtube/publish'])assert.equal((await s.req('/api/'+route,'POST',{})).status,404,route);
 assert.equal((await s.req('/api/build/old')).status,404);
 for(const action of ['scenes','animation'])assert.equal((await s.req('/api/generate','POST',{action,context:{}})).status,400);
 assert.equal((await s.req('/api/state')).status,200);
 }finally{await s.stop();}
});

test('E3 legacy settings boot; Data API key remains secret; old media data survives',async()=>{
 const legacyKey=['youtube','ClientId'].join('');const s=await boot({}, {settings:{[legacyKey]:'old',model:'test'},state:{revision:0,channels:[],surveys:[],projects:[{id:'p',step:8,approved:[0,3,8],scenes:[{prompt:'old'}],voiceData:'old',rendered:{id:'old'}}]}});
 try{
  const state=(await s.req('/api/state')).body;assert.equal(state.projects[0].step,3);assert.deepEqual(state.projects[0].approved,[0,3]);assert.equal(state.projects[0].scenes[0].prompt,'old');assert.equal(state.projects[0].voiceData,'old');assert.equal(state.projects[0].rendered.id,'old');
  assert.equal((await s.req('/api/settings','PUT',{youtubeKey:'private-test-key',[legacyKey]:'new'})).status,200);
  const settings=(await s.req('/api/settings')).body;assert.equal(settings.youtubeConfigured,true);assert(!JSON.stringify(settings).includes('private-test-key'));assert(!Object.hasOwn(settings,legacyKey));
  const persisted=JSON.parse(await readFile(path.join(s.dir,'settings.json'),'utf8'));assert.equal(persisted.youtubeKey,'private-test-key');assert.equal(persisted[legacyKey],'old');
  for(const route of ['/','/app.js','/production.mjs','/sync.mjs']){const r=await fetch(s.base+route);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);}
 }finally{await s.stop();}
});
