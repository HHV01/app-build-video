export const DIRECT_AI_BASES = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  xai: 'https://api.x.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com',
};
const PROVIDER_NAMES = { gemini: 'Gemini', xai: 'Grok (xAI)', groq: 'Groq', deepseek: 'DeepSeek' };
const PROVIDER_ENV = { gemini: 'GEMINI_API_KEY', xai: 'XAI_API_KEY', groq: 'GROQ_API_KEY', deepseek: 'DEEPSEEK_API_KEY' };
const fault = (message, status = 400) => Object.assign(Error(message), { status });
const providerKey = (provider, keys, env) => keys[provider] || env[PROVIDER_ENV[provider]];

export function resolveAIConnection(settings, keys, env, model) {
  const explicit = /^(gemini|xai|grok|groq|deepseek|gateway)\/(.+)$/.exec(model || '');
  if (explicit?.[1] === 'gateway') { settings = { ...settings, aiMode: 'gateway' }; model = explicit[2]; }
  // Old gateway installations used groq/... as a gateway model ID.
  else if ((explicit && (explicit[1] !== 'groq' || settings.aiMode === 'direct' || keys.groq || env.GROQ_API_KEY)) || settings.aiMode === 'direct') {
    const match = /^(gemini|xai|grok|groq|deepseek)\/(.+)$/.exec(model || '');
    if (!match) throw fault('Model trực tiếp phải có dạng gemini/tên-model, xai/tên-model, groq/tên-model hoặc deepseek/tên-model.');
    const provider = match[1] === 'grok' ? 'xai' : match[1];
    const key = providerKey(provider, keys, env);
    if (!key) throw fault(`Chưa có khóa ${PROVIDER_NAMES[provider]}. Nhập tại Kết nối API rồi lưu khóa.`, 428);
    return { provider, base: DIRECT_AI_BASES[provider], key, model: match[2] };
  }
  if (!env.OPENAI_API_KEY) throw fault('Chưa có cấu hình gateway trong .env.', 503);
  const base = (env.OPENAI_BASE_URL || 'http://localhost:20128/v1').replace(/\/+$/, '');
  return { provider: 'gateway', base, key: env.OPENAI_API_KEY, model: /^https:\/\/api\.groq\.com(?:\/|$)/.test(base) ? model.replace(/^groq\//, '') : model };
}

// DeepSeek reasoner exposes its thoughts in reasoning_content and rejects sampling/JSON parameters.
export const isDeepSeekReasoner = model => /^deepseek-(?:reasoner|r1)(?:[-.]|$)/i.test(String(model || ''));
const REASONING_FIELDS = ['reasoning_content', 'reasoning', 'reasoning_details'];

function stripReasoning(value) {
  const message = value?.choices?.[0]?.message;
  if (!message || typeof message !== 'object') return value;
  for (const field of REASONING_FIELDS) delete message[field];
  return value;
}

export async function sendAICompletion(settings, keys, env, model, payload, request, timeout, signal) {
  const connection = resolveAIConnection(settings, keys, env, model);
  const jsonMode = payload?.response_format?.type === 'json_object';
  const requestBody = { ...payload, model: connection.model };
  if (connection.provider === 'gemini' && /^gemini-3(?:\.\d+)?-flash(?:-|$)/.test(connection.model) && requestBody.reasoning_effort === undefined) requestBody.reasoning_effort = 'low';
  if (connection.provider === 'groq' && /^openai\/gpt-oss-/.test(connection.model) && requestBody.reasoning_effort === undefined) requestBody.reasoning_effort = 'low';
  if (connection.provider === 'deepseek' && isDeepSeekReasoner(connection.model)) {
    for (const field of ['response_format', 'temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'logprobs', 'top_logprobs']) delete requestBody[field];
  }
  const call = key => request(connection.base + '/chat/completions', {
    method: 'POST',
    signal,
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  }, timeout);
  const accept = value => {
    const content = value?.choices?.[0]?.message?.content;
    // DeepSeek sometimes returns an empty content while in JSON mode; let the JSON retry drop response_format.
    if (connection.provider === 'deepseek' && jsonMode && !String(content || '').trim()) {
      throw Object.assign(fault('DeepSeek trả nội dung rỗng ở chế độ JSON; thử lại không dùng response_format.', 502), { invalidAIJSON: true, upstreamStatus: 502 });
    }
    return stripReasoning(value);
  };
  try { return accept(await call(connection.key)); } catch (e) {
    const backup = keys.groqBackup || env.GROQ_BACKUP_API_KEY;
    if (connection.provider !== 'groq' || !backup || backup === connection.key || ![401, 403].includes(e.upstreamStatus)) throw e;
    return accept(await call(backup));
  }
}

export async function checkDeepSeekBalance(keys, env, request) {
  const key = providerKey('deepseek', keys, env);
  if (!key) throw fault('Chưa có khóa DeepSeek. Nhập khóa tại Kết nối API rồi thử lại.', 428);
  const base = (env.DEEPSEEK_BASE_URL || DIRECT_AI_BASES.deepseek).replace(/\/+$/, '');
  let value;
  try {
    value = await request(base + '/user/balance', { method: 'GET', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' } }, 15000);
  } catch (e) {
    if (e?.upstreamStatus === 401) throw Object.assign(fault('Khóa DeepSeek không hợp lệ hoặc đã bị thu hồi.', 401), { upstreamStatus: 401 });
    if (e?.upstreamStatus === 402) throw Object.assign(fault('Tài khoản DeepSeek đã hết số dư.', 402), { upstreamStatus: 402 });
    throw e;
  }
  const balances = (Array.isArray(value?.balance_infos) ? value.balance_infos : []).map(row => ({
    currency: String(row?.currency || ''),
    total: String(row?.total_balance ?? ''),
    granted: String(row?.granted_balance ?? ''),
    toppedUp: String(row?.topped_up_balance ?? ''),
  }));
  return { available: value?.is_available !== false, balances, checkedAt: new Date().toISOString() };
}

export function updatedAIKeys(current, input) {
  const updated = { ...current };
  for (const provider of ['gemini', 'xai', 'groq', 'groqBackup', 'deepseek']) if (Object.hasOwn(input, provider)) {
    const key = input[provider];
    if (typeof key !== 'string' || key.length > 1000 || /[\r\n]/.test(key)) throw fault('Khóa API phải là chuỗi một dòng, tối đa 1.000 ký tự.');
    if (key.trim()) updated[provider] = key.trim();
  }
  return updated;
}
