const short=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function autoResearchInput(project,channel={}){
 const topic=short(project.topic,400);if(!topic)throw Error('Chốt chủ đề trước khi nghiên cứu tự động.');
 return {topic,title:short(project.packaging?.[project.selectedPackaging||0]?.title||topic,400),angle:short(project.researchAngle||channel.angle,400),language:short(channel.language||'vi',30),sources:(project.sources||[]).filter(s=>!s.autoResearch&&s.text?.trim()).slice(0,8).map(s=>({id:s.id,name:short(s.name,200),url:short(s.url,2000),text:s.text.slice(0,10000)}))};
}
export function applyAutoResearch(project,channel,result){
 if(JSON.stringify(autoResearchInput(project,channel))!==JSON.stringify(result.input))throw Error('Chủ đề, tiêu đề, góc kể hoặc nguồn thủ công đã đổi. Chạy lại Research theo dữ liệu mới.');
 project.previousResearch={summary:project.researchSummary,timeline:project.researchTimeline,cast:project.researchCast,facts:project.researchFacts,claims:project.claims};
 const manual=(project.sources||[]).filter(s=>!s.autoResearch),ids=new Set(manual.map(s=>s.id));
 project.sources=[...manual,...result.sources.filter(s=>!ids.has(s.id))];
 project.researchSummary=result.summary;project.claims=result.claims;project.researchFacts=result.facts;
 project.researchTimeline=result.timeline||[];project.researchCast=result.cast||[];project.researchSensory='';
 project.researchQuestions=result.questions;project.researchAngles=result.angles;
 project.researchAutoResult={checkedAt:result.checkedAt,provider:result.provider,model:result.model,search:result.search,unread:result.unread,jobId:project.researchAutoJobId};
 delete project.researchAutoJobId;project.approved=(project.approved||[]).filter(n=>n<2);
}
export function removeResearchSource(project,id){
 project.sources=(project.sources||[]).filter(s=>s.id!==id);
 for(const row of [...(Array.isArray(project.claims)?project.claims:[]),...(Array.isArray(project.researchFacts)?project.researchFacts:[])]){
  if(String(row.sourceId||'').split(/,\s*/).includes(id)||(row.evidence||[]).some(e=>e.sourceId===id)){row.status='needs_check';row.verdict='needs_check';row.evidence=(row.evidence||[]).filter(e=>e.sourceId!==id);row.sourceId=String(row.sourceId||'').split(/,\s*/).filter(x=>x!==id).join(', ');row.note='Nguồn đã bị xoá; cần đối chiếu lại phát biểu này.';}
 }
 project.approved=(project.approved||[]).filter(n=>n<2);
}
export function renderResearchPanel(c,p,{esc,btn,field,words,n}){
 const claims=p.claims||[],good=claims.filter(x=>x.status==='supported').length,conflicts=claims.filter(x=>x.verdict==='conflicting').length;
 const link=(url,label)=>/^https?:\/\//i.test(url||'')?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:esc(label);
 const searched=p.researchAutoResult?.search||(p.researchAutoResult?.provider?{provider:p.researchAutoResult.provider,model:p.researchAutoResult.model}:null);
 const attempted=Array.isArray(p.researchAttempts)&&p.researchAttempts.length?p.researchAttempts:(searched?.attempts||[]);
 const attemptLine=attempted.length?`<p class="muted tiny">Đã thử: ${attempted.map(item=>`${item.provider==='xai'?'Grok':'Gemini'} · ${esc(item.model)}${item.skipped?' (đang nghỉ)':''}`).join(' → ')}</p>`:'';
 const searchLabel=searched?`${searched.provider==='xai'?'Grok':'Gemini'} · ${esc(searched.model)}`:'';
 return (p.researchError?`<div class="notice warning" role="alert"><strong>Chưa tìm được nguồn web</strong><p>${esc(p.researchError)}</p>${attemptLine}<div class="actions">${btn('Tự thêm nguồn','open-manual-sources','primary')}${btn('Thử lại','auto-research')}</div></div>`:'')
  + `<div class="notice">Chọn một nút để tìm nguồn web, đọc trích đoạn và đối chiếu phát biểu. Có dùng API/tìm web; chỉ chạy khi bạn bấm.</div><div class="actions">${btn(p.researchAutoJobId?'Tiếp tục xem Research':p.researchAutoResult?'Cập nhật nghiên cứu':'Tự tìm và đối chiếu nguồn','auto-research','primary')}</div><p id="research-auto-progress" aria-live="polite">${p.researchAutoJobId?'Tác vụ đang xử lý; bấm để xem tiến trình.':''}</p>`
  + (searchLabel?`<p class="muted tiny">Đã dùng cho bước tìm web: ${searchLabel}${searched.attempts?.length?' · đã thử '+searched.attempts.length+' ứng viên':''}.</p>`:'')
  + (p.researchSummary?`<div class="notice"><strong>Tóm tắt nghiên cứu</strong><p>${esc(p.researchSummary)}</p><p>${good} phát biểu có căn cứ · ${claims.length-good} cần kiểm tra${conflicts?' · '+conflicts+' còn mâu thuẫn':''}</p><p class="muted tiny">AI đối chiếu trích đoạn đã đọc, không phải xác minh tuyệt đối hoặc đọc toàn bộ mọi trang.</p></div>`:'')
  + ((p.sources||[]).length?`<details><summary>${p.sources.length} nguồn đã lưu</summary>${p.sources.map(s=>`<p>${link(s.url,s.name||s.id)} · ${n(words(s.text||''))} từ${s.excerpt?' · trích đoạn web':''} <button class="btn btn-sm" data-action="remove-source" data-id="${esc(s.id)}">Xoá</button></p>`).join('')}</details>`:'')
  + (p.researchAutoResult?.provider==='gemini'?`<iframe title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" src="/api/research/auto/${esc(p.researchAutoResult.jobId)}/suggestions"></iframe>`:'')
  + ((p.researchQuestions||[]).length?`<details open><summary>Điểm còn cần kiểm tra</summary>${p.researchQuestions.map(q=>`<p>• ${esc(q)}</p>`).join('')}</details>`:'')
  + (claims.length?`<details><summary>Xem ${claims.length} phát biểu và trích dẫn</summary>${claims.map(x=>`<article class="panel"><strong>${esc(x.claim)}</strong><p class="tag ${x.status==='supported'?'good':'warn'}">${x.verdict==='conflicting'?'Còn mâu thuẫn':x.status==='supported'?'Có căn cứ trong nguồn':'Cần kiểm tra'}</p><p>${esc(x.note||'')}</p>${(x.evidence||[]).map(e=>{const source=(p.sources||[]).find(s=>s.id===e.sourceId);return `<blockquote>${esc(e.quote)}</blockquote><p>${link(source?.url,source?.name||e.sourceId)}</p>`;}).join('')}</article>`).join('')}</details>`:'')
  + `<details id="manual-sources"><summary>Tự thêm nguồn hoặc chỉnh kết quả</summary>${field('Tên nguồn','project.sourceDraftName',p.sourceDraftName,'text','','Báo cáo, transcript hoặc ghi chú nghiên cứu')}${field('URL nguồn · tùy chọn','project.sourceDraftUrl',p.sourceDraftUrl,'url')}${field('Nội dung nguồn','project.sourceDraftText',p.sourceDraftText,'textarea')}<div class="actions">${btn('Thêm nguồn','add-source')}${btn('Kiểm kê claim từ nguồn','research')}</div>${field('Tóm tắt nghiên cứu','project.researchSummary',p.researchSummary||'','textarea')}${field('Timeline sự kiện','project.researchTimeline',Array.isArray(p.researchTimeline)?JSON.stringify(p.researchTimeline,null,2):p.researchTimeline||'','textarea')}${field('Số liệu chính','project.researchFacts',Array.isArray(p.researchFacts)?JSON.stringify(p.researchFacts,null,2):p.researchFacts||'','textarea')}${field('Chi tiết cảm quan','project.researchSensory',p.researchSensory||'','textarea')}${field('Nhân vật chính','project.researchCast',Array.isArray(p.researchCast)?JSON.stringify(p.researchCast,null,2):p.researchCast||'','textarea')}</details>`
 + `<div class="section-title">Góc nhìn kể chuyện</div><div class="actions">${(p.researchAngles||[]).map((a,i)=>`<button class="btn ${p.researchAngle===a?'primary':''}" data-action="select-angle" data-index="${i}">${esc(a)}</button>`).join('')}${field('Góc nhìn tùy chỉnh','project.researchAngleCustom',p.researchAngleCustom||'','text')}</div><div class="actions">${btn('Đã xem kết quả → Kịch bản','approve-next','primary',p.sources?.length&&good&&!p.researchAutoJobId?'':'disabled')}</div>`;
}
