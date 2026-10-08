import {scriptPlan} from '../production.mjs';
import {researchContext,scriptPartContext} from './research-context.mjs';
import {filterEditorNotes,writeCheckedPart} from './script-quality.mjs';
export function scriptDraftStatus(c,p){
 let total=0;try{total=scriptPlan(p.outline,p.minutes).length;}catch{}
 const draft=p.scriptDraft;
 return {completed:draft?.parts?.length||0,total,text:(draft?.parts||[]).join('\n\n'),error:draft?.error||''};
}
export async function writeOutlineScript(c,p,{generate,save,onProgress=()=>{}}){
 const plan=scriptPlan(p.outline,p.minutes);
 const basis=JSON.stringify({research:researchContext(p),context:scriptPartContext(c,p,plan[0],0,plan.length),plan});
 if(p.scriptDraft?.basis!==basis)p.scriptDraft={basis,parts:[],notes:[]};
 const draft=p.scriptDraft;delete draft.error;
 try{
  for(let i=draft.parts.length;i<plan.length;i++){
   onProgress(`Đang viết phần ${i+1}/${plan.length} · đã lưu ${draft.parts.length} phần`);
   const result=await writeCheckedPart(ctx=>generate('script',ctx),scriptPartContext(c,p,plan[i],i,plan.length,draft.parts));
   if(result.warning){draft.warnings||=[];draft.warnings.push('Phần '+(i+1)+': '+result.warning);}
   draft.parts.push(result.narration.trim());draft.notes.push(...(result.editorNotes||[]));await save();
  }
  if(p.narration)p.previousNarration=p.narration;
  p.scriptParts=[...draft.parts];p.scriptWarnings=draft.warnings||[];p.narration=draft.parts.join('\n\n');
  p.editorNotes=filterEditorNotes(draft.notes,(p.sources||[]).map(s=>s.title||s.name||'').filter(Boolean));
  p.approved=(p.approved||[]).filter(x=>x<3);p.rosterReviewed=false;p.rosterConfirmed=false;delete p.scriptDraft;await save();
 }catch(e){if(p.scriptDraft===draft){draft.error=e.message;await save();}throw e;}
 return p.narration;
}
