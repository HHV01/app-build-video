import {scriptTargetOrZero} from '../production.mjs';
export const TICH_BRAND=Object.freeze({channel:'Tích Thông Thái',presenter:'Tích',tagline:'Chuyện quen. Góc nhìn lạ.'});
const plain=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
export function tichBrand(channel={}){return plain(channel.name)==='tich thong thai'?{...TICH_BRAND}:null;}
export function finalizeScriptMetadata(channel,project){
 const tokens=String(project.narration||'').trim().split(/\s+/).filter(Boolean);
 project.scriptMetrics={wordCount:tokens.length,targetWords:scriptTargetOrZero(project),targetSource:project.targetWords!=null&&String(project.targetWords).trim()!==''?'words':'minutes',method:'whitespace',estimatedMinutes:tokens.length/150,wordsPerMinute:150,timing:'estimate',verification:'research-context-only'};
 if(!tichBrand(channel))return;
 const start=plain(tokens.slice(0,180).join(' ')),end=plain(tokens.slice(-220).join(' '));
 const warnings=[];
 if(!/minh la tich|tich thong thai/.test(start))warnings.push('Mở đầu còn thiếu giới thiệu Tích/kênh.');
 if(!/dang ky|theo doi/.test(start))warnings.push('Mở đầu còn thiếu lời mời theo dõi sau hook.');
 if(!/binh luan/.test(end)||!tokens.slice(-220).join(' ').includes('?'))warnings.push('Kết còn thiếu câu hỏi bình luận cụ thể.');
 if(!/dang ky|theo doi/.test(end))warnings.push('Kết còn thiếu lời mời theo dõi/đăng ký.');
 if(!end.endsWith(plain(TICH_BRAND.tagline)))warnings.push('Kết cần khép bằng tagline: '+TICH_BRAND.tagline);
 project.scriptWarnings=[...new Set([...(project.scriptWarnings||[]),...warnings])];
}


export function brandPartIssues(text,context={}){
 if(context.channelBrand?.channel!==TICH_BRAND.channel)return [];
 const normalized=plain(text),issues=[];
 if(context.openingCTA&&!context.planManagedOpening&&context.scriptPart?.index===1){
  if(!/minh la tich|tich thong thai/.test(normalized))issues.push('Giới thiệu ngắn Tích/kênh sau hook.');
  if(!/dang ky|theo doi/.test(normalized))issues.push('Mời theo dõi một câu sau hook, trước khi chuyển vào thân bài.');
 }
 if(context.includeCTA&&!context.planManagedClosing&&context.scriptPart?.index===context.scriptPart?.count){
  if(!text.includes('?')||!/binh luan/.test(normalized))issues.push('Thêm một câu hỏi bình luận cụ thể liên quan chủ đề.');
  if(!/dang ky|theo doi/.test(normalized))issues.push('Mời theo dõi/đăng ký ngắn ở cuối.');
  if(!normalized.endsWith(plain(TICH_BRAND.tagline)))issues.push('Kết đúng tagline: '+TICH_BRAND.tagline);
 }
 return issues;
}
