import {tichBrand} from './script-policy.mjs';
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
// Ngân sách nguồn cho một lượt kiểm kê claim: chỉ gửi đúng thứ AI cần đọc.
export const RESEARCH_MAX_SOURCES=8, RESEARCH_MAX_PER_SOURCE=8000, RESEARCH_MAX_TOTAL=30000;
export function sanitizeResearchContext(ctx={}){
 const seen=new Set(), picked=[];
 for(const s of (Array.isArray(ctx.sources)?ctx.sources:[])){
  if(!s||typeof s.text!=='string'||!s.text.trim())continue;
  const text=s.text.trim();
  if(seen.has(text))continue; seen.add(text);
  picked.push({name:String(s.name||'nguồn').slice(0,120),url:String(s.url||'').slice(0,500),text:text.slice(0,RESEARCH_MAX_PER_SOURCE)});
  if(picked.length>=RESEARCH_MAX_SOURCES)break;
 }
 let total=0; const sources=[];
 for(const s of picked){ if(total>=RESEARCH_MAX_TOTAL)break; const room=RESEARCH_MAX_TOTAL-total; sources.push({...s,text:s.text.slice(0,room)}); total+=Math.min(s.text.length,room); }
 return {topic:String(ctx.topic||'').slice(0,300),language:String(ctx.language||'vi').slice(0,30),researchAngle:String(ctx.researchAngle||'').slice(0,500),sources};
}
export function openingHookFor(p={}) { return p.openingHook?.trim()||p.packaging?.[p.selectedPackaging||0]?.hook||''; }
const summaryCache=new Map();
function cachedSummarize(text){
 const key=String(text);
 let hit=summaryCache.get(key);
 if(hit===undefined){hit=key.match(/[^.!?]+[.!?]?/g)?.slice(0,2).join('').slice(0,240)||'';if(summaryCache.size>=500)summaryCache.delete(summaryCache.keys().next().value);summaryCache.set(key,hit);}
 return hit;
}
export function legacyScriptPartContext(c,p,part,index,count,parts=[]) {
 const research=researchContext(p), focus=terms(JSON.stringify(part.focus));
 const related=x=>[...terms(JSON.stringify(x))].some(w=>focus.has(w));
 const select=rows=>rows.filter(related);
 const openingTerms=terms([openingHookFor(p),p.topic,c.angle].filter(Boolean).join(' '));
 const openingEvidence=[...research.researchFacts,...research.claims].filter(x=>x.assertable&&[...terms(x.claim)].some(w=>openingTerms.has(w))).filter((x,i,rows)=>rows.findIndex(y=>y.claim===x.claim)===i).slice(0,3);
 const summarize=cachedSummarize;
 const previousSummaries=parts.slice(-4).map(summarize),earlierSummary=parts.length>4?('đã nói: '+parts.slice(0,-4).map(summarize).join(' / ')).slice(0,Math.min(300,1200-previousSummaries.join('').length)):'';
 return {nicheLock:c.nicheLock,topic:p.topic,language:c.language,angle:c.angle,audience:c.audience,voice:c.identity?.voice,hookPattern:c.identity?.hook,structure:p.structure||c.identity?.structure,includeCTA:!c.closingPlan?.length&&Boolean(p.includeCTA)&&index===count-1,...(index===0?{openingHook:openingHookFor(p)}:{}),selectedTitle:p.packaging?.[p.selectedPackaging||0]?.title||p.topic,
  researchSummary:research.researchSummary,researchFacts:select(research.researchFacts),claims:select(research.claims),researchTimeline:select(research.researchTimeline),researchCast:select(research.researchCast),researchSensory:research.researchSensory,
  ...(index===0?{openingEvidence}:{}),...(index===count-1?{closingQuestion:p.outline?.[0]?.question||openingHookFor(p)}:{}),
  outlineFocus:part.focus,targetWords:part.targetWords,scriptPart:{...part,index:index+1,count},previousSummaries,...(earlierSummary?{earlierSummary}:{}),previousEnding:parts.at(-1)?.slice(-700)||''};
}

export function scriptPartContext(c,p,part,index,count,parts=[]){
 const ctx=legacyScriptPartContext(c,p,part,index,count,parts);
 const brand=tichBrand(c);if(brand){ctx.channelBrand=brand;ctx.openingCTA=index===0&&!c.openingPlan?.length;ctx.includeCTA=index===count-1&&!c.closingPlan?.length;}
 const evidenceKeys=['claim','value','status','sourceId','assertable'];
 const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
 for(const key of ['researchFacts','claims','openingEvidence'])if(ctx[key])ctx[key]=ctx[key].map(x=>pick(x,evidenceKeys));
 ctx.researchTimeline=ctx.researchTimeline.map(x=>pick(x,['date','event','sourceId']));
 ctx.researchCast=ctx.researchCast.map(x=>pick(x,['name','role','sourceId']));
 const summary=String(ctx.researchSummary||'').match(/[^.!?]+[.!?]?/g)||[];
 const focus=terms(JSON.stringify(part.focus));const related=summary.filter(x=>[...terms(x)].some(w=>focus.has(w)));
 ctx.researchSummary=(related.length?related:summary.slice(0,2)).join(' ').slice(0,600);
 ctx.researchSensory=String(ctx.researchSensory||'').slice(0,250);
 ctx.previousSummaries=ctx.previousSummaries.map(x=>x.slice(0,160));if(ctx.earlierSummary)ctx.earlierSummary=ctx.earlierSummary.slice(0,180);
 ctx.previousEnding=ctx.previousEnding.slice(-350);
 const segment=Number(part.segment)||index+1,total=Number(part.segmentParts)||1,step=Number(part.segmentPart)||1;
 const title=row=>String(row?.title||'').slice(0,70);
 ctx.storyRoute={beat:total===1?'complete':step===1?'setup':step===total?'consequence':'complication',
  previous:title(p.outline?.[segment-2]),next:title(p.outline?.[segment]),position:`${index+1}/${count}`};


 ctx.outlineIsEvidence=false;
 ctx.evidencePolicy={assertOnlySupported:true,missing:![...ctx.researchFacts,...ctx.claims].some(x=>x.assertable)};
 const positions=parts.length<=24?parts.map((_,i)=>i):Array.from({length:24},(_,i)=>Math.round(i*(parts.length-1)/23));
 ctx.storyLedger=positions.map(i=>({part:i+1,covered:(cachedSummarize(parts[i]).slice(0,45)+' … '+parts[i].trim().slice(-20)).trim()}));
 delete ctx.scriptPart.focus;
 const seen=new Set();for(const key of ['voice','hookPattern','structure']){if(ctx[key]&&seen.has(ctx[key]))delete ctx[key];else if(ctx[key])seen.add(ctx[key]);}
 return ctx;
}
