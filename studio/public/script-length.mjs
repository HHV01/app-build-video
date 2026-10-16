import {scriptTarget,scriptPlan} from '../production.mjs';
import {scriptPartContext,researchContext} from './research-context.mjs';
import {cleanNarration,repeatedNarration,writeCheckedPart} from './script-quality.mjs';
const count=text=>String(text||'').trim().split(/\s+/).filter(Boolean).length;

function insertion(text,ratio){
 const paragraphs=Array.from(text.matchAll(/\n\s*\n/g)).map(m=>m.index);
 if(paragraphs.length>=2){const index=Math.min(paragraphs.length-2,Math.max(0,Math.round((paragraphs.length-2)*ratio)));return paragraphs[index];}
 const boundaries=Array.from(text.matchAll(/(?<=[.!?…])\s+/gu)).map(m=>m.index).filter(at=>at>text.length*.15&&at<text.length*.85);
 if(!boundaries.length)throw Error('Bản nháp chưa có ranh giới thân bài rõ để bổ sung; hãy ngắt đoạn trước khi tiếp tục.');
 return boundaries.reduce((best,at)=>Math.abs(at-text.length*ratio)<Math.abs(best-text.length*ratio)?at:best,boundaries[0]);
}

// Expand the underdeveloped body, never replace a long script with a summary.
export async function ensureScriptLength(c,p,draft,{generate,save,onProgress=()=>{},maxCalls=32}){
 const target=scriptTarget(p),lower=Math.ceil(target*.95),upper=Math.floor(target*1.05);
 if(count(draft.narration)>upper)throw Error(`Bản nháp vượt ${upper} từ; cần biên tập gọn trong phạm vi yêu cầu, không tự cắt thành tóm tắt.`);
 if(count(draft.narration)>=lower)return;
 const evidence=researchContext(p),supported=[...evidence.researchFacts,...evidence.claims].filter(x=>x.assertable);
 if(!supported.length)throw Error(`Bản nháp mới có ${count(draft.narration)}/${target} từ. Cần thêm chứng cứ supported trong Research để viết bổ sung có giá trị; chưa coi bản ngắn là hoàn tất.`);
 const outline=p.outline||[];
 if(!outline.length)throw Error('Cần dàn ý để biết phần nào thiếu nội dung trước khi bổ sung.');
 const plan=scriptPlan(outline,p.minutes,150,400,p.targetWords);
 const desired=outline.map((_,i)=>plan.filter(x=>x.segment===i+1).reduce((sum,x)=>sum+x.targetWords,0));
 const initial=Array.isArray(draft.sections)&&draft.sections.length?outline.map((_,i)=>draft.sections.filter(x=>x.segment===i+1).reduce((sum,x)=>sum+count(x.text),0)):desired.map(n=>n*count(draft.narration)/target);
 draft.baseBySection||=initial;draft.addedBySection||=outline.map(()=>0);
 for(let call=0;count(draft.narration)<lower&&call<maxCalls;call++){
  const candidates=outline.map((_,i)=>i).filter(i=>outline.length<=2||(i>0&&i<outline.length-1));
  const index=candidates.reduce((best,i)=>(draft.baseBySection[i]+(draft.addedBySection[i]||0))/Math.max(1,desired[i])<(draft.baseBySection[best]+(draft.addedBySection[best]||0))/Math.max(1,desired[best])?i:best,candidates[0]);
  const missing=target-count(draft.narration),amount=Math.min(400,missing),ratio=outline.length===1?.5:(index+.5)/outline.length;
  let at=insertion(draft.narration,ratio);
  // Never insert inside a user-authored fixed/template paragraph.
  for(const fixed of draft.protectedText||[]){let pos=draft.narration.indexOf(fixed);while(pos>=0){if(at>pos&&at<pos+fixed.length)at=pos;pos=draft.narration.indexOf(fixed,pos+fixed.length);}}
  const left=draft.narration.slice(0,at),right=draft.narration.slice(at);
  const context={...scriptPartContext(c,p,{focus:outline[index],segment:index+1,targetWords:amount},index,outline.length,[]),researchFacts:supported.slice(0,12),claims:[],includeCTA:false,openingCTA:false,planManagedOpening:true,planManagedClosing:true,
   expansion:{missingWords:missing,insertAfter:left.slice(-450),insertBefore:right.slice(0,450),covered:(draft.narration.match(/[^.!?…]+[.!?…]/gu)||[]).filter((_,i)=>i%4===0).slice(0,12).map(s=>s.trim().slice(0,100))}};
  onProgress(`Đang phát triển phần ${index+1}: ${count(draft.narration)}/${target} từ · còn thiếu ${missing}`);
  const result=await writeCheckedPart(async ctx=>{const value=await generate('script',ctx);if(!value.narration?.trim())throw Error('Chưa có đủ chất liệu để viết bổ sung có giá trị. Thêm nguồn Research rồi tiếp tục; bản nháp ngắn chưa hoàn tất.');return value;},context);
  const extra=cleanNarration(result.narration),added=count(extra);
  if(added<Math.max(1,Math.min(20,Math.floor(amount*.5)))||added>Math.ceil(amount*1.25))throw Error('AI chưa bổ sung đủ nội dung đúng ngân sách. Bản nháp được giữ để tiếp tục.');
  if(repeatedNarration(extra,{previousEnding:draft.narration}))throw Error('Đoạn bổ sung lặp nội dung đang có; chưa chấp nhận để bù số từ.');
  const allowed=new Set((draft.narration+' '+JSON.stringify(supported)).match(/\d+(?:[.,]\d+)*/g)||[]);
  if((extra.match(/\d+(?:[.,]\d+)*/g)||[]).some(n=>!allowed.has(n)))throw Error('Đoạn bổ sung có số liệu mới chưa có trong chứng cứ; giữ bản nháp để kiểm tra.');
  if(count(draft.narration)+added>upper)throw Error('Đoạn bổ sung vượt số từ cho phép; chưa thay bản nháp.');
  draft.narration=left.trimEnd()+'\n\n'+extra+'\n\n'+right.trimStart();draft.addedBySection[index]=(draft.addedBySection[index]||0)+added;
  draft.editorNotes=[...(draft.editorNotes||[]),...(result.editorNotes||[])];await save();
 }
 if(count(draft.narration)<lower)throw Error(`Đã lưu ${count(draft.narration)}/${target} từ. Bấm tiếp tục để phát triển phần còn thiếu; chưa hoàn tất.`);
}
