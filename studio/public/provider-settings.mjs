const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', keys: 'https://aistudio.google.com/api-keys', placeholder: 'Dán khóa Gemini' },
  { id: 'xai', name: 'Grok (xAI)', keys: 'https://console.x.ai', placeholder: 'Dán khóa Grok' },
  { id: 'groq', name: 'Groq', keys: 'https://console.groq.com/keys', placeholder: 'Dán khóa Groq' },
  { id: 'deepseek', name: 'DeepSeek', keys: 'https://platform.deepseek.com/api_keys', placeholder: 'Dán khóa DeepSeek' },
];

export function renderProviderSettings(settings, { esc, btn }) {
  const cards = PROVIDERS.map(provider => {
    const configured = settings[provider.id + 'Configured'];
    const current = settings.model?.startsWith(provider.id + '/') ? settings.model.slice(provider.id.length + 1) : '';
    const models = settings.providerModels?.[provider.id] || (current ? [current] : []);
    const modelPicker = (configured || models.length) ? `<label>Model<select id="${provider.id}-model">${models.length
      ? models.map(model => `<option value="${esc(model)}" ${model === current ? 'selected' : ''}>${esc(model)}</option>`).join('')
      : '<option value="">Bấm Tải model sau khi lưu khóa</option>'}</select></label>
      <div class="actions">${btn('Dùng làm model chính', 'use-provider-model', 'small', `data-provider="${provider.id}"`)}${btn('Dùng cho việc nhẹ', 'use-light-model', 'small', `data-provider="${provider.id}"`)}${btn('Tải danh sách model', 'list-provider-models', 'small', `data-provider="${provider.id}"`)}${provider.id === 'deepseek' ? btn('Kiểm tra số dư', 'check-deepseek-balance', 'small') : ''}</div>` : '<p class="muted tiny">Dán khóa rồi bấm Lưu — Studio tự tải model và tự thêm vào dự phòng.</p>';
    return `<section><h4>${provider.name} · <span class="tag ${configured ? 'good' : 'warn'}">${configured ? 'đã nối' : 'chưa nối'}</span></h4>
      <div class="actions"><input id="${provider.id}-key" type="password" autocomplete="new-password" placeholder="${provider.placeholder}">${btn('Lưu khóa ' + provider.name, 'save-provider-key', 'small', `data-provider="${provider.id}"`)}</div>
      ${modelPicker}
      ${provider.id === 'deepseek' ? `<p id="deepseek-balance" class="muted tiny">${esc(settings.providerBalance || 'Số dư chỉ hiển thị, không lưu vào cấu hình.')}</p>` : ''}
      ${provider.id === 'groq' ? `<details><summary>Khóa Groq dự phòng (nâng cao)</summary><div class="actions"><input id="groqBackup-key" type="password" autocomplete="new-password" placeholder="Dán khóa Groq thứ hai">${btn('Lưu khóa dự phòng', 'save-provider-key', 'small', 'data-provider="groqBackup"')}</div><p class="muted tiny">Chỉ tự thử khi khóa chính lỗi 401/403. Hai khóa cùng tài khoản dùng chung hạn mức.</p></details>` : ''}
      <a href="${provider.keys}" target="_blank" rel="noopener">Lấy khóa ${provider.name}</a></section>`;
  }).join('');

  const gateway = `<section><h4>OmniRoute / gateway</h4><p class="muted tiny">${settings.gatewayConfigured ? 'Đã có cấu hình gateway.' : 'Chưa cấu hình gateway.'}</p>
    <label>Model<select id="gateway-model">${(settings.providerModels?.gateway || (settings.model && !/^(gemini|xai|groq|deepseek)\//.test(settings.model) ? [settings.model] : [])).map(model => `<option value="${esc(model)}" ${model === settings.model ? 'selected' : ''}>${esc(model)}</option>`).join('') || '<option value="">Bấm Tải model sau khi cấu hình</option>'}</select></label>
    <div class="actions">${btn('Dùng làm model chính', 'use-provider-model', 'small', 'data-provider="gateway"')}${btn('Dùng cho việc nhẹ', 'use-light-model', 'small', 'data-provider="gateway"')}${btn('Tải danh sách model', 'list-provider-models', 'small', 'data-provider="gateway"')}</div>
    <a href="http://localhost:20128/dashboard/providers" target="_blank" rel="noopener">Mở OmniRoute</a></section>`;

  return `<section class="panel"><h3>Nhà cung cấp AI · chỉ cần dán khóa</h3>
    <p>Dán khóa của dịch vụ bạn có, bấm Lưu. Studio tự tải model, tự chọn model phù hợp và tự chuyển sang dịch vụ khác khi một dịch vụ lỗi hoặc hết hạn mức. Khóa chỉ lưu trên máy và không hiển thị lại. Grok là xAI, khác với Groq.</p>
    <div class="grid2">${cards}${gateway}</div>
    <details><summary>Vì sao không cần chọn nhiều?</summary><p class="muted tiny">Model chính và danh sách dự phòng nằm ở khung bên dưới. Khi lưu một khóa mới, studio thêm model của dịch vụ đó vào dự phòng (tối đa 3) để tự xoay vòng. Lỗi dữ liệu 400/422 dừng ngay; lỗi khóa, hạn mức, quá tải hoặc JSON hỏng sẽ thử model kế tiếp.</p></details>
  </section>`;
}
