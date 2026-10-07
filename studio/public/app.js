import { researchContext, scriptPartContext } from './research-context.mjs';
import { normalizeScriptProjects } from './script-workflow.mjs';
import { copyWithFallback } from './clipboard.mjs';
import { mergeState, appendActivity } from '/sync.mjs';
import { STAGES, GATES, analyzeChannels, videoPool, analyzeGroups, nextHook, HOOK_TYPES, thumbLineCheck, estimateRead, NO_TEXT_IN_IMAGE, DEFAULT_WPM, REFERENCE_RULE, THUMB_LAYOUTS, THUMB_RULES, findLayout, SUB_LINES } from '/rx.mjs';
import { scriptPlan } from '/production.mjs';
import { renderNiche } from './niche-ui.mjs';
import { runNicheSequence, probeQueriesFor, applySurveyFields } from './niche-workflow.mjs';

let persistedState, state, settings, caps = {}, busy = false, saveQueue = Promise.resolve(), toastTimer;
const app = document.querySelector('#app');
const uid = () => crypto.randomUUID();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = x => Number(x || 0).toLocaleString('vi-VN');
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const labels = ['Chủ đề', 'Tiêu đề + Thumbnail', 'Research', 'Kịch bản'];
const LAST_STEP = labels.length - 1;
const icon = (name, size = 17) => {
  const paths = { home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>', plus: '<path d="M12 4v16M4 12h16"/>', film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>', settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-2-10 1Z"/>', chart: '<path d="M4 3v17h17M8 16v-5M13 16V7M18 16V4"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>' };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.film}</svg>`;
};
const btn = (text, action, cls = '', extra = '') => `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const notice = (text, type = '') => `<div class="notice ${type}" role="note">${text}</div>`;
const empty = (title, desc, action = '') => `<div class="empty"><div class="empty-icon">${icon('book', 30)}</div><strong>${title}</strong><p>${desc}</p>${action}</div>`;
function field(label, binding, value, type = 'text', help = '', placeholder = '') {
  const id = `f-${binding.replace(/[^\w]/g, '-')}`;
  const locked=binding.startsWith('channel.')&&['channel.angle','channel.identity.titlePattern'].includes(binding)&&currentChannel()?.nicheLock;
  return `<div class="field"><label for="${id}">${label}</label>${type === 'textarea' ? `<textarea id="${id}" ${locked?'readonly':''} data-bind="${binding}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="${id}" ${locked?'readonly':''} data-bind="${binding}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`}${help ? `<small>${help}</small>` : ''}</div>`;
}
function select(label, binding, value, options, help = '') {
  const id = `f-${binding.replace(/[^\w]/g, '-')}`;
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-bind="${binding}">${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${help ? `<small>${help}</small>` : ''}</div>`;
}
function toast(message, error = false) {
  const el = document.querySelector('#toast'); el.textContent = message; el.className = error ? 'error' : ''; el.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.display = 'none', error ? 9000 : 3500);
}
async function api(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json(); if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`),{status:res.status}); return data;
}
function updateInPlace(target,source){
  if(Array.isArray(source)){
    const previous=[...target];target.length=0;
    for(let i=0;i<source.length;i++){const value=source[i],old=value?.id?previous.find(x=>x?.id===value.id):previous[i];if(old&&value&&typeof old==='object'&&typeof value==='object'&&Array.isArray(old)===Array.isArray(value)){updateInPlace(old,value);target.push(old);}else target.push(structuredClone(value));}return;
  }
  for(const key of Object.keys(target))if(!(key in source))delete target[key];
  for(const [key,value] of Object.entries(source)){if(target[key]&&value&&typeof target[key]==='object'&&typeof value==='object'&&Array.isArray(target[key])===Array.isArray(value))updateInPlace(target[key],value);else target[key]=structuredClone(value);}
}
function save() {
  const snapshot = structuredClone(state);
  saveQueue = saveQueue.catch(()=>{}).then(async () => {
    document.querySelector('.save-state')?.replaceChildren('Đang lưu…');
    snapshot.revision = state.revision;
    let outgoing=snapshot,result;
    for(let attempt=0;attempt<3;attempt++){
      try{result=await api('/api/state','PUT',outgoing);break;}catch(e){
        if(e.status!==409)throw e;
        const remote=await api('/api/state');const merged=mergeState(persistedState,outgoing,remote);
        if(merged.conflicts.length){localStorage.setItem('tich-unsaved-recovery',JSON.stringify(state));throw Error('Cùng một mục đã được sửa ở hai phiên. Bản đang nhập được giữ trên trang và lưu bản phục hồi; chưa ghi đè. Mục: '+merged.conflicts.slice(0,3).join(', '));}
        outgoing=merged.state;
      }
    }
    if(!result)throw Error('Dữ liệu đang được cập nhật liên tục. Nội dung trên trang vẫn được giữ; thử lưu lại.');
    outgoing.revision=result.revision;
    for(const ref of result.mediaRefs||[]){let target=outgoing;for(const k of ref.path.slice(0,-1))target=target[k];target[ref.path.at(-1)]=ref.url;}
    for(const flow of result.surveyFlows||[]){const survey=outgoing.surveys.find(x=>x.id===flow.id);if(survey){survey.nicheFlow=flow.nicheFlow;survey.lockedNiche=flow.lockedNiche;}}
    const reconciled=mergeState(snapshot,state,outgoing);updateInPlace(state,reconciled.state);state.revision=result.revision;persistedState=structuredClone(outgoing);
    for(const ref of result.mediaRefs||[]){let current=state,original=snapshot;for(const k of ref.path.slice(0,-1)){current=current?.[k];original=original?.[k];}const key=ref.path.at(-1);if(current&&current[key]===original?.[key])current[key]=ref.url;}
    for(const flow of result.surveyFlows||[]){const s=state.surveys.find(x=>x.id===flow.id);if(s){s.nicheFlow=flow.nicheFlow;s.lockedNiche=flow.lockedNiche;}}
    document.querySelector('.save-state')?.replaceChildren('Đã lưu trên máy');
  }).catch(e => { toast(e.message, true); document.querySelector('.save-state')?.replaceChildren('Chưa lưu — giữ trang mở'); throw e; });
  return saveQueue;
}
function activity(text) { appendActivity(state,{ id: uid(), text, at: new Date().toISOString() }); }
function route() { const p = location.hash.slice(1).split('/'); return { page: p[0] || 'home', id: p[1], tab: p[2] || 'overview', project: p[3], step: Number(p[4] || 0) }; }
function go(hash) { if (busy) return toast('Đợi tác vụ hiện tại hoàn tất.'); location.hash = hash; if (location.hash.slice(1) === hash) render(); }
const currentSurvey = () => state.surveys.find(s => s.id === route().id);
const currentChannel = () => state.channels.find(c => c.id === route().id);
const currentProject = () => state.projects.find(p => p.id === route().project);
function boundObject(binding) {
  const [scope, ...keys] = binding.split('.');
  return { object: scope === 'survey' ? currentSurvey() : scope === 'channel' ? currentChannel() : scope === 'project' ? currentProject() : null, keys };
}
function setBinding(binding, value) {
  const { object, keys } = boundObject(binding); if (!object) return;
  let target = object; for (const key of keys.slice(0, -1)) { target[key] ||= {}; target = target[key]; }
  target[keys.at(-1)] = value; save().catch(()=>{});
}
async function run(label, fn) {
  if (busy) return; busy = true;
  const panel = document.querySelector('#busy'); panel.hidden = false; document.querySelector('#busy-label').textContent = label;
  // Ghi nhớ nút vốn đã tắt. Sau khi render() DOM là mới, nút mới đã tự tính đúng trạng thái
  // nên chỉ cần trả lại trạng thái cho node cũ còn nối — không bật tất cả.
  const before = [...document.querySelectorAll('button,input,select,textarea')].map(b => [b, b.disabled]);
  before.forEach(([b]) => { b.disabled = true; });
  // Hàm con thường tự render(). Đếm số lần render để không vẽ lại lần nữa —
  // vẽ lại sẽ xoá mất thông báo vừa hiện.
  const drawn = renderCount;
  try { await fn(); await save(); if (renderCount === drawn) render(); } catch (e) { toast(e.message, true); render(); }
  finally {
    busy = false; panel.hidden = true;
    before.forEach(([b, off]) => { if (b.isConnected) b.disabled = off; });
  }
}
async function generate(action, context) { const r = await api('/api/generate', 'POST', { action, context, jobId: uid() }); activity(`AI · ${action} · ${r.model} · ${n(r.usage?.total_tokens)} token`); if(r.fallback?.used)toast('Model quá tải, đã chuyển sang '+r.model);return r.output; }
function download(name, text, type = 'text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function copy(text) {
 text=String(text??'');if(!text.trim())return toast('Chưa có nội dung để chép.',true);
 const copied=await copyWithFallback(text,{writeText:t=>navigator.clipboard.writeText(t),legacyCopy:t=>{
  const previous=document.activeElement,box=document.createElement('textarea');box.value=t;box.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(box);
  try{box.focus();box.select();return document.execCommand('copy');}finally{box.remove();previous?.focus();}
 }});
 if(copied)return toast('Đã chép vào clipboard.');
 const dialog=document.createElement('dialog');dialog.style.cssText='width:min(850px,90vw);max-height:90vh;background:var(--panel,#18201b);color:inherit;border:1px solid #53665c;border-radius:12px;padding:24px';
 const title=document.createElement('h3');title.textContent='Chép prompt thủ công';
 const help=document.createElement('p');help.textContent='Trình duyệt chặn clipboard. Nội dung đã được chọn: nhấn Ctrl+C, hoặc tải file TXT.';
 const box=document.createElement('textarea');box.value=text;box.readOnly=true;box.setAttribute('aria-label','Nội dung cần chép');box.style.cssText='width:100%;height:45vh';
 const actions=document.createElement('div');actions.className='actions';
 const file=document.createElement('button');file.textContent='Tải prompt TXT';file.onclick=()=>download('prompt.txt',text);
 const close=document.createElement('button');close.textContent='Đóng';close.onclick=()=>dialog.close();
 actions.append(file,close);dialog.append(title,help,box,actions);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();box.focus();box.select();
}
function heading(title, description, action = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`; }
function panel(title, content, action = '') { return `<section class="panel"><div class="panel-head"><h2>${title}</h2>${action}</div>${content}</section>`; }

function shell(content) {
  const r = route(); const c = currentChannel();
  return `<div class="layout"><aside class="sidebar"><div class="brand"><span class="brand-symbol">T</span><div>Tích Studio<small>NICHE & SCRIPT</small></div></div><nav class="nav" aria-label="Điều hướng chính">${btn(`${icon('plus')} Tạo / Trang chủ`, 'home', 'nav-primary')}${btn(`${icon('search')} Tìm ngách`, 'new-survey', r.page === 'niche' ? 'active' : '')}${btn(`${icon('home')} Trang chủ`, 'home', r.page === 'home' ? 'active' : '')}${btn(`${icon('settings')} Kết nối API`, 'settings', r.page === 'settings' ? 'active' : '')}</nav><div class="label">Kênh của bạn · ${state.channels.length}</div><nav class="nav channels-nav">${state.channels.map(ch => btn(`<span class="channel-dot"></span>${esc(ch.name || 'Kênh chưa đặt tên')}`, 'open-channel', ch.id === r.id ? 'active' : '', `data-id="${ch.id}"`)).join('') || '<p class="muted tiny">Chưa có kênh. Tạo kênh đầu tiên từ trang chủ.</p>'}</nav><div class="sidebar-bottom"><nav class="nav">${btn(`${icon('sun')} ${document.body.classList.contains('light') ? 'Dark mode' : 'Light mode'}`, 'theme')}${btn(`${icon('book')} Hướng dẫn sử dụng`, 'guide')}</nav><div class="local-status"><span class="channel-dot"></span> Lưu dữ liệu trên máy của bạn</div></div></aside><main class="main"><header class="topbar"><div class="crumb">Trang chủ ${r.page !== 'home' ? `/ ${c ? esc(c.name) : r.page === 'niche' ? 'Tìm ngách' : r.page === 'create' ? 'Dựng kênh mới' : 'Kết nối API'}` : '/ Studio'}</div><div class="top-actions"><span class="save-state">Đã lưu trên máy</span><span class="tag good">${settings.gateway?.includes('api.groq.com')?'Groq trực tiếp':'Gateway đã cấu hình'}</span>${c ? btn('+ Làm kịch bản mới', 'new-project', 'primary small') : btn('+ Dựng kênh', 'new-channel', 'small')}</div></header><div class="content">${content}</div></main></div>`;
}
function home() {
  const entries = [['search','', 'Tìm ngách','Khảo sát bằng chứng, chia nhóm và chọn góc khai thác.','new-survey','01 · KHÁM PHÁ'],['chart','gold','Dựng kênh mới','Chốt angle, giọng kể, nhận diện và tên kênh.','new-channel','02 · ĐỊNH HÌNH'],['film','blue','Xưởng kịch bản','Từ chủ đề và nguồn nghiên cứu đến kịch bản hoàn chỉnh.','home-workshop','03 · SẢN XUẤT'],['book','purple','Kho dự án','Tiếp tục công việc, kiểm tra các bản đã duyệt.','home-projects','04 · QUẢN LÝ']];
  return `<section class="hero"><div><div class="eyebrow">Ý tưởng có bằng chứng · Câu chuyện có mục đích</div><h1>Tìm đúng ngách.<br>Kể một câu chuyện đáng xem.</h1><p>Một bàn làm việc cho cả kênh: nghiên cứu nội dung, xây bản sắc và đưa mỗi ý tưởng qua từng bước sản xuất.</p>${btn(`Bắt đầu tìm ngách ${icon('arrow',14)}`, 'new-survey', 'primary')}</div><div class="hero-art"><div class="orbit"><div class="orbit-center">${icon('film',43)}</div><div class="orbit-pill one">Nhu cầu → Angle</div><div class="orbit-pill two">Kịch bản → Cảnh</div></div></div></section><div class="cards">${entries.map(([i,clr,t,d,a,l]) => `<button class="entry-card" data-action="${a}"><div class="card-art ${clr}"><div class="art-lines"></div><div class="art-icon">${icon(i,35)}</div></div><div class="card-copy"><div class="eyebrow tiny">${l}</div><h3>${t}</h3><p>${d}</p></div></button>`).join('')}</div><div class="section-top"><h2>Kênh của bạn <span class="muted tiny">${state.channels.length} kênh</span></h2>${btn('+ Tạo kênh mới','new-channel','small')}</div>${state.channels.length ? `<div class="grid3">${state.channels.map(c => `<article class="channel-card"><div class="channel-title"><div class="avatar">${esc((c.name||'T')[0])}</div><div><h3>${esc(c.name||'Kênh chưa đặt tên')}</h3><span class="muted tiny">${esc(c.niche||'Chưa chốt ngách')}</span></div></div><div class="mini-stats"><div><strong>${state.projects.filter(p=>p.channelId===c.id).length}</strong><span>DỰ ÁN</span></div><div><strong>${c.ideas?.length||0}</strong><span>CHỦ ĐỀ</span></div></div>${btn('Vào kênh →','open-channel','small',`data-id="${c.id}"`)}</article>`).join('')}</div>` : empty('Studio đang chờ kênh đầu tiên','Bạn có thể tìm ngách từ dữ liệu, hoặc nhập chủ đề đã có để bắt đầu.',btn('Dựng kênh đầu tiên','new-channel','primary'))}<div class="section-top"><h2>Khảo sát đang làm</h2></div>${state.surveys.length ? state.surveys.map(s=>`<div class="topic-row"><span>${icon('search')}</span><div class="topic-info"><h3>${esc(s.name||'Khảo sát mới')}</h3><p>${s.videos?.length || 0} video · ${s.groups?.length||0} nhóm · ${s.language==='en'?'Tiếng Anh':'Tiếng Việt'}</p></div>${btn('Tiếp tục','open-survey','small',`data-id="${s.id}"`)}</div>`).join('') : '<p class="muted">Chưa có khảo sát. Bắt đầu ở Tìm ngách.</p>'}`;
}
const SURVEY_STEPS = ['Bước 0 · Chọn sân','Bước 1 · Kênh chỉ đường','Bước 2 · Kênh làm được','Bước 3 · Nhóm & chủ đề'];
function gateOf(s) { return s?.gate || 'vua'; }
function niche(){const s=currentSurvey();return s?renderNiche(s,{heading,panel,notice,field,select,btn,esc,n}):empty('Khảo sát này không còn trên server','Tải lại trang hoặc bắt đầu khảo sát mới để tiếp tục.',btn('Bắt đầu khảo sát mới','new-survey','primary'));}
const nicheLabels={field:'Lưu thị trường',template:'Phân tích tiêu đề của kênh',shelf:'Tìm và kiểm tra kho kênh',groups:'Phân nhóm chủ đề',probe:'Kiểm tra nhu cầu',topics:'Kiểm tra 20 chủ đề'};
function templateRequest(s, choose=false){return {mode:s.nicheMode||'import',channel:s.leadChannel,angle:s.angle,confirmComplete:s.completeImport===true,suggestAngles:!choose,...(choose?{template:s.templateChoice||s.nicheFlow?.template?.value}:{})};}
function shelfRequest(s){return {mode:s.nicheMode||'import',confirmComplete:s.completeImport===true,extraChannels:(s.extraChannelsText||'').split('\n').map(x=>x.trim()).filter(Boolean)};}
async function applyNicheStage(stage, extras={}) {
    const s=currentSurvey(), previousGroup=s.nicheFlow?.groups?.chosen;
    document.querySelector('#busy-label').textContent=nicheLabels[stage]+'…';
    await save();
    let result;
    saveQueue=saveQueue.catch(()=>{}).then(async()=>{result=await api('/api/niche/'+stage,'POST',{surveyId:s.id,revision:state.revision,...extras});state.revision=result.revision;persistedState.revision=result.revision;const old=persistedState.surveys.findIndex(x=>x.id===s.id);persistedState.surveys[old]=structuredClone(result.survey);});
    await saveQueue;
    state.revision=result.revision;
    const updated=result.survey, current=updated.nicheFlow[stage];
    updated.nicheStep=STAGES.indexOf(stage);
    if(current.passed && (stage!=='template'||Object.hasOwn(extras,'template')) && (stage!=='groups'||current.chosen))updated.nicheStep=Math.min(5,updated.nicheStep+1);
    if(stage==='template'&&current.passed){updated.template=current.value;updated.templateChoice=current.value;}
    if(stage==='groups'&&current.chosen){
      updated.niche=current.groups.find(g=>g.id===current.chosen)?.name||updated.niche;
      updated.probeMode ||= updated.nicheMode||'import';
      if(previousGroup!==current.chosen||updated.probeQueries==null)updated.probeQueries=(current.suggestedQueries||[]).join('\n');
    }
    if(stage==='topics'&&current.passed)updated.topicDraft=current.chosen.join('\n');
    state.surveys[state.surveys.findIndex(x=>x.id===s.id)]=updated;
    delete updated.nicheError;
    await save();
    return current;
}
async function nicheAction(stage, extras={}, next=[]) {
  await run(nicheLabels[stage]+'…',async()=>{
    let active=stage;
    try{
      const result=await runNicheSequence([{stage,extras},...next],async(st,body)=>{active=st;return applyNicheStage(st,body);});
      toast(result.passed?'Đã kiểm tra và lưu kết quả.':'Chưa đủ điều kiện. Xem lý do và cách bổ sung bên dưới.',!result.passed);
    }catch(e){currentSurvey().nicheError={stage:active,message:e.message};await save();throw e;}
  });
}
// Kho gộp: chỉ video của các kênh đang tick, xếp theo bải số so với trung vị chính kênh đó.
function poolTable(s, gate) {
  const pool = videoPool(s.videos, { gate, channelIds: s.selectedChannels });
  const byId = new Map((s.groups||[]).map(x => [x.id, x.name]));
  const groupOf = id => { for (const x of s.groups||[]) if (x.videoIds.includes(id)) return byId.get(x.id); return ''; };
  const body = pool.map(v => `<tr><td class="video-title">${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>`:esc(v.title)}<small>${esc(v.channelTitle)} · ${v.ageDays} ngày trước</small></td><td>${n(v.views)}</td><td>${v.multiple==null?'—':`×${v.multiple.toFixed(2)}`}</td><td>${esc(groupOf(v.id))||'—'}</td></tr>`).join('');
  return panel(`Kho gộp · ${pool.length} video từ ${s.selectedChannels.length} kênh đã chọn`, `<div class="table-wrap"><table><thead><tr><th>Video</th><th>View</th><th>Bải số</th><th>Nhóm</th></tr></thead><tbody>${body||'<tr><td colspan="4" class="muted">Chưa tick kênh nào, hoặc kho video rỗng.</td></tr>'}</tbody></table></div><p class="muted tiny">Bải số = view chia cho trung vị của chính kênh đó. Không có bước này thì kênh to nổi trộn hết, và bạn ra là có kênh chờ chứ không phải chờ đệ.</p>`);
}
function surveyClose(s) {
  const x = analyzeGroups(s.groups, s.videos, { gate: gateOf(s) }).groups.find(r => r.id === s.selectedGroup);
  return panel('Chốt ngách và angle của bạn', [
    x ? notice(`Nhóm đã chọn: <strong>${esc(x.name)}</strong> · ${x.videos} video · ${x.channels} kênh`) : notice('Chưa chọn nhóm. Bạn có thể chốt ngách tự nhập, nhưng cần kiểm chứng trước khi sản xuất nhiều video.', 'warning'),
    `<div class="grid2">${field('Ngách cụ thể','survey.niche',s.niche,'textarea','Khán giả + vấn đề lặp lại + cách giải thích.')}${field('Khán giả chính','survey.audience',s.audience,'textarea','','Người đi làm muốn hiểu vì sao thu nhập tăng nhưng vẫn thiếu tiền')}</div>`,
    field('Angle · câu hỏi xuyên suốt','survey.angle',s.angle,'textarea','Angle của bạn cần khác angle của kênh mẫu.','Một lựa chọn tưởng giúp sống tốt hơn có thể khiến mình mất tự do như thế nào?'),
    field('Điểm khác biệt của mình','survey.difference',s.difference,'textarea','','Tình huống Việt Nam, nhân vật Tích, câu chuyện ngắn với hậu quả cụng'),
    `<div class="actions">${btn('Dựng kênh từ kết quả này','survey-to-channel','primary')}${btn('Xuất hồ sơ khảo sát','export-survey')}</div>`
  ].join(''));
}
const median = values => { const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null; };
function channelStats(s){return [...new Set(s.videos.map(v=>v.channelId))].map(id=>({id,name:s.videos.find(v=>v.channelId===id).channelTitle,videos:s.videos.filter(v=>v.channelId===id)}));}
function channelTable(s){return `<div class="table-wrap"><table><thead><tr><th>Kênh</th><th>Video mẫu</th><th>Nguồn dữ liệu</th></tr></thead><tbody>${channelStats(s).map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${c.videos.length}</td><td>${s.videos.find(v=>v.channelId===c.id).source==='youtube'?'YouTube API':'Nhập thủ công'}</td></tr>`).join('')}</tbody></table></div>`;}
function videoTable(s){return `<div class="table-wrap"><table><thead><tr><th>Video</th><th>View</th><th>Nền</th><th>Bội số</th><th>Nhóm</th></tr></thead><tbody>${s.videos.map(v=>`<tr><td class="video-title">${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>`:esc(v.title)}<small>${esc(v.channelTitle)} · ${new Date(v.publishedAt).toLocaleDateString('vi-VN')} · ${v.format==='short'?'Shorts':'Dài'}</small></td><td>${n(v.views)}</td><td>${v.baseline==null?'—':n(v.baseline)}</td><td>${v.multiple==null?'—':`×${v.multiple.toFixed(2)}${v.baselineApproximate?' *':''}`}</td><td><select aria-label="Nhóm của ${esc(v.title)}" data-video-group="${esc(v.id)}">${(s.groups||[]).map(g=>`<option value="${g.id}" ${g.videoIds.includes(v.id)?'selected':''}>${esc(g.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><p class="muted tiny">* Nền gần đúng: chưa đủ mẫu gần tuổi đăng. View là ảnh chụp tại thời điểm thu thập, không phải tốc độ tăng.</p>`;}

const CHANNEL_TABS = ['Nguồn tham khảo', 'Framework', 'Góc nhìn', 'Khung', 'Lối kể', 'Kỹ thuật'];
// Khung hook hiện 4 kiểu đã xác minh, bấm mới xem 6 kiểu còn lại.
function hookTable(c, expanded) {
  const rows = expanded ? HOOK_TYPES : HOOK_TYPES.slice(0, 4);
  return `<div class="table-wrap"><table><thead><tr><th>KHUÔN</th><th>CÁCH MỞ 15 GIÂY ĐẦU</th><th>Nguồn</th></tr></thead><tbody>${rows.map(h => `<tr><td><code>${esc(h.id)}</code></td><td>${esc(h.how)}</td><td>${h.verified ? '<span class="tag good">đã xác minh</span>' : '<span class="tag">mặc định Studio</span>'}</td></tr>`).join('')}</tbody></table></div>${expanded || HOOK_TYPES.length <= 4 ? '' : btn(`Xem ${HOOK_TYPES.length - 4} khung còn lại`, 'channel-expand')}<p class="muted tiny">Mỗi video lấy một kiểu khác nhau để không bị lặp. Kiểu Studio gợi ý cho video tiếp theo: <strong>${esc(nextHook((c.projects || []).map(x => x.hookType)).id)}</strong>.</p>`;
}
function channelCreate(){const c=currentChannel();if(!c)return empty('Không tìm thấy kênh','Tạo kênh mới ở Trang chủ.');const tab=Math.min(CHANNEL_TABS.length-1,Number(c.createStep||0)),expanded=!!c.createExpand;const layout=findLayout(c.thumbnailLayout);let body='';
if(tab===0)body=panel('Nguồn tham khảo',`${notice(esc(REFERENCE_RULE))}<div class="actions">${btn('Học kênh khác','identity','primary')}</div><p class="muted tiny"></p>${field('Kênh mẫu học khuôn tiêu đề · link','channel.formatReference',c.formatReference,'text','','Ví dụ: https://www.youtube.com/@genius_history01')}${field('Kênh học giọng kể · mỗi dòng một link','channel.voiceReferences',c.voiceReferences,'textarea','Có thể là kênh khác hoặc chính kênh bạn.')}${field('Transcript hoặc ghi chú nguồn','channel.referenceText',c.referenceText,'textarea','Dán transcript có quyền sử dụng hoặc ghi chú của bạn. Chỉ có link thì Studio chưa đọc được giọng hay hình ảnh.','[00:00] …')}<div class="actions">${btn('Sang Framework →','create-next','primary')}</div>`);
if(tab===1)body=panel('Framework · khuôn tiêu đề và khung hook',`${notice('Khuôn tiêu đề là khuôn kênh mẫn dùng liên tục. Angle mô tả cách khuôn đó kể chuyện — lấy từ kịch bản cũ, đừng tự nghĩ.')}${field('Khuôn tiêu đề · 1 khuôn, kịch bản bám theo','channel.identity.titlePattern',c.identity?.titlePattern,'textarea','Ví dụ: entire history of')}${field('Angle của khuôn','channel.frameworkAngle',c.frameworkAngle||'','textarea','Thực thể này đã hình thành, phình to lên, lên đỉnh cao rồi biến dị hóa rồi sụp đổ — kể trọn từ đầu đến cuối.')}${field('Độ dài Angle còn trống · số từ','channel.frameworkAngleWords',c.frameworkAngleWords||'','number','Độ dài thường gặp của một Angle; điền sau khi đọc vài kịch bản cũ.')}${panel('Khung hook 15 giây đầu — 10 kiểu xoay vòng',hookTable(c,expanded))}<div class="actions">${btn('Sang Góc nhìn →','create-next','primary')}</div>`);
if(tab===2)body=panel('Góc nhìn của bạn',`${notice('Ba ô này là ngách thật của kênh bạn, không phải của kênh mẫu. Kênh mẫu chỉ cho bạn khuôn và cách kể.')}<div class="grid2">${field('Ngách cụ thể','channel.niche',c.niche,'textarea','Khán giả + vấn đề lặp lại + cách giải thích.')}${field('Khán giả chính','channel.audience',c.audience,'textarea','','Người đi làm muốn hiểu vì sao thu nhập tăng nhưng vẫn thiếu tiền')}</div>${field('Angle riêng của kênh','channel.angle',c.angle,'textarea','Phải khác angle của kênh mẫu, nếu không bạn chỉ làm bản sao.')}${field('Điểm khác biệt của mình','channel.difference',c.difference||'','textarea','Tình huống Việt Nam, nhân vật Tích, câu chuyện ngắn với hậu quả cụ thể.')}${panel('Chốt check viral',`<p class="muted tiny">Chốt video mẫu của nhóm bạn đã chọn và viết: cảnh mở đầu của video đó là gì, và câu hỏi nào chưa ai trả lời. Video của bạn phải chèn vào đúng chỗ đó.</p>${field('Video mẫu chốt','channel.viralCheck',c.viralCheck||'','textarea','Dán link video mẫu đã chọn ở bước Tìm niche.')}<div class="actions">${btn('Sang Khung →','create-next','primary')}</div>`)}`);
if(tab===3)body=panel('Khung thumbnail',`${notice('Chọn một khung rồi dùng lại cho cả kênh. Đổi khung giữa chừng làm người xem không nhận ra video của cùng một kênh.')}<p class="muted tiny">Thư viện của Studio có ${THUMB_LAYOUTS.length} khung. Quy tắc chữ: 1–4 tiếng, tối đa ${THUMB_RULES.maxChars} ký tự, và phải nằm nguyên vẹn trong tiêu đề.</p><div class="grid2">${THUMB_LAYOUTS.map(l => `<button class="choice ${c.thumbnailLayout===l.id?'selected':''}" data-action="choose-layout" data-value="${l.id}"><h3>${esc(l.name)}</h3><p><strong>Chữ:</strong> ${esc(l.text)}</p><p><strong>Cảnh:</strong> ${esc(l.scene)}</p><p><strong>Dòng phụ:</strong> ${esc(l.sub)}</p><span class="chosen">${c.thumbnailLayout===l.id?'✓ Khung đang dùng':'Dùng khung này'}</span></button>`).join('')}</div>${panel('Khung đang dùng',`<div class="layout-preview"><span></span><b>CHỮ</b></div><p class="muted tiny">${esc(layout.name)} · ${esc(layout.text)}</p>`)}<div class="actions">${btn('Sang Lối kể →','create-next','primary')}</div>`);
if(tab===4)body=panel('Lối kể và hook',`${field('Giọng văn','channel.identity.voice',c.identity?.voice,'textarea','Cách diễn đạt và nhịp kể trong kịch bản.')}${field('Khuôn hook','channel.identity.hook',c.identity?.hook,'textarea')}${btn('Sang Kỹ thuật →','create-next','primary')}`);
if(tab===5)body=panel('Ngôn ngữ và tên kênh',`${select('Ngôn ngữ kênh','channel.language',c.language,[['vi','Tiếng Việt'],['en','English']])}${btn('Rút bản sắc và gợi ý tên','identity','primary')}${btn('Hoàn tất · vào kênh','finish-channel','primary')}${panel('Đặt tên kênh',`${field('Tên kênh','channel.name',c.name)}${field('Mô tả ngắn','channel.tagline',c.tagline)}${(c.identity?.names||[]).map((x,i)=>btn(esc(x.name),'choose-name','',`data-index="${i}"`)).join('')}`)}`);
return heading('Dựng kênh mới',`${esc(c.niche||'Chưa chốt ngách')} · 6 mục, mỗi mục sửa lại được bất cứ lúc nào.`)+`<div class="tabs">${CHANNEL_TABS.map((t,i)=>btn(t,'create-step',tab===i?'active':'',`data-step="${i}"`)).join('')}</div><div>${body}</div>`;}
function channelView(){const c=currentChannel();if(!c)return empty('Không tìm thấy kênh','Quay lại Trang chủ.');const r=route();const tabs=['overview','identity','roadmap','history'];let content='';
 if(r.tab==='workshop')return workshop(c);
 if(r.tab==='overview'){const ps=state.projects.filter(p=>p.channelId===c.id);content=panel('Bàn điều khiển kênh',`${notice(`Angle: ${esc(c.angle||'Chưa chốt. Mở Bản sắc để nhập angle.')}`)}<div class="flow-track">${[['Ngách',!!c.niche],['Angle',!!c.angle],['Giọng kể',!!c.identity?.voice],['Lộ trình',!!c.ideas?.length],['Video đầu',!!ps.length]].map(([l,done],i)=>`<div class="flow-node ${done?'done':''}"><span>${done?'✓':i+1}</span>${l}</div>`).join('')}</div><div class="actions">${btn('Bản sắc và lối kể','channel-tab','',`data-tab="identity"`)}${btn('Lập lộ trình 30 chủ đề','ideas','primary')}${btn('Làm kịch bản mới','new-project')}</div>`)+`<div class="grid2">${panel('Kịch bản đang làm',ps.length?ps.map(p=>`<div class="topic-row"><div class="topic-info"><h3>${esc(p.topic||'Video chưa đặt chủ đề')}</h3><p>Bước ${p.step+1}/${labels.length} · ${p.minutes} phút · ${p.done?'Đã xong kịch bản':'Đang làm'}</p></div>${btn('Tiếp tục','open-project','small',`data-id="${p.id}"`)}</div>`).join(''):empty('Chưa có video','Chọn chủ đề từ Lộ trình hoặc tự nhập ở Xưởng.'))}${panel('Kênh đã có gì',`<p><strong>Giọng kể</strong><br><span class="muted">${esc(c.identity?.voice||'Chưa có')}</span></p><p><strong>Nhân vật</strong><br><span class="muted">${c.type==='mascot'?'Mascot cố định':'Theo chủ đề'} · ${c.characterRef?'Có reference':'Chưa nạp reference'}</span></p><p><strong>Chất vẽ</strong><br><span class="muted">${esc(c.style||'Chưa chốt')}</span></p>`)}</div>`;}
 if(r.tab==='identity')content=identityView(c);
 if(r.tab==='roadmap')content=panel('Lộ trình · danh sách chủ đề',`${notice('AI đề xuất chủ đề; bạn sửa tên và chọn thứ tự trước khi làm video. Danh sách không phải dự báo lượt xem.')}<div class="actions">${btn('Tạo 30 ý tưởng từ hồ sơ kênh','ideas','primary')}${btn('+ Chủ đề tự nhập','add-idea')}</div>${(c.ideas||[]).map((x,i)=>`<div class="topic-row"><span class="index">${i+1}</span><div class="topic-info"><h3>${esc(x.title)}</h3><p>${esc(x.question||x.angle||'Ý tưởng tự nhập')}</p></div>${btn('Sửa','edit-idea','small',`data-index="${i}"`)}${btn('Làm video','idea-project','small',`data-index="${i}"`)}</div>`).join('')||empty('Chưa có lộ trình','Tạo đề xuất hoặc thêm chủ đề bạn đã chuẩn bị.')}`);
 if(r.tab==='history')content=panel('Lịch sử thao tác',(Array.isArray(state.activity)?state.activity:[]).map(a=>`<div class="topic-row"><div class="topic-info"><h3>${esc(a.text)}</h3><p>${new Date(a.at).toLocaleString('vi-VN')}</p></div></div>`).join('')||'<p class="muted">Chưa có hoạt động.</p>');
 return heading(esc(c.name||'Kênh chưa đặt tên'),esc(c.niche||'Chưa có mô tả ngách'))+`<div class="tabs">${[['overview','Tổng quan'],['identity','Bản sắc'],['roadmap','Lộ trình'],['history','Lịch sử']].map(([v,t])=>btn(t,'channel-tab',r.tab===v?'active':'',`data-tab="${v}"`)).join('')}</div>`+content;
}
function identityView(c){return panel('Bản sắc kênh',`${field('Ngách','channel.niche',c.niche)}${field('Angle riêng','channel.angle',c.angle,'textarea')}${field('Giọng văn','channel.identity.voice',c.identity?.voice,'textarea')}${field('Khuôn hook','channel.identity.hook',c.identity?.hook,'textarea')}${field('Khuôn tiêu đề','channel.identity.titlePattern',c.identity?.titlePattern)}${field('Nguồn transcript / ghi chú','channel.referenceText',c.referenceText,'textarea')}`)+panel('Khung thumbnail dùng chung',`${select('Bố cục','channel.thumbnailLayout',c.thumbnailLayout,THUMB_LAYOUTS.map(l=>[l.id,l.name]))}${field('Quy tắc chữ và màu','channel.thumbnailRule',c.thumbnailRule,'textarea')}`);}

function projectTabs(p){return labels.map((name,i)=>btn(`<span class="num">${p.approved?.includes(i)?'✓':i+1}</span>${name}`,'project-step',`${p.step===i?'active':''} ${p.approved?.includes(i)?'done':''}`,`data-step="${i}"`)).join('');}
function projectContext(c,p){return {...researchContext(p),nicheLock:c.nicheLock,includeCTA:Boolean(p.includeCTA),topic:p.topic,language:c.language,minutes:Number(p.minutes),angle:c.angle,audience:c.audience,niche:c.niche,voice:c.identity?.voice,titlePattern:c.identity?.titlePattern,hookPattern:c.identity?.hook,style:c.identity?.style,structure:p.structure,packaging:p.packaging?.[p.selectedPackaging||0],sources:p.sources||[],outline:p.outline||[],narration:p.narration||'',researchAngle:p.researchAngle||''};}
function workshop(c){const p=currentProject();if(!p)return heading('Xưởng kịch bản','Chọn một dự án hoặc bắt đầu video mới.')+empty('Video kế tiếp','Một chủ đề, một lời hứa rõ và một câu chuyện có tiến triển.',btn('+ Làm kịch bản mới','new-project','primary'));let body='';
if(p.step===0)body=panel('Video kế tiếp',`${field('Chủ đề video','project.topic',p.topic,'text','','Ví dụ: Vì sao tăng lương rồi vẫn hết tiền?')}<div class="grid3">${field('Thời lượng dự kiến · phút','project.minutes',p.minutes,'number','Ước lượng độ dài kịch bản.')}${select('Cấu trúc câu chuyện','project.structure',p.structure,[['consequence','Một quyết định và hậu quả'],['two-paths','Hai con đường'],['investigation','Điều tra nghịch lý'],['linked-traps','Các bẫy liên kết']])}</div>${notice(`Kênh: ${esc(c.name)} · ${c.language==='en'?'English':'Tiếng Việt'} · ${esc(c.identity?.voice||'Chưa chọn lối kể')}`)}<div class="actions">${btn('Chốt chủ đề → tiêu đề & thumbnail','approve-next','primary')}</div>`);
if(p.step===1)body=panel('Tiêu đề + Thumbnail',`${notice('Chọn lời hứa trước khi viết dài. Mở đầu và nội dung cần trả lời đúng điều tiêu đề hứa.')}<div class="actions">${btn('Đề xuất 16 phương án','packaging','primary')}${btn('Thêm phương án tự viết','manual-packaging')}${p.packaging?.length?btn('Hủy bộ tiêu đề','discard-packaging','danger'):''}</div><div class="grid3">${(p.packaging||[]).map((x,i)=>{const chk=thumbLineCheck(x.overlay,x.title);const hook=HOOK_TYPES.find(h=>h.id===x.hookType);return `<button class="choice ${i===p.selectedPackaging?'selected':''}" data-action="choose-packaging" data-index="${i}"><h3>${esc(x.title)}</h3><p>${esc(x.thumbnailVisual||x.thumbnail||'')}</p><p><strong>Chữ trên thumbnail:</strong> ${esc(x.overlay||'—')} ${chk.wordsOk&&chk.charsOk?'':'<span class="tag warn">quá giới hạn</span>'}</p><p class="muted tiny">${esc(x.flavour||'')}${hook?` · ${esc(hook.how)}`:''}</p><span class="chosen">${i===p.selectedPackaging?'✓ Chờ bạn duyệt':'Chọn phương án'}</span></button>`;}).join('')}</div>${p.packaging?.length?`${field('Tiêu đề đã chọn','project.packaging.'+(p.selectedPackaging||0)+'.title',p.packaging[p.selectedPackaging||0].title)}${field('Hook mở đầu','project.packaging.'+(p.selectedPackaging||0)+'.hook',p.packaging[p.selectedPackaging||0].hook,'textarea')}${field('Lời hứa cuối video','project.packaging.'+(p.selectedPackaging||0)+'.promise',p.packaging[p.selectedPackaging||0].promise,'textarea')}<div class="actions">${btn('Duyệt → Research','approve-next','primary')}</div>`:''}`)+thumbnailEditor(c,p);
if(p.step===2)body=panel('Research · nguồn và claim',`${notice('AI đọc phần text bạn cung cấp. URL đơn độc chưa có nội dung không được xem là đã kiểm chứng.','warning')}${field('Tên nguồn','project.sourceDraftName',p.sourceDraftName,'text','','Báo cáo, transcript hoặc ghi chú nghiên cứu')}${field('URL nguồn · tùy chọn','project.sourceDraftUrl',p.sourceDraftUrl,'url')}${field('Nội dung nguồn','project.sourceDraftText',p.sourceDraftText,'textarea')}<div class="actions">${btn('Thêm nguồn','add-source')}${btn('Kiểm kê claim từ nguồn','research','primary')}</div>${(p.sources||[]).map(s=>`<div class="topic-row"><div class="topic-info"><h3>${esc(s.name)}</h3><p>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a> · `:''}${n(words(s.text))} từ · <button class="btn btn-sm" data-action="remove-source" data-id="${s.id}">Xoá</button></p></div></div>`).join('')}${notice('Càng nhiều nguồn độc lập thì AI càng đối chiếu được claim chính xác; nên thêm ít nhất 2 nguồn cho một chủ đề.','warning')}${field('Tóm tắt nghiên cứu','project.researchSummary',p.researchSummary||'','textarea','','Tóm tắt các phát hiện chính từ nguồn')}${field('Timeline sự kiện','project.researchTimeline',p.researchTimeline||'','textarea','','Mỗi dòng: Ngày | Sự kiện | sourceId')}${field('Số liệu chính','project.researchFacts',p.researchFacts||'','textarea','','Mỗi dòng: Số liệu | sourceId | supported/needs_check')}${field('Chi tiết cảm quan','project.researchSensory',p.researchSensory||'','textarea','','Mô tả hình ảnh, âm thanh, cảm giác')}${field('Nhân vật chính','project.researchCast',p.researchCast||'','textarea','','Liệt kê nhân vật và vai trò')}<div class="table-wrap"><table><thead><tr><th>Claim</th><th>Nguồn</th><th>Trạng thái</th><th>Việc cần làm</th></tr></thead><tbody>${(p.claims||[]).map(x=>`<tr><td>${esc(x.claim)}</td><td>${esc(x.sourceId||'Chưa có')}</td><td><span class="tag ${x.status==='supported'?'good':'warn'}">${x.status==='supported'?'AI đối chiếu text':'Cần kiểm chứng'}</span></td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table></div><div class="section-title">Góc nhìn kể chuyện</div><div class="actions">${(p.researchAngles||[]).map((a,i)=>`<button class="btn ${p.researchAngle===a?'primary':''}" data-action="select-angle" data-index="${i}">${esc(a)}</button>`).join('')}${field('Góc nhìn tùy chỉnh','project.researchAngleCustom',p.researchAngleCustom||'','text')}</div><div class="actions">${btn('Đã xem nguồn → Kịch bản','approve-next','primary')}</div>`);
if(p.step===3){const read=estimateRead(words(p.narration)),target=Math.round(Number(p.minutes||0)*DEFAULT_WPM),gap=read.words-target;body=panel('Dàn ý và kịch bản',`${notice(`Mỗi đoạn cần có thông tin mới, một thay đổi hoặc câu trả lời. Độ dài dưới đây là ước lượng theo tốc độ đọc của kênh (${DEFAULT_WPM} từ/phút), thời lượng chỉ là dự kiến.`)}<div class="actions"><label><input type="checkbox" data-bind="project.includeCTA" ${p.includeCTA?'checked':''}> Thêm CTA ở cuối (tùy chọn)</label>${btn('Dựng dàn ý','outline')}${btn('Viết script từ dàn ý','script','primary')}${btn('Chép narration','copy-script')}</div>${(p.outline||[]).map((x,i)=>`<details class="help-details"><summary>${i+1}. ${esc(x.title)}</summary><p>${esc(x.question)}<br>${esc(x.story)}<br><strong>Thông tin mới:</strong> ${esc(x.insight)}</p></details>`).join('')}${field('Narration · chỉnh trực tiếp','project.narration',p.narration,'textarea')}<div class="grid3"><div class="stat"><strong>${n(read.words)}</strong><span>TỪ ĐÃ VIẾT</span></div><div class="stat"><strong>${read.label}</strong><span>ĐỌC Ở ${DEFAULT_WPM} TỪ/PHÚT</span></div><div class="stat"><strong>${n(target)}</strong><span>MỤC TIÊU CHO ${Number(p.minutes)||0} PHÚT</span></div></div><p class="muted tiny" id="word-count">${read.words?`Còn ${gap>0?'dư':'thiếu'} ${n(Math.abs(gap))} từ so với mục tiêu.`:'Chưa có lời kể.'} Ước lượng này chỉ để cân độ dài kịch bản.</p>${(p.editorNotes||[]).map(t=>notice(esc(t),'warning')).join('')}<div class="actions">${btn('Hoàn tất kịch bản','finish-script','primary')}${btn('Copy toàn bộ kịch bản','copy-script')}${btn('Xuất kịch bản TXT','export-script')}${btn('Xuất Markdown','export-markdown')}</div>`);}
return heading(esc(p.topic||'Video mới'),`${esc(c.name)} · bước ${p.step+1}/${labels.length} · chỉnh sửa được ở mỗi bước`)+`<div class="workspace"><nav class="work-nav" aria-label="Các bước sản xuất">${projectTabs(p)}</nav><div>${body}</div></div>`;}
// Khối đăng YouTube. Chỉ hiện khi đã nối tài khoản; mặc định để riêng tư cho an toàn.
function thumbnailEditor(c,p){const selected=p.packaging?.[p.selectedPackaging||0];return panel('Khung thumbnail · chữ ghép chính xác',`<div class="thumbnail-editor"><div><canvas id="thumbnail" class="thumbnail-canvas" width="1280" height="720" aria-label="Bản xem trước thumbnail"></canvas><p class="muted tiny">Preview minh họa bố cục. Nạp ảnh tự tạo để xuất bản dùng thật. Groq chỉ tạo prompt, không tạo ảnh.</p></div><div>${select('Bố cục','project.thumbnailLayout',p.thumbnailLayout||c.thumbnailLayout,THUMB_LAYOUTS.map(l=>[l.id,l.name]))}${field('Chữ chính (overlay)','project.thumbnailText',p.thumbnailText||selected?.overlay||'','text',`1–4 tiếng, tối đa ${THUMB_RULES.maxChars} ký tự, phải nằm nguyên vẹn trong tiêu đề.`)}<div class="field"><label for="thumb-visual">Mô tả cảnh (English)</label><input id="thumb-visual" type="text" data-bind="project.thumbnailVisual" value="${esc(p.thumbnailVisual||'')}" placeholder="Ví dụ: Close up of a shocked face, bright lighting"></div>${field('Dòng phụ','project.thumbnailSub',p.thumbnailSub||'')}<div class="field"><label for="thumb-image">Nạp ảnh nền / chủ thể</label><input id="thumb-image" type="file" accept="image/png,image/jpeg,image/webp" data-upload="thumbnail"></div><div class="actions">${btn('Xuất thumbnail PNG','export-thumbnail')}${btn('Chép prompt ảnh','copy-thumbnail')}</div></div></div>`);}
function drawThumbnail(){const canvas=document.querySelector('#thumbnail'),p=currentProject(),c=currentChannel();if(!canvas||!p)return;const W=1280,H=720,ctx=canvas.getContext('2d'),layout=findLayout(p.thumbnailLayout||c.thumbnailLayout||'split-2'),box=r=>({x:r[0]*W,y:r[1]*H,w:r[2]*W,h:r[3]*H}),imgBox=box(layout.canvas.image),txtBox=box(layout.canvas.text),subBox=layout.canvas.sub?box(layout.canvas.sub):null;ctx.fillStyle='#e7ddc4';ctx.fillRect(0,0,W,H);const draw=img=>{ctx.save();ctx.beginPath();ctx.rect(imgBox.x,imgBox.y,imgBox.w,imgBox.h);ctx.clip();if(img){const s=Math.max(imgBox.w/img.width,imgBox.h/img.height);ctx.drawImage(img,imgBox.x+(imgBox.w-img.width*s)/2,imgBox.y+(imgBox.h-img.height*s)/2,img.width*s,img.height*s);}else{ctx.fillStyle='#8fac98';ctx.fillRect(imgBox.x,imgBox.y,imgBox.w,imgBox.h);ctx.fillStyle='#4b6a54';const bars=6,gap=imgBox.w/(bars+1),bw=gap*0.55;for(let i=0;i<bars;i+=1){const h=imgBox.h*(0.16+0.52*(i/(bars-1)));ctx.fillRect(imgBox.x+gap*(i+0.5)-bw/2,imgBox.y+imgBox.h*0.84-h,bw,h);}}ctx.restore();const text=String(p.thumbnailText||p.packaging?.[p.selectedPackaging||0]?.overlay||'').toUpperCase().trim();if(text){const wrap=size=>{ctx.font=`800 ${size}px Georgia`;const out=[];let line='';for(const w of text.split(/\s+/)){if(ctx.measureText(`${line} ${w}`.trim()).width>txtBox.w&&line){out.push(line);line=w;}else line=`${line} ${w}`.trim();}if(line)out.push(line);return out;};let size=Math.min(86,txtBox.h/1.35),lines=wrap(size);while(lines.length*size*1.15>txtBox.h&&size>24){size-=4;lines=wrap(size);}ctx.fillStyle='#17361f';ctx.textBaseline='top';lines.slice(0,4).forEach((line,i)=>ctx.fillText(line,txtBox.x,txtBox.y+i*size*1.15,txtBox.w));ctx.textBaseline='alphabetic';}const sub=String(p.thumbnailSub||'').trim();if(sub&&subBox){ctx.font=`500 ${Math.max(14,Math.min(30,subBox.h))}px Segoe UI`;ctx.fillStyle='#3b4a3e';ctx.fillText(sub,subBox.x,subBox.y+subBox.h*0.82,subBox.w);}};if(p.thumbnailImage){const img=new Image();img.onload=()=>draw(img);img.src=p.thumbnailImage;}else draw();}
function settingsView(){const grid=[panel('AI · Groq / gateway',`${notice(`Gateway: ${esc(settings.gateway)} · ${settings.gatewayConfigured?'đã có cấu hình':'chưa cấu hình'}`)}<div class="field"><label for="model-input">Model dùng trong app</label><input id="model-input" value="${esc(settings.model)}"><small>Yêu cầu app gửi qua gateway, không thay model của phiên Codex.</small></div><label><input id="auto-fallback" type="checkbox" ${settings.autoFallback?'checked':''}> Tự chuyển model khi quá tải hoặc mất kết nối</label><div class="field"><label for="fallback-models">Model dự phòng · theo thứ tự ưu tiên</label><textarea id="fallback-models" placeholder="Mỗi dòng một model · tối đa 3">${esc((settings.fallbackModels||[]).join('\n'))}</textarea><small>Chỉ dùng model đã nối trong gateway. Áp dụng cho nội dung chữ; kịch bản được xử lý bằng model bạn đã nối. Mỗi lượt thử tối đa 45 giây khi bật dự phòng. Lỗi khóa/API hoặc dữ liệu không tự chuyển.</small></div><div class="actions">${btn('Lưu model','save-settings','primary')}${btn('Kiểm tra AI','test-ai')}<a href="http://localhost:20128/dashboard/providers" target="_blank" rel="noopener">Mở OmniRoute</a></div><p id="connection-result" class="muted"></p>`),panel('YouTube Data API',`${notice(settings.youtubeConfigured?'Đã lưu khóa YouTube trên máy.':'Chưa có khóa YouTube. Khảo sát trực tiếp cần cấu hình này.','warning')}<div class="field"><label for="youtube-key">YouTube API key</label><input id="youtube-key" type="password" autocomplete="off" placeholder="Nhập khóa mới · không hiển thị khóa đã lưu"><small>Khóa lưu ở server, không gửi lại trình duyệt hoặc đưa vào mã frontend.</small></div><div class="actions">${btn('Lưu khóa YouTube','save-settings','primary')}<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a></div><p class="muted tiny">Bật YouTube Data API v3 cho dự án Google. Không cần khóa này để viết script hoặc nhập kho video thủ công.</p>`)].join('');return heading('Kết nối API','AI viết nội dung và YouTube Data API khảo sát kênh.')+`<div class="grid2">${grid}</div>`+panel('Bộ đếm phiên khảo sát',`<div class="grid3"><div class="stat"><strong>${settings.usage?.searches||0}</strong><span>LƯỢT SEARCH API</span></div><div class="stat"><strong>${settings.usage?.otherCalls||0}</strong><span>LƯỢT API KHÁC</span></div><div class="stat"><strong>${settings.usage?.cacheHits||0}</strong><span>LƯỢT DÙNG CACHE</span></div></div><p class="muted tiny">Bộ đếm của phiên server, không thay dashboard quota Google hay Groq. </p>`);}
let renderCount = 0;
function render(){if(!state)return;renderCount += 1;const r=route();app.innerHTML=shell(r.page==='niche'?niche():r.page==='create'?channelCreate():r.page==='channel'?channelView():r.page==='settings'?settingsView():home());drawThumbnail();}
function newSurvey(){const id=uid();state.surveys.push({id,name:'',nicheMode:'live',probeMode:'live',nicheStep:0,language:'en',market:'US',format:'long',days:90,queryText:'',linksText:'',template:'',templateId:'',gate:'vua',templates:[],videos:[],groups:[],selectedChannels:[],selectedGroup:'',step:0});activity('Tạo khảo sát ngách');save();go('niche/'+id);}
function newChannel(s){const id=uid();const c={id,name:'',language:s?.language||'vi',niche:s?.niche||'',audience:s?.audience||'',angle:s?.angle||'',difference:s?.difference||'',surveyId:s?.id||'',type:'mascot',style:'Doodle 2D',thumbnailLayout:'split',identity:{},ideas:[],createStep:0,technical:{structure:'consequence',subLines:SUB_LINES.join(' / ')},characterDescription:'Tích: hand-drawn 2D doodle mascot, large circular white head, tiny slim body, dark side-swept spiky hair, minimal black eyes, pink cheeks, white short-sleeve shirt, bright red scarf tied at the front, black shorts, thin black limbs, rounded black mitten hands and oval black shoes. Preserve identity from the supplied character sheet; no redesign, realistic anatomy, 3D, anime, hair or scarf changes.'};if(s?.nicheMode==='live'&&s.leadChannel)c.formatReference=s.leadChannel;if(s?.lockedNiche){c.nicheLock=structuredClone(s.lockedNiche);c.angle=c.nicheLock.angle;c.identity.titlePattern=c.nicheLock.template;c.ideas=c.nicheLock.topics.map(title=>({title}));}state.channels.push(c);activity('Tạo hồ sơ kênh');save();go('create/'+id);}
function newProject(c,idea){const id=uid();state.projects.push({id,channelId:c.id,topic:idea?.title||'',minutes:5,clipSeconds:'10',structure:'consequence',step:0,approved:[],sources:[],outline:[],packaging:[],selectedPackaging:0,narration:'',thumbnailLayout:c.thumbnailLayout});activity('Tạo dự án video');save();go(`channel/${c.id}/workshop/${id}/0`);}
function selectedVideos(s){return s.selectedChannels?.length?s.videos.filter(v=>s.selectedChannels.includes(v.channelId)):s.videos;}
async function discoverAction(){const s=currentSurvey();if(!settings.youtubeConfigured)return toast('Thêm YouTube API tại Kết nối API, hoặc bấm Nhập kho video.',true);await run('Đang khảo sát YouTube…',async()=>{const r=await api('/api/discover','POST',{queries:s.queryText.split('\n').map(x=>x.trim()).filter(Boolean),links:s.linksText.split('\n').map(x=>x.trim()).filter(Boolean),language:s.language,market:s.market,format:s.format,days:s.days});s.videos=r.videos;s.groups=[];s.templates=[];s.selectedChannels=topChannels(s,3);s.step=1;settings.usage=r.usage;activity(`Khảo sát ${s.videos.length} video YouTube`);toast(r.formatWarning);});}
// Gợi ý sẵn 3 kênh qua cổng để bước 2 có mẫu, người dùng vẫn tự tick lại.
function topChannels(s, count){const {channels}=analyzeChannels(s.videos,{gate:gateOf(s)});const pass=channels.filter(c=>c.gatePass);return (pass.length?pass:channels).slice(0,count).map(c=>c.id);}
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(!rows.length)return[];const headers=rows.shift().map(x=>x.trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]?.trim()||''])));}
async function importVideos(){const input=document.createElement('input');input.type='file';input.accept='.json,.csv';input.onchange=()=>run('Đang nhập kho video…',async()=>{const text=await input.files[0].text();const rows=input.files[0].name.endsWith('.csv')?parseCSV(text):JSON.parse(text);const result=await api('/api/import','POST',{rows:Array.isArray(rows)?rows:rows.videos});const s=currentSurvey();s.videos=result.videos;s.groups=[];s.templates=[];s.selectedChannels=topChannels(s,3);s.step=1;activity(`Nhập ${s.videos.length} video từ ${input.files[0].name}`);});input.click();}
function gate(p,c,next){if(next<0||next>LAST_STEP)return 'Bước không hợp lệ.';if(next===1&&!p.topic?.trim())return 'Nhập chủ đề trước.';if(next===2&&!p.packaging?.length)return 'Chọn tiêu đề trước.';return '';}
function markdownProject(c,p){return '# '+(p.packaging?.[p.selectedPackaging||0]?.title||p.topic)+'\n\nKênh: '+c.name+'\nAngle: '+c.angle+'\n\n## Kịch bản\n\n'+p.narration+'\n\n## Nguồn\n\n'+(p.sources||[]).map(s=>s.name+'\n'+(s.url||'')+'\n'+s.text).join('\n\n');}
async function generateScript(){const c=currentChannel(),p=currentProject(),plan=scriptPlan(p.outline,p.minutes);const basis=JSON.stringify({context:scriptPartContext(c,p,plan[0],0,plan.length),plan});if(p.scriptDraft?.basis!==basis)p.scriptDraft={basis,parts:[],notes:[]};await run('Đang viết script theo từng phần…',async()=>{for(let i=p.scriptDraft.parts.length;i<plan.length;i++){document.querySelector('#busy-label').textContent='Đang viết phần '+(i+1)+'/'+plan.length;const part=plan[i];const result=await generate('script',scriptPartContext(c,p,part,i,plan.length,p.scriptDraft.parts));if(!result.narration?.trim())throw Error('AI chưa trả lời kể; phần đã viết được giữ để tiếp tục.');p.scriptDraft.parts.push(result.narration.trim());p.scriptDraft.notes.push(...(result.editorNotes||[]));await save();}if(p.narration)p.previousNarration=p.narration;p.narration=p.scriptDraft.parts.join('\n\n');p.editorNotes=p.scriptDraft.notes;p.approved=p.approved.filter(x=>x<3);delete p.scriptDraft;});}
async function handle(action,el){const s=currentSurvey(),c=currentChannel(),p=currentProject();
if(s&&(action.startsWith('niche-')||action==='survey-to-channel'))applySurveyFields(s,[...app.querySelectorAll('[data-bind^="survey."]')].map(input=>({binding:input.dataset.bind,type:input.type,value:input.value,checked:input.checked})));
switch(action){
case 'home':go('home');break;
case 'settings':go('settings');break;
case 'new-survey':newSurvey();break;
case 'open-survey':go('niche/'+el.dataset.id);break;
case 'new-channel':if(s&&!s.lockedNiche)return toast('Qua đủ sáu cổng khảo sát trước khi dựng kênh từ ngách này.',true);newChannel(s);break;
case 'open-channel':go('channel/'+el.dataset.id+'/overview');break;
case 'home-workshop':if(state.channels.length)go('channel/'+state.channels[0].id+'/workshop');else newChannel();break;
case 'home-projects':if(state.projects.length){const pr=state.projects.at(-1);go(`channel/${pr.channelId}/workshop/${pr.id}/${pr.step}`);}else toast('Chưa có dự án. Tạo kênh rồi bấm Làm kịch bản mới.');break;
case 'theme':document.body.classList.toggle('light');localStorage.setItem('tich-theme',document.body.classList.contains('light')?'light':'dark');render();break;
case 'guide':toast('Bắt đầu Tìm ngách hoặc Dựng kênh. Dữ liệu tự lưu khi bạn chỉnh. AI dùng Groq; khảo sát YouTube cần khóa riêng.');break;
case 'niche-step':{const next=Number(el.dataset.step);if(!Number.isInteger(next)||next<0||next>5||STAGES.slice(0,next).some(st=>s.nicheFlow?.[st]?.passed!==true))return toast('Chưa qua cổng trước.',true);s.nicheStep=next;await save();render();break;}
case 'niche-field':await nicheAction('field',{market:s.market,language:s.language,format:s.format});break;
case 'niche-analyze':{
 if(!s.leadChannel?.trim())return toast('Nhập kênh tham khảo trước khi phân tích.',true);

 if(s.nicheMode!=='live'&&!s.completeImport)return toast('Xác nhận kho nhập đầy đủ trong phần nguồn dữ liệu.',true);
 await nicheAction('field',{market:s.market,language:s.language,format:s.format},[{stage:'template',extras:templateRequest(s)}]);break;
}
case 'niche-template':await nicheAction('template',templateRequest(s));break;
case 'niche-choose-angle':{const suggestion=s.nicheFlow?.template?.angleSuggestions?.[Number(el.dataset.index)];if(suggestion){s.angle=suggestion.angle;await save();render();}break;}
case 'niche-use-template':if(!s.angle?.trim())return toast('Chọn một gợi ý hoặc nhập góc kể trước khi tiếp tục.',true);await nicheAction('template',templateRequest(s,true),[{stage:'shelf',extras:shelfRequest(s)}]);break;
case 'niche-shelf':await nicheAction('shelf',shelfRequest(s));break;
case 'niche-add-channel':{const input=document.querySelector('[data-bind="survey.extraChannelsText"]');input?.scrollIntoView({behavior:'smooth',block:'center'});input?.focus();break;}
case 'niche-groups':await nicheAction('groups');break;
case 'niche-manual-groups':await nicheAction('groups',{groups:JSON.parse(s.groupDraft||'[]')});break;
case 'niche-choose-group':await nicheAction('groups',{groupId:el.dataset.id});break;
case 'niche-probe':{const mode=s.probeMode||s.nicheMode||'import';await nicheAction('probe',{mode,queries:probeQueriesFor(s).split('\n').map(x=>x.trim()).filter(Boolean),samples:mode==='live'?undefined:JSON.parse(s.probeSamples||'[]'),confirmComplete:s.probeConfirmed===true});break;}
case 'niche-topics':await nicheAction('topics');break;
case 'niche-manual-topics':await nicheAction('topics',{titles:(s.topicDraft||'').split('\n').map(x=>x.trim()).filter(Boolean)});break;
case 'survey-step':if(Number(el.dataset.step)>0&&!s.videos.length)return toast('Nhập hoặc khảo sát video trước.',true);s.step=Number(el.dataset.step);await save();render();break;
case 'survey-next':s.step=Math.min(3,s.step+1);await save();render();break;
case 'choose-gate':s.gate=GATES[el.dataset.value]?el.dataset.value:'vua';await save();render();break;
case 'discover':await discoverAction();break;
case 'import-videos':await importVideos();break;
case 'sample-csv':download('mau-kho-video.csv','id,title,channelId,channelTitle,views,publishedAt,duration,format,url\nexample-1,VIDEO MINH HOA - thay bang du lieu that,example-channel,Kenh minh hoa,10000,2026-09-01,300,long,\n');toast('Dòng mẫu là minh họa. Thay bằng dữ liệu thật trước khi nhập.');break;
case 'group-videos':if(!s.videos.length)return toast('Chưa có video trong kho.',true);await run('Đang chia nhóm…',async()=>{const data=await generate('groups',{template:s.template,videos:selectedVideos(s).slice(0,150).map(({id,title,views,channelId,multiple})=>({id,title,views,channelId,multiple}))});s.groups=data.groups;s.step=3;});break;
case 'choose-template':s.template=el.dataset.value;s.templateId=el.dataset.channel||'';await save();render();break;
case 'choose-group':{const g=s.groups.find(x=>x.id===el.dataset.id);if(!g)break;s.selectedGroup=g.id;s.niche=s.niche||g.name;s.angle=s.angle||g.angle;await save();render();break;}
case 'add-group':{const name=prompt('Tên nhóm mới');if(name?.trim()){s.groups.push({id:uid(),name:name.trim(),angle:'',reason:'Nhóm thủ công',videoIds:[]});await save();render();}break;}
case 'survey-to-channel':if(!s.lockedNiche)return toast('Khảo sát chưa qua đủ sáu cổng.',true);newChannel(s);break;
case 'export-survey':download('ho-so-ngach.json',JSON.stringify(s,null,2),'application/json');break;
case 'create-step':c.createStep=Math.max(0,Math.min(CHANNEL_TABS.length-1,Number(el.dataset.step)));await save();render();break;
case 'create-next':c.createStep=Math.min(CHANNEL_TABS.length-1,Number(c.createStep||0)+1);await save();render();break;
case 'choose-layout':c.thumbnailLayout=el.dataset.value;activity(`Chọn khung thumbnail ${el.dataset.value}`);await save();render();break;
case 'channel-expand':c.createExpand=!c.createExpand;await save();render();break;
case 'identity':if(!c.niche?.trim()&&!c.referenceText?.trim())return toast('Nhập ngách hoặc transcript nguồn trước.',true);await run('Đang rút bản sắc từ nguồn…',async()=>{c.identity=await generate('identity',{niche:c.niche,angle:c.angle,audience:c.audience,language:c.language,referenceText:c.referenceText||'',referenceLinks:[c.formatReference,c.voiceReferences].filter(Boolean)});if(c.nicheLock)c.identity.titlePattern=c.nicheLock.template;c.createStep=1;});break;
case 'choose-name':{const item=c.identity.names[Number(el.dataset.index)];c.name=item.name;c.tagline=item.tagline;await save();render();break;}
case 'finish-channel':if(!c.name?.trim())return toast('Nhập tên kênh.',true);c.ready=true;activity(`Khóa hồ sơ kênh ${c.name}`);await save();go('channel/'+c.id+'/overview');break;
case 'channel-tab':go('channel/'+c.id+'/'+el.dataset.tab);break;
case 'choose-style':c.style=el.dataset.value;await save();render();break;
case 'ideas':if(!c.niche||!c.angle)return toast('Nhập ngách và angle trong Bản sắc.',true);await run('Đang lập lộ trình ý tưởng…',async()=>{const data=await generate('ideas',{niche:c.niche,angle:c.angle,audience:c.audience,language:c.language,existingIdeas:c.ideas?.map(x=>x.title)||[],evidence:state.surveys.find(s=>s.id===c.surveyId)?.videos?.slice(0,40).map(({id,title})=>({id,title}))||[]});if(!Array.isArray(data.ideas))throw new Error('AI chưa trả danh sách ý tưởng.');c.ideas=[...(c.ideas||[]),...data.ideas];});go('channel/'+c.id+'/roadmap');break;
case 'add-idea':{const title=prompt('Chủ đề muốn thêm');if(title?.trim()){c.ideas.push({title:title.trim(),question:''});await save();render();}break;}
case 'edit-idea':{const i=Number(el.dataset.index),title=prompt('Sửa chủ đề',c.ideas[i].title);if(title?.trim()){c.ideas[i].title=title.trim();await save();render();}break;}
case 'new-project':newProject(c);break;
case 'idea-project':newProject(c,c.ideas[Number(el.dataset.index)]);break;
case 'open-project':{const pr=state.projects.find(x=>x.id===el.dataset.id);go(`channel/${pr.channelId}/workshop/${pr.id}/${pr.step}`);break;}
case 'project-step':{const next=Number(el.dataset.step),error=gate(p,c,next);if(error)return toast(error,true);p.step=next;await save();render();break;}
case 'select-angle':{
const idx=Number(el.target.dataset.index);
const angle=p.researchAngles?.[idx]||'';
p.researchAngle=angle;
await save();
render();
break;
}
case 'approve-next':{const next=Math.min(LAST_STEP,p.step+1),error=gate(p,c,next);if(error)return toast(error,true);if(!p.approved.includes(p.step))p.approved.push(p.step);p.step=next;await save();render();break;}
case 'packaging':await run('Đang đề xuất 16 phương án title, thumbnail và hook…',async()=>{const data=await generate('packaging',projectContext(c,p));if(!data.variants?.length)throw new Error('AI chưa trả phương án.');p.packaging=data.variants;p.selectedPackaging=0;p.thumbnailText=data.variants[0].overlay;p.approved=p.approved.filter(x=>x<1);});break;
case 'discard-packaging':if(confirm('Hủy bộ tiêu đề hiện tại?')){p.packaging=[];p.selectedPackaging=null;p.thumbnailText='';p.approved=p.approved.filter(x=>x<1);await save();render();}break;
case 'manual-packaging':p.packaging.push({title:p.topic,thumbnailVisual:'',overlay:'',hookType:nextHook((p.packaging||[]).map(v=>v.hookType)).id,hook:'',promise:''});p.selectedPackaging=p.packaging.length-1;await save();render();break;
case 'choose-packaging':p.selectedPackaging=Number(el.dataset.index);p.thumbnailText=p.packaging[p.selectedPackaging].overlay;await save();render();break;
case 'add-source':if(!p.sourceDraftName?.trim()||!p.sourceDraftText?.trim())return toast('Nhập tên và nội dung nguồn.',true);p.sources.push({id:'source-'+uid(),name:p.sourceDraftName,url:p.sourceDraftUrl||'',text:p.sourceDraftText});p.sourceDraftName='';p.sourceDraftText='';p.sourceDraftUrl='';await save();render();toast('Đã thêm nguồn.');break;
case 'remove-source':{const id=el.dataset.id;if(!p.sources?.length)return;p.sources=p.sources.filter(s=>s.id!==id);await save();render();toast('Đã xoá nguồn.');break;}
case 'research':if(!p.sources.length)return toast('Thêm ít nhất một nguồn có nội dung.',true);await run('Đang đối chiếu claim với nguồn…',async()=>{const result=await generate('research',projectContext(c,p));p.claims=result.claims||[];p.researchQuestions=result.questions||[];p.researchSummary=result.summary||'';p.researchTimeline=result.timeline||[];p.researchFacts=result.facts||[];p.researchSensory=result.sensory||'';p.researchCast=result.cast||[];p.researchAngles=result.angles||[];});break;
case 'outline':await run('Đang dựng khung câu chuyện…',async()=>{const result=await generate('outline',projectContext(c,p));if(!result.segments?.length)throw new Error('AI chưa trả dàn ý.');p.outline=result.segments;});break;
case 'script':await generateScript();break;
case 'copy-script':await copy(p.narration||'');break;
case 'copy-thumbnail':{const sel=p.packaging?.[p.selectedPackaging||0];const visual=p.thumbnailVisual||sel?.thumbnailVisual||sel?.thumbnail||'One clear focal subject.';const charLock=(c.type==='mascot'&&c.characterSheet)?`Character style lock: ${c.characterDescription}.`:'';await copy(`Create an original ${c.style} 16:9 thumbnail. Scene: ${visual}. Layout: ${p.thumbnailLayout||c.thumbnailLayout}. Keep negative space for editor text. ${charLock} No text, captions, watermarks or logos.`);}break;
case 'export-thumbnail':{const canvas=document.querySelector('#thumbnail');canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='thumbnail.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});break;}
case 'export-project':download('goi-san-xuat.json',JSON.stringify({channel:c,project:p,exportedAt:new Date().toISOString()},null,2),'application/json');break;
case 'export-markdown':download('script-va-prompts.md',markdownProject(c,p));break;
case 'export-script':download('narration.txt',p.narration);break;
case 'finish-script':if(!p.narration?.trim())return toast('Cần kịch bản trước khi hoàn tất.',true);p.done=true;p.step=LAST_STEP;if(!p.approved.includes(LAST_STEP))p.approved.push(LAST_STEP);activity('Hoàn tất kịch bản '+p.topic);await save();render();break;
case 'save-settings':await run('Đang lưu cấu hình…',async()=>{const b={autoFallback:document.querySelector('#auto-fallback')?.checked===true,fallbackModels:(document.querySelector('#fallback-models')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean)};for(const id of ['model-input','youtube-key']){const value=document.querySelector('#'+id)?.value?.trim();if(value)b[id==='model-input'?'model':id==='youtube-key'?'youtubeKey':'youtubeKey']=value;}await api('/api/settings','PUT',b);settings=await api('/api/settings');caps=await api('/api/capabilities');render();toast('Đã lưu cấu hình. Khóa không được hiển thị lại — nhập mới chỉ khi muốn thay.');});break;
case 'test-ai':await run('Đang kiểm tra kết nối AI…',async()=>{const result=await api('/api/test','POST',{});if(!result.ok)throw new Error('Model chưa trả kết quả kiểm thử hợp lệ.');toast(`AI hoạt động · ${result.model}`);});break;
}}
app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||busy)return;handle(el.dataset.action,el).catch(err=>toast(err.message,true));});
app.addEventListener('change',async e=>{
  const el=e.target;
  if(el.dataset.bind){if(el.dataset.bind==='project.narration'){const p=currentProject();p.previousNarration=p.narration;p.approved=p.approved.filter(x=>x<3);}setBinding(el.dataset.bind,el.type==='checkbox'?el.checked:el.value);if(el.dataset.bind.startsWith('project.thumbnail'))drawThumbnail();if(['survey.nicheMode','survey.probeMode','channel.type'].includes(el.dataset.bind)){await saveQueue;render();}if(el.dataset.bind==='project.narration'){const p=currentProject();p.approved=p.approved.filter(x=>x<3);document.querySelector('#word-count').textContent=`${words(el.value)} đơn vị cách nhau bởi khoảng trắng`;}}
  if(el.dataset.channelSelect){const s=currentSurvey();s.selectedChannels=el.checked?[...new Set([...s.selectedChannels,el.dataset.channelSelect])]:s.selectedChannels.filter(id=>id!==el.dataset.channelSelect);await save();}
  if(el.dataset.videoGroup){const s=currentSurvey();for(const g of s.groups)g.videoIds=g.videoIds.filter(id=>id!==el.dataset.videoGroup);s.groups.find(g=>g.id===el.value)?.videoIds.push(el.dataset.videoGroup);await save();}
  if(el.dataset.upload==='thumbnail'&&el.files?.[0]){const file=el.files[0];if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))return toast('Chọn ảnh PNG/JPEG/WebP tối đa 2 MB.',true);const reader=new FileReader();reader.onload=async()=>{try{currentProject().thumbnailImage=(await api('/api/assets','POST',{data:reader.result})).url;await save();render();}catch(e){toast(e.message,true);}};reader.readAsDataURL(file);}
});
app.addEventListener('input',e=>{if(e.target.dataset.bind?.startsWith('project.thumbnail')){const {object,keys}=boundObject(e.target.dataset.bind);if(object)object[keys[0]]=e.target.value;drawThumbnail();}});
window.addEventListener('hashchange',render);
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
try{[state,settings,caps]=await Promise.all([api('/api/state'),api('/api/settings'),api('/api/capabilities')]);normalizeScriptProjects(state);persistedState=structuredClone(state);if(localStorage.getItem('tich-theme')==='light')document.body.classList.add('light');render();}catch(e){app.innerHTML=`<div class="content">${heading('Không tải được Studio','Kiểm tra server và tải lại trang.')}${notice(esc(e.message),'error')}</div>`;}
