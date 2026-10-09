import {scriptPlan} from '../production.mjs';
import {scriptPartContext,openingHookFor} from './research-context.mjs';
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
export const TICH_IDENTITY="Xưng 'mình', gọi 'bạn'. Kể bằng ngôi thứ hai theo một ngày cụ thể. Mỗi ý mới đi kèm con số hoặc ví dụ cụ thể. Nhịp: hiện tượng → 'Nhưng…' → giải thích → 'Vì vậy…'. Có ẩn dụ dễ nhớ và một cặp so sánh hai người. Luôn quay lại cảnh mở đầu ở phần kết. Nói thận trọng, không hứa làm giàu: dùng 'chưa chắc', 'không có nghĩa là'.";
export function loadTichChannelSample(c){
 c.openingPlan=[{kind:'ai',maxWords:130,instruction:"Cảnh đời thường ngôi 'bạn' dẫn tới khoảnh khắc bất ngờ, kết bằng 2 câu hỏi của video"},{kind:'fixed',text:'Mình là Tích. Nếu bạn thích những câu chuyện tiền bạc, đầu tư và kinh doanh được giải thích thật dễ hiểu, nhớ đăng ký Tích Thông Thái nhé.'},{kind:'template',text:'Hôm nay chúng ta sẽ cùng bóc tách {chủ_đề}. Bắt đầu từ {cảnh_mở_đầu}.',slots:{chủ_đề:12,cảnh_mở_đầu:15}}];
 c.closingPlan=[{kind:'ai',maxWords:130,instruction:'Quay lại cảnh mở đầu: nhắc lại tình huống ban đầu và điều đã thay đổi'},{kind:'ai',maxWords:120,instruction:"Câu chốt luận điểm dạng 'không phải A mà là B'"},{kind:'fixed',sfx:'Yeah! (hiệu ứng cuối video)',text:'Mình là Tích. Nếu bạn muốn tiếp tục cùng Tích hiểu tiền vận hành thế nào, doanh nghiệp kiếm tiền ra sao và những quyết định nhỏ hôm nay ảnh hưởng tương lai thế nào, hãy đăng ký Tích Thông Thái vì video tiếp theo có thể bắt đầu từ một thứ bạn gặp mỗi ngày nhưng chưa từng nhìn nó dưới góc độ tiền bạc. Hãy đăng ký kênh và theo chân Tích khám phá thêm nhiều cách để từng bước gia tăng tài sản của mình nhé.'}];
 c.identity||={};for(const field of ['voice','hook','structure'])c.identity[field]=TICH_IDENTITY;return c;
}
export const hasChannelPlans=c=>Boolean(c.openingPlan?.length||c.closingPlan?.length);
export function validatePlan(plan=[]){
 if(!Array.isArray(plan)||plan.length>20)throw Error('Mỗi kế hoạch tối đa 20 đoạn.');
 for(const row of plan){if(!['fixed','template','ai'].includes(row.kind))throw Error('Loại đoạn không hợp lệ.');
 if(row.kind==='ai'){if(typeof row.instruction!=='string'||!row.instruction.trim()||!Number.isInteger(row.maxWords)||row.maxWords<1||row.maxWords>1000)throw Error('Đoạn AI cần instruction và maxWords 1–1000.');}
 else {if(typeof row.text!=='string'||!row.text.trim())throw Error('Cần câu cố định.');if(row.kind==='fixed'&&row.sfx!==undefined&&(typeof row.sfx!=='string'||words(row.sfx).length>30))throw Error('SFX là văn bản ngắn, tối đa 30 từ.');
 if(row.kind==='template'){const slots=[...row.text.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);if(!slots.length||!row.slots||slots.some(key=>!Number.isInteger(row.slots[key])||row.slots[key]<1||row.slots[key]>100)||Object.keys(row.slots).some(key=>!slots.includes(key)))throw Error('Mỗi chỗ trống cần maxWords 1–100 trong danh sách slots.');}}
 }return plan;
}
export function fillTemplate(row,fills){
 validatePlan([row]);return row.text.replace(/\{([^{}]+)\}/g,(_,key)=>{const text=fills?.[key];if(typeof text!=='string'||!text.trim()||words(text).length>row.slots[key])throw Error(`Chỗ trống ${key} tối đa ${row.slots[key]} từ.`);return text;});
}
export function movePlan(c,key,index,direction){if(!['openingPlan','closingPlan'].includes(key))throw Error('Kế hoạch không hợp lệ.');const rows=c[key]||[],next=index+direction;if(next<0||next>=rows.length)return;[rows[index],rows[next]]=[rows[next],rows[index]];}
export function assemblePlannedScript(p){
 const r=p.planResult;if(!r)throw Error('Chưa có kế hoạch đã viết.');
 const text=row=>row.source.kind==='fixed'?row.source.text:row.source.kind==='template'?fillTemplate(row.source,row.fills):row.text;
 const all=[...r.opening,...r.body.map(text=>({source:{kind:'ai'},text})),...r.closing];let cursor=0;p.scriptSfx=[];
 const paragraphs=all.map(row=>{const value=text(row);cursor+=words(value).length;if(row.source.kind==='fixed'&&row.sfx)p.scriptSfx.push({word:cursor-1,text:row.sfx});return value;});
 p.narration=paragraphs.join('\n\n');p.scriptSfxBasis=words(p.narration).join(' ');return p.narration;
}
const evidence=p=>(Array.isArray(p.researchFacts)?p.researchFacts:[]).filter(x=>x.status==='supported').slice(0,3).map(x=>({claim:String(x.claim||'').slice(0,300)}));
export async function writeChannelScript(c,p,{generate,save,onProgress=()=>{}}){
 validatePlan(c.openingPlan||[]);validatePlan(c.closingPlan||[]);
 const base=scriptPlan(p.outline,p.minutes),target=base.reduce((n,x)=>n+x.targetWords,0),basis=JSON.stringify([c.openingPlan,c.closingPlan,c.identity,p.topic,p.outline,p.minutes,p.researchFacts,openingHookFor(p)]);
 if(p.planDraft?.basis!==basis)p.planDraft={basis,opening:[],closing:[],body:[],notes:[]};const draft=p.planDraft;
 const outlineTitles=(p.outline||[]).slice(0,12).map(x=>String(x.title||'').slice(0,80)),selectedTitle=String(p.packaging?.[p.selectedPackaging||0]?.title||p.topic||'').slice(0,300);
 const segment=async(row,side)=>{
  if(row.kind==='fixed')return {source:structuredClone(row),text:row.text,sfx:row.sfx||''};
  const context={outlineTitles,selectedTitle,...(side==='closing'&&row.kind==='ai'?{bodyTitles:outlineTitles}:{}),kind:row.kind,topic:p.topic||'',language:c.language||'vi',...(row.kind==='ai'?{instruction:row.instruction,maxWords:row.maxWords,voice:c.identity?.voice||'',openingScene:draft.opening.filter(x=>x.source.kind==='ai').map(x=>x.text).join(' ').slice(0,1600),supportedFacts:evidence(p)}:{slots:row.slots,openingScene:draft.opening.filter(x=>x.source.kind==='ai').map(x=>x.text).join(' ').slice(0,1600)})};
  const output=await generate('planSegment',context);
  if(row.kind==='template')return {source:structuredClone(row),fills:output.fills,text:fillTemplate(row,output.fills)};
  if(typeof output.text!=='string'||!output.text.trim()||words(output.text).length>row.maxWords)throw Error(`Đoạn ${side} AI phải có 1–${row.maxWords} từ.`);
  return {source:structuredClone(row),text:output.text.trim()};
 };
 for(const side of ['opening','closing']){const plan=c[side+'Plan']||[];for(let i=draft[side].length;i<plan.length;i++){onProgress(`Đang viết ${side==='opening'?'mở đầu':'kết thúc'} ${i+1}/${plan.length}`);draft[side].push(await segment(plan[i],side));await save();}}
 const reserved=[...draft.opening,...draft.closing].reduce((n,x)=>n+words(x.text).length,0),remaining=target-reserved;
 if(remaining<base.length*10)throw Error('Mở đầu/kết thúc quá dài cho thời lượng này. Tăng thời lượng hoặc rút kế hoạch.');
 // Charge opening to the first section and closing to the last. If an edge
 // exceeds its original share, rebalance the remaining positive body sections.
 const openingWords=draft.opening.reduce((n,x)=>n+words(x.text).length,0),closingWords=draft.closing.reduce((n,x)=>n+words(x.text).length,0);
 const charged=base.map((part,i)=>({...part,targetWords:part.targetWords-(i===0?openingWords:0)-(i===base.length-1?closingWords:0)})).filter(part=>part.targetWords>0);
 const available=charged.reduce((n,x)=>n+x.targetWords,0);if(!charged.length)throw Error('Không còn ngân sách từ cho thân bài.');
 let assigned=0;const bodyPlan=charged.map((part,i)=>{const targetWords=i===charged.length-1?remaining-assigned:Math.floor(remaining*part.targetWords/available);assigned+=targetWords;return {...part,targetWords};});
 for(let i=draft.body.length;i<bodyPlan.length;i++){
  const part=bodyPlan[i],ctx={...scriptPartContext(c,p,part,i,bodyPlan.length,draft.body),includeCTA:c.closingPlan?.length?false:Boolean(p.includeCTA)&&i===bodyPlan.length-1,...(i===0&&c.openingPlan?.length?{openingHandoff:{fills:Object.assign({},...draft.opening.filter(x=>x.source.kind==='template').map(x=>x.fills)),ending:draft.opening.filter(x=>x.source.kind==='ai').map(x=>x.text).join(' ').slice(-300)}}:{}),planManagedOpening:Boolean(c.openingPlan?.length),planManagedClosing:Boolean(c.closingPlan?.length)};
  // Previous summaries contain body only; fixed and template sentences never go to AI.
  onProgress(`Đang viết thân bài ${i+1}/${bodyPlan.length}`);let result;
  for(let retry=0;retry<2;retry++){result=await generate('script',{...ctx,...(retry?{lengthCorrection:`Viết đúng ${part.targetWords} từ (±5%).`}:{})});if(typeof result.narration==='string'&&result.narration.trim()&&Math.abs(words(result.narration).length-part.targetWords)<=part.targetWords*.05)break;if(retry===1)throw Error(`Thân bài vẫn lệch mục tiêu ${part.targetWords} từ sau một lần thử lại.`);}
  draft.body.push(result.narration.trim());draft.notes.push(...(result.editorNotes||[]));await save();
 }
 p.planResult=structuredClone(draft);assemblePlannedScript(p);if(Math.abs(words(p.narration).length-target)>target*.05)throw Error('Kịch bản lệch quá 5% mục tiêu.');
 p.scriptParts=[...draft.body];p.editorNotes=draft.notes;p.scriptWarnings=[];p.approved=(p.approved||[]).filter(n=>n<3);p.rosterReviewed=false;p.rosterConfirmed=false;delete p.planDraft;await save();return p.narration;
}
export function renderChannelPlans(c,{esc,btn}){
 return `<section><h3>Mở đầu và kết thúc cố định</h3>${btn('Nạp mẫu Tích Thông Thái','load-tich-channel')}<p class="muted">Fixed do code giữ nguyên. Template chỉ điền chỗ trống. AI viết theo instruction và maxWords; SFX tách khỏi lời kể.</p>${['openingPlan','closingPlan'].map(key=>`<section><h4>${key==='openingPlan'?'Mở đầu':'Kết thúc'}</h4>${(c[key]||[]).map((row,i)=>{const attr=field=>`data-plan="${key}" data-plan-index="${i}" data-plan-field="${field}"`;return `<article class="panel"><label>Loại đoạn<select ${attr('kind')}>${['fixed','template','ai'].map(k=>`<option ${k===row.kind?'selected':''} value="${k}">${k}</option>`).join('')}</select></label>${row.kind==='ai'?`<label>instruction<textarea ${attr('instruction')}>${esc(row.instruction||'')}</textarea></label><label>maxWords<input type="number" min="1" max="1000" ${attr('maxWords')} value="${row.maxWords||100}"></label>`:`<label>Câu giữ nguyên<textarea ${attr('text')}>${esc(row.text||'')}</textarea></label>${row.kind==='template'?`<label>Chỗ trống và maxWords (JSON)<textarea ${attr('slots')}>${esc(JSON.stringify(row.slots||{}))}</textarea></label>`:`<label>SFX · không đọc<input ${attr('sfx')} value="${esc(row.sfx||'')}"></label>`}`}<div class="actions">${btn('↑','plan-up','small',`data-plan="${key}" data-index="${i}"`)}${btn('↓','plan-down','small',`data-plan="${key}" data-index="${i}"`)}${btn('Xoá đoạn','plan-remove','small',`data-plan="${key}" data-index="${i}"`)}</div><details open><summary>Xem trước</summary><p>${esc(row.kind==='ai'?`[AI ≤ ${row.maxWords} từ] ${row.instruction||''}`:row.text||'')}</p>${row.sfx?`<p>SFX riêng: ${esc(row.sfx)}</p>`:''}</details></article>`;}).join('')}${btn('Thêm đoạn','plan-add','',`data-plan="${key}"`)}</section>`).join('')}</section>`;
}
export function planSegmentContext(value){
 if(!['ai','template'].includes(value.kind))throw Error('Loại đoạn AI không hợp lệ.');
 const context={kind:value.kind,topic:String(value.topic||'').slice(0,300),language:String(value.language||'vi').slice(0,30),openingScene:String(value.openingScene||'').slice(0,1600),outlineTitles:(Array.isArray(value.outlineTitles)?value.outlineTitles:[]).slice(0,12).map(x=>String(x).slice(0,80)),selectedTitle:String(value.selectedTitle||value.topic||'').slice(0,300),...(Array.isArray(value.bodyTitles)?{bodyTitles:value.bodyTitles.slice(0,12).map(x=>String(x).slice(0,80))}:{})};
 if(value.kind==='ai'){if(typeof value.instruction!=='string'||!value.instruction.trim()||value.instruction.length>2000||!Number.isInteger(value.maxWords)||value.maxWords<1||value.maxWords>1000)throw Error('Cần instruction và maxWords hợp lệ.');Object.assign(context,{instruction:value.instruction,maxWords:value.maxWords,voice:String(value.voice||'').slice(0,1600),supportedFacts:(Array.isArray(value.supportedFacts)?value.supportedFacts:[]).slice(0,3).map(x=>({claim:String(x.claim||'').slice(0,300)}))});}
 else {if(!value.slots||typeof value.slots!=='object'||Array.isArray(value.slots)||!Object.keys(value.slots).length||Object.keys(value.slots).length>20||Object.entries(value.slots).some(([key,n])=>!/^[_\p{L}\p{N}]{1,60}$/u.test(key)||!Number.isInteger(n)||n<1||n>100))throw Error('Chỗ trống/maxWords không hợp lệ.');context.slots=value.slots;}
 return context;
}
export function validatePlanSegmentOutput(output,context){
 if(context.kind==='ai'){if(typeof output?.text!=='string'||!output.text.trim()||words(output.text).length>context.maxWords)throw Error(`Đoạn AI tối đa ${context.maxWords} từ.`);}
 else {for(const [key,n] of Object.entries(context.slots)){const text=output?.fills?.[key];if(typeof text!=='string'||!text.trim()||words(text).length>n)throw Error(`Chỗ trống ${key} tối đa ${n} từ.`);}}
 return output;
}
