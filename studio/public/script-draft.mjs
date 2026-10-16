import {finalizeScriptMetadata} from './script-policy.mjs';
import {scriptPlan,scriptTarget} from '../production.mjs';
import {researchContext,scriptPartContext,legacyScriptPartContext} from './research-context.mjs';
import {filterEditorNotes,writeCheckedPart} from './script-quality.mjs';
export function scriptDraftStatus(c,p){
 let total=0;try{total=(p.scriptDraft?.plan||scriptPlan(p.outline,p.minutes,150,p.scriptDraft?320:400,p.targetWords)).length;}catch{}
 const draft=p.scriptDraft;
 return {completed:draft?.parts?.length||0,total,text:(draft?.parts||[]).join('\n\n'),error:draft?.error||''};
}
export async function writeOutlineScript(c,p,{generate,save,onProgress=()=>{}}){
 const batchWords=p.scriptDraft?.batchWords||(p.scriptDraft?320:400),plan=scriptPlan(p.outline,p.minutes,150,batchWords,p.targetWords);
 const basis=JSON.stringify({research:researchContext(p),context:legacyScriptPartContext(c,p,plan[0],0,plan.length),plan});
 if(p.scriptDraft?.basis!==basis)p.scriptDraft={basis,batchWords,plan:structuredClone(plan),parts:[],notes:[]};
 const draft=p.scriptDraft;delete draft.error;
 try{
  for(let i=draft.parts.length;i<plan.length;i++){
   onProgress(`Đang viết phần ${i+1}/${plan.length} · đã lưu ${draft.parts.length} phần`);
   const pending=plan.slice(i).reduce((n,x)=>n+x.targetWords,0),left=scriptTarget(p)-draft.parts.reduce((n,x)=>n+x.trim().split(/\s+/).length,0);
   const part={...plan[i],targetWords:Math.max(1,Math.min(600,Math.round(left*plan[i].targetWords/pending)))};
   const result=await writeCheckedPart(ctx=>generate('script',ctx),scriptPartContext(c,p,part,i,plan.length,draft.parts));
   if(result.warning){draft.warnings||=[];draft.warnings.push('Phần '+(i+1)+': '+result.warning);}
   draft.parts.push(result.narration.trim());draft.notes.push(...(result.editorNotes||[]));await save();
  }
  if(p.narration)p.previousNarration=p.narration;
  p.scriptSections=draft.parts.map((text,i)=>({segment:plan[i].segment,text}));p.scriptParts=[...draft.parts];p.scriptWarnings=draft.warnings||[];p.narration=draft.parts.join('\n\n');
  p.editorNotes=filterEditorNotes(draft.notes,(p.sources||[]).map(s=>s.title||s.name||'').filter(Boolean));
  finalizeScriptMetadata(c,p);
  p.approved=(p.approved||[]).filter(x=>x<3);p.rosterReviewed=false;p.rosterConfirmed=false;delete p.scriptDraft;await save();
 }catch(e){if(p.scriptDraft===draft){draft.error=e.message;await save();}throw e;}
 return p.narration;
}
