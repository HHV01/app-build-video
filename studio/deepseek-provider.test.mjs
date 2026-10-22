import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import { resolveAIConnection, sendAICompletion, updatedAIKeys, checkDeepSeekBalance } from './ai-providers.mjs';
import { withModelFallback, isJSONGenerationFailure, MODEL_COOLDOWN_MS } from './model-fallback.mjs';
import { renderProviderSettings } from './public/provider-settings.mjs';

const keys = { gemini: 'gemini-secret', xai: 'xai-secret', groq: 'groq-secret', deepseek: 'deepseek-secret' };

test('DeepSeek routing uses its own endpoint and key, never another provider key', async () => {
  let seen;
  const result = await sendAICompletion({ aiMode: 'direct' }, keys, {}, 'deepseek/deepseek-chat', {
    messages: [{ role: 'user', content: 'trả json' }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  }, async (url, options) => {
    seen = { url, headers: options.headers, body: JSON.parse(options.body) };
    return { choices: [{ message: { content: '{"ok":true}' } }] };
  }, 1000);
  assert.equal(seen.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(seen.headers.Authorization, 'Bearer deepseek-secret');
  assert.equal(seen.body.model, 'deepseek-chat');
  assert.deepEqual(seen.body.response_format, { type: 'json_object' });
  assert.equal(result.choices[0].message.content, '{"ok":true}');
  assert.equal(JSON.stringify(seen).includes('gemini-secret'), false);

  const fromEnv = resolveAIConnection({ aiMode: 'direct' }, {}, { DEEPSEEK_API_KEY: 'env-deepseek' }, 'deepseek/deepseek-reasoner');
  assert.equal(fromEnv.provider, 'deepseek');
  assert.equal(fromEnv.key, 'env-deepseek');
  assert.equal(fromEnv.base, 'https://api.deepseek.com');
  assert.throws(() => resolveAIConnection({ aiMode: 'direct' }, {}, {}, 'deepseek/deepseek-chat'), /DeepSeek/);
  assert.equal(updatedAIKeys({}, { deepseek: 'new-deepseek' }).deepseek, 'new-deepseek');
});

test('empty DeepSeek JSON answer is treated as a JSON failure so the existing retry can drop response_format', async () => {
  const request = async (url, options) => {
    const body = JSON.parse(options.body);
    if (body.response_format) return { choices: [{ message: { content: '' } }] };
    return { choices: [{ message: { content: '{"ok":true}' } }] };
  };
  await assert.rejects(
    sendAICompletion({ aiMode: 'direct' }, keys, {}, 'deepseek/deepseek-chat', { response_format: { type: 'json_object' }, messages: [] }, request, 1000),
    error => isJSONGenerationFailure(error) === true,
  );
  const retried = await sendAICompletion({ aiMode: 'direct' }, keys, {}, 'deepseek/deepseek-chat', { messages: [] }, request, 1000);
  assert.equal(retried.choices[0].message.content, '{"ok":true}');
});

test('reasoning content is removed and reasoning models do not receive unsupported parameters', async () => {
  let body;
  const result = await sendAICompletion({ aiMode: 'direct' }, keys, {}, 'deepseek/deepseek-reasoner', {
    messages: [],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  }, async (url, options) => {
    body = JSON.parse(options.body);
    return { choices: [{ message: { role: 'assistant', content: '{"ok":true}', reasoning_content: 'PRIVATE THOUGHTS' } }] };
  }, 1000);
  assert.equal(body.response_format, undefined);
  assert.equal(body.temperature, undefined);
  assert.equal(result.choices[0].message.content, '{"ok":true}');
  assert.equal(result.choices[0].message.reasoning_content, undefined);
  assert.equal(JSON.stringify(result).includes('PRIVATE THOUGHTS'), false);
});

test('DeepSeek 402, 429 and 5xx switch model and rest; 401 switches without resting', async () => {
  for (const status of [402, 429, 502]) {
    const cooldowns = new Map();
    const result = await withModelFallback('deepseek/deepseek-chat', ['gemini/gemini-2.5-flash'], async model => {
      if (model.startsWith('deepseek/')) throw Object.assign(Error('upstream PRIVATE_KEY'), { upstreamStatus: status });
      return { output: { ok: true } };
    }, { cooldowns });
    assert.equal(result.fallback.used, true);
    assert.equal(cooldowns.get('deepseek/deepseek-chat').status, status);
    assert.ok(cooldowns.get('deepseek/deepseek-chat').until >= Date.now() + MODEL_COOLDOWN_MS - 1000);
    assert.equal(JSON.stringify(result).includes('PRIVATE_KEY'), false);
  }
  const cooldowns = new Map();
  const result = await withModelFallback('deepseek/deepseek-chat', ['gemini/gemini-2.5-flash'], async model => {
    if (model.startsWith('deepseek/')) throw Object.assign(Error('bad key'), { upstreamStatus: 401 });
    return { output: { ok: true } };
  }, { cooldowns });
  assert.equal(result.fallback.attempts[0].status, 401);
  assert.equal(cooldowns.size, 0);
});

test('DeepSeek controls save a private key and expose balance without storing it', async () => {
  const helpers = {
    esc: value => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    btn: (text, action, style, attributes) => `<button data-action="${action}" ${attributes}>${text}</button>`,
  };
  const html = renderProviderSettings({
    deepseekConfigured: true,
    model: 'deepseek/deepseek-chat',
    providerModels: { deepseek: ['deepseek-chat', 'deepseek-reasoner'] },
    deepseek: 'PRIVATE_DEEPSEEK',
  }, helpers);
  assert.match(html, /id="deepseek-key" type="password"/);
  assert.match(html, /data-action="save-provider-key"[^>]*data-provider="deepseek"/);
  assert.match(html, /data-action="check-deepseek-balance"/);
  assert.match(html, /value="deepseek-chat" selected/);
  assert.doesNotMatch(html, /PRIVATE_DEEPSEEK/);

  const stored = { deepseek: 'deepseek-secret' };
  const before = JSON.stringify(stored);
  let seen;
  const balance = await checkDeepSeekBalance(stored, {}, async (url, options) => {
    seen = { url, headers: options.headers };
    return { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '12.34', granted_balance: '0.00', topped_up_balance: '12.34' }] };
  });
  assert.equal(seen.url, 'https://api.deepseek.com/user/balance');
  assert.equal(seen.headers.Authorization, 'Bearer deepseek-secret');
  assert.equal(balance.available, true);
  assert.equal(balance.balances[0].total, '12.34');
  assert.equal(JSON.stringify(balance).includes('deepseek-secret'), false);
  assert.equal(JSON.stringify(stored), before);
  await assert.rejects(checkDeepSeekBalance({}, {}, async () => ({})), /DeepSeek/);
});

const root = path.resolve('.');
async function boot(seed = {}) {
  const base = path.join(root, 'tmp');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, 'deepseek-srv-'));
  if (seed.settings) await writeFile(path.join(dir, 'settings.json'), JSON.stringify(seed.settings));
  if (seed.aiKeys) await writeFile(path.join(dir, 'ai-keys.json'), JSON.stringify(seed.aiKeys));
  if (seed.state) await writeFile(path.join(dir, 'state.json'), JSON.stringify(seed.state));
  const port = 34870 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['studio/server.mjs'], {
    cwd: root,
    env: { ...process.env, STUDIO_PORT: String(port), STUDIO_DATA_DIR: dir },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 250; i++) {
    if (child.exitCode !== null) throw Error(`server stopped: ${stderr}`);
    try { await fetch(`${url}/api/state`); break; } catch { await new Promise(resolve => setTimeout(resolve, 15)); }
  }
  return {
    dir,
    stderr: () => stderr,
    async req(route, method = 'GET', body) {
      const response = await fetch(url + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    },
    async stop() {
      if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
      await rm(dir, { recursive: true, force: true });
    },
  };
}

test('settings and saved keys never expose the DeepSeek key', async () => {
  const secret = 'DEEPSEEK_TEST_SECRET_9481';
  const server = await boot({
    settings: { aiMode: 'direct', model: 'deepseek/deepseek-chat', autoFallback: true },
    aiKeys: { deepseek: secret },
  });
  try {
    const settings = await server.req('/api/settings');
    assert.equal(settings.status, 200);
    assert.equal(settings.body.deepseekConfigured, true);
    assert.equal(JSON.stringify(settings.body).includes(secret), false);
    const saved = await server.req('/api/ai/keys', 'PUT', { deepseek: 'DEEPSEEK_SECOND_SECRET' });
    assert.equal(saved.status, 200);
    const file = await readFile(path.join(server.dir, 'ai-keys.json'), 'utf8');
    assert.equal(file.includes('DEEPSEEK_SECOND_SECRET'), true);
    const models = await server.req('/api/ai/models?provider=unsupported');
    assert.equal(models.status, 400);
  } finally {
    await server.stop();
  }
});
