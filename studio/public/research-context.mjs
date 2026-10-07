// Only evaluated research is passed to writing; uncertain evidence is never assertable.
export function researchContext(p={}) {
 const evidence=rows=>(Array.isArray(rows)?rows:[]).filter(x=>['supported','needs_check'].includes(x.status)).map(x=>({...x,assertable:x.status==='supported',...(x.status==='needs_check'?{warning:'Chưa kiểm chứng: không được khẳng định trong lời kể.'}:{})}));
 return {researchSummary:p.researchSummary||'',researchFacts:evidence(p.researchFacts),researchTimeline:p.researchTimeline||[],researchCast:p.researchCast||[],researchSensory:p.researchSensory||'',claims:evidence(p.claims)};
}
