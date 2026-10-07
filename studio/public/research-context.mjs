// Only evaluated research is passed to writing; uncertain evidence is never assertable.
export function researchContext(p={}) {
 const evidence=rows=>(Array.isArray(rows)?rows:[]).filter(x=>['supported','needs_check'].includes(x.status)).map(x=>({...x,assertable:x.status==='supported',...(x.status==='needs_check'?{warning:'Chưa kiểm chứng: không được khẳng định trong lời kể.'}:{})}));
 return {researchSummary:p.researchSummary||'',researchFacts:evidence(p.researchFacts),researchTimeline:p.researchTimeline||[],researchCast:p.researchCast||[],researchSensory:p.researchSensory||'',claims:evidence(p.claims)};
}
const terms=s=>new Set(String(s||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
export function scriptPartContext(c,p,part,index,count,parts=[]) {
 const research=researchContext(p), focus=terms(JSON.stringify(part.focus));
 const related=x=>[...terms(JSON.stringify(x))].some(w=>focus.has(w));
 const select=rows=>rows.filter(related);
 return {nicheLock:c.nicheLock,topic:p.topic,language:c.language,angle:c.angle,audience:c.audience,voice:c.identity?.voice,hookPattern:c.identity?.hook,structure:p.structure,includeCTA:Boolean(p.includeCTA),selectedTitle:p.packaging?.[p.selectedPackaging||0]?.title||p.topic,
  researchSummary:research.researchSummary,researchFacts:select(research.researchFacts),claims:select(research.claims),researchTimeline:select(research.researchTimeline),researchCast:select(research.researchCast),researchSensory:research.researchSensory,
  outlineFocus:part.focus,targetWords:part.targetWords,scriptPart:{...part,index:index+1,count},previousSummaries:parts.map(text=>String(text).match(/[^.!?]+[.!?]?/g)?.slice(0,2).join('').slice(0,360)||''),previousEnding:parts.at(-1)?.slice(-700)||''};
}
