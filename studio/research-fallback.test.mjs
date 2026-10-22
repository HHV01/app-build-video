import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { researchConnection, searchResearch } from './research-search.mjs';
import { createAutoResearch } from './research-auto.mjs';
import { renderResearchPanel } from './public/research-panel.mjs';

const keys = { gemini: 'gemini-key', xai: 'xai-key', groq: 'groq-key', deepseek: 'deepseek-key' };
const gemini = { provider: 'gemini', key: 'gemini-key', model: 'gemini-2.5-flash' };
const grok = { provider: 'xai', key: 'xai-key', model: 'grok-3' };
const quota = detail => Object.assign(Error(detail || 'quota PRIVATE_KEY'), { upstreamStatus: 429 });

test('research candidates are Gemini and Grok in selected order, never DeepSeek or Groq', () => {
  const list = researchConnection({
    model: 'deepseek/deepseek-chat',
    lightModel: 'groq/openai/gpt-oss-120b',
    lightFallbackModels: ['gemini/gemini-3-flash-preview'],
    fallbackModels: ['xai/grok-4'],
  }, keys, {});
  assert.deepEqual(list.map(item => item.provider + '/' + item.model), ['gemini/gemini-3-flash-preview', 'xai/grok-4']);
  assert.equal(list.some(item => ['deepseek', 'groq'].includes(item.provider)), false);

  const defaults = researchConnection({ model: 'deepseek/deepseek-chat' }, { gemini: 'g', xai: 'x' }, {});
  assert.deepEqual(defaults.map(item => item.provider), ['gemini', 'xai']);

  assert.throws(() => researchConnection({ model: 'deepseek/deepseek-chat' }, { deepseek: 'd', groq: 'q' }, {}), /Bước tìm web cần Gemini hoặc Grok/);
  assert.throws(() => researchConnection({ model: 'deepseek/deepseek-chat' }, { deepseek: 'd', groq: 'q' }, {}), error => error.status === 428);
});

test('first candidate quota failure switches to the next candidate and reports the one used', async () => {
  const calls = [];
  const result = await searchResearch([gemini, grok], 'chủ đề', async (url, options) => {
    calls.push({ url, authorization: options.headers.Authorization });
    if (url.includes('googleapis')) throw quota();
    return { output: [{ type: 'web_search_call', content: [] }], citations: ['https://example.org/source-a'], usage: {} };
  }, { cooldowns: new Map(), now: () => 1000 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].authorization, undefined);
  assert.equal(calls[1].authorization, 'Bearer xai-key');
  assert.equal(result.search.provider, 'xai');
  assert.equal(result.search.model, 'grok-3');
  assert.equal(result.search.attempts[0].status, 429);
  assert.equal(JSON.stringify(result).includes('PRIVATE_KEY'), false);
});

test('all quota failures produce the Vietnamese guidance and preserve previous research data', async () => {
  const cooldowns = new Map();
  await assert.rejects(
    searchResearch([gemini, grok], 'chủ đề', async () => { throw quota(); }, { cooldowns, now: () => 5000 }),
    error => {
      assert.equal(error.message, 'Hết hạn mức tìm web của Gemini và Grok. Chờ làm mới, bật thanh toán, hoặc dùng Tự thêm nguồn.');
      assert.equal(error.canAddSources, true);
      assert.equal(error.status, 429);
      return true;
    },
  );
  assert.equal(cooldowns.size, 2);

  const root = path.resolve('tmp');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, 'research-fallback-'));
  const read = {
    search: async connections => ({
      links: [{ url: 'https://alpha.org/a', title: 'Alpha' }, { url: 'https://beta.org/b', title: 'Beta' }],
      suggestions: '',
      usage: {},
      search: { provider: connections[0].provider, model: connections[0].model, attempts: [] },
    }),
    fetchPage: async url => ({ url, html: `<html><head><title>Nguồn lịch sử</title></head><body><article><p>${'Bằng chứng lịch sử chi tiết và đủ dài để đối chiếu. '.repeat(12)}</p></article></body></html>` }),
  };
  const auditResult = sources => ({
    summary: 'Tóm tắt',
    claims: [{
      claim: 'Sự kiện lịch sử được hai nguồn ghi lại.',
      verdict: 'supported',
      evidence: [sources[0], sources[1]].map(source => ({ sourceId: source.id, quote: source.text.slice(0, 80) })),
    }],
    timeline: [], cast: [], questions: [], angles: [],
  });
  const auto = await createAutoResearch({
    directory,
    call: () => {},
    audit: async (_input, sources) => auditResult(sources),
    fetchPage: read.fetchPage,
    search: read.search,
  });
  const done = await auto.start({ topic: 'Chủ đề cũ', title: 'Tiêu đề', angle: '', language: 'vi', sources: [] }, [gemini]);
  let doneJob;
  for (let i = 0; i < 100; i++) {
    doneJob = await auto.get(done.id);
    if (doneJob.status === 'done' || doneJob.status === 'error') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(doneJob.status, 'done');

  const failing = await createAutoResearch({
    directory,
    call: () => {},
    audit: async () => { throw Error('must not audit'); },
    fetchPage: read.fetchPage,
    search: async () => { throw Object.assign(Error('Hết hạn mức'), { status: 429, canAddSources: true }); },
  });
  const failed = await failing.start({ topic: 'Chủ đề mới', title: 'Tiêu đề mới', angle: '', language: 'vi', sources: [] }, [gemini], { refresh: true });
  let failedJob;
  for (let i = 0; i < 100; i++) {
    failedJob = await failing.get(failed.id);
    if (failedJob.status === 'done' || failedJob.status === 'error') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(failedJob.status, 'error');
  assert.equal(failedJob.canAddSources, true);
  const preserved = await auto.get(done.id);
  assert.equal(preserved.status, 'done');
  assert.equal(preserved.result.claims.length, 1);
  await rm(directory, { recursive: true, force: true });
});

test('bad request stops immediately and cooled candidates are skipped until their time expires', async () => {
  let calls = 0;
  await assert.rejects(searchResearch([gemini, grok], 'q', async () => {
    calls++;
    throw Object.assign(Error('bad request'), { upstreamStatus: 400 });
  }, { cooldowns: new Map(), now: () => 0 }));
  assert.equal(calls, 1);

  const cooldowns = new Map([['gemini/gemini-2.5-flash', { until: 1000, status: 429, reason: 'quota' }]]);
  let used = [];
  const call = async url => {
    const gemini = url.includes('googleapis');
    used.push(gemini ? 'gemini' : 'xai');
    return gemini
      ? { candidates: [{ groundingMetadata: { webSearchQueries: ['q'], groundingChunks: [{ web: { uri: 'https://example.org/a' } }] } }] }
      : { output: [{ type: 'web_search_call' }], citations: ['https://example.org/a'] };
  };
  const early = await searchResearch([gemini, grok], 'q', call, { cooldowns, now: () => 500 });
  assert.equal(early.search.provider, 'xai');
  assert.deepEqual(used, ['xai']);

  used = [];
  const later = await searchResearch([gemini, grok], 'q', call, { cooldowns, now: () => 1001 });
  assert.equal(later.search.provider, 'gemini');
  assert.deepEqual(used, ['gemini']);
});

test('research UI keeps the exact quota message and offers manual sources without losing written data', () => {
  const helpers = {
    esc: value => String(value || ''),
    btn: (text, action, style, attributes) => `<button data-action="${action}" ${attributes || ''}>${text}</button>`,
    field: () => '', words: value => String(value || '').split(/\s+/).length, n: value => value,
  };
  const html = renderResearchPanel({}, {
    researchError: 'Hết hạn mức tìm web của Gemini và Grok. Chờ làm mới, bật thanh toán, hoặc dùng Tự thêm nguồn.',
    researchNeedsManual: true,
    researchAutoResult: { search: { provider: 'xai', model: 'grok-3' }, model: 'grok-3', provider: 'xai' },
    sources: [{ id: 's1', name: 'Nguồn cũ', text: 'nội dung cũ' }],
  }, helpers);
  assert.match(html, /Hết hạn mức tìm web của Gemini và Grok/);
  assert.match(html, /data-action="open-manual-sources"/);
  assert.match(html, /Grok · grok-3/);
  assert.match(html, /Nguồn cũ/);
});
