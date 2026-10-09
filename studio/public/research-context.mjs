// Only evaluated research is passed to writing; uncertain evidence is never assertable.
export function researchRows(value,kind) {
 if(Array.isArray(value))return value;if(typeof value!=='string'||!value.trim())return [];
 try{const rows=JSON.parse(value);if(Array.isArray(rows))return rows;}catch{}
 return value.split('\n').filter(x=>x.trim()).map(line=>{const [a,b,c]=line.split('|').map(x=>x.trim());return kind==='timeline'?{date:a,event:b||a,sourceId:c||''}:kind==='cast'?{name:a,role:b||'',sourceId:c||''}:{claim:a,sourceId:b||'',status:c==='supported'?'supported':'needs_check'};});
}
export function researchContext(p={}) {
 const evidence=rows=>researchRows(rows,'facts').filter(x=>['supported','needs_check'].includes(x.status)).map(x=>({...x,assertable:x.status==='supported',...(x.status==='needs_check'?{warning:'Chưa kiểm chứng: không được khẳng định trong lời kể.'}:{})}));
 return {researchSummary:p.researchSummary||'',researchFacts:evidence(p.researchFacts),researchTimeline:researchRows(p.researchTimeline,'timeline'),researchCast:researchRows(p.researchCast,'cast'),researchSensory:p.researchSensory||'',claims:evidence(p.claims)};
}
const terms=s=>new Set(String(s||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
export function openingHookFor(p={}) { return p.openingHook?.trim()||p.packaging?.[p.selectedPackaging||0]?.hook||''; }
export function scriptPartContext(c,p,part,index,count,parts=[]) {
 const research=researchContext(p), focus=terms(JSON.stringify(part.focus));
 const related=x=>[...terms(JSON.stringify(x))].some(w=>focus.has(w));
 const select=rows=>rows.filter(related);
 const openingTerms=terms([openingHookFor(p),p.topic,c.angle].filter(Boolean).join(' '));
 const openingEvidence=[...research.researchFacts,...research.claims].filter(x=>x.assertable&&[...terms(x.claim)].some(w=>openingTerms.has(w))).filter((x,i,rows)=>rows.findIndex(y=>y.claim===x.claim)===i).slice(0,3);
 const summarize=text=>String(text).match(/[^.!?]+[.!?]?/g)?.slice(0,2).join('').slice(0,240)||'';
 const previousSummaries=parts.slice(-4).map(summarize),earlierSummary=parts.length>4?('đã nói: '+parts.slice(0,-4).map(summarize).join(' / ')).slice(0,Math.min(300,1200-previousSummaries.join('').length)):'';
 return {nicheLock:c.nicheLock,topic:p.topic,language:c.language,angle:c.angle,audience:c.audience,voice:c.identity?.voice,hookPattern:c.identity?.hook,structure:p.structure||c.identity?.structure,includeCTA:!c.closingPlan?.length&&Boolean(p.includeCTA)&&index===count-1,...(index===0?{openingHook:openingHookFor(p)}:{}),selectedTitle:p.packaging?.[p.selectedPackaging||0]?.title||p.topic,
  researchSummary:research.researchSummary,researchFacts:select(research.researchFacts),claims:select(research.claims),researchTimeline:select(research.researchTimeline),researchCast:select(research.researchCast),researchSensory:research.researchSensory,
  ...(index===0?{openingEvidence}:{}),...(index===count-1?{closingQuestion:p.outline?.[0]?.question||openingHookFor(p)}:{}),
  outlineFocus:part.focus,targetWords:part.targetWords,scriptPart:{...part,index:index+1,count},previousSummaries,...(earlierSummary?{earlierSummary}:{}),previousEnding:parts.at(-1)?.slice(-700)||''};
}
