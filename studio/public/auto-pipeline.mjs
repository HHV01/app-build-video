// Chạy tự động từ chủ đề đã pick: tiêu đề → research (nếu có nguồn) → dàn ý →
// kịch bản → roster → cảnh và prompt. Mỗi bước đều bỏ qua khi đã có kết quả
// nên bấm lại sẽ tiếp tục từ chỗ dở, không làm lại từ đầu. Ảnh, voice và dựng
// MP4 vẫn làm tay ở bước sau (nhập ảnh hàng loạt, nhập voice, Dựng video).
import {suggestRoster,confirmProjectRoster,shouldSuggestRoster} from './roster.mjs';
import {runSceneBatches} from './scene-workflow.mjs';

export const AUTO_STEPS=['Tiêu đề','Research','Dàn ý','Kịch bản','Nhân vật','Cảnh và prompt'];

export async function runAutoPipeline(c,p,{generate,save,writeScript,getContext,shelfTags,joinTags,onProgress=()=>{}}){
 if(!p.topic?.trim())throw Error('Nhập chủ đề trước.');
 const step=text=>onProgress(text);
 // 1. Tiêu đề + thumbnail
 if(!(p.packaging||[]).length){
  step('1/6 · Đề xuất tiêu đề…');
  const {baseTags=[],needsTagExtras=false}=shelfTags();
  const data=await generate('packaging',{...getContext(),needsTagExtras,existingTags:baseTags});
  if(!data.variants?.length)throw Error('AI chưa trả phương án tiêu đề.');
  p.tagText=joinTags([...baseTags,...(baseTags.length<5&&Array.isArray(data.tags)?data.tags:[])]);
  p.packaging=data.variants;p.selectedPackaging=0;p.thumbnailText=data.variants[0].overlay;
  p.approved=(p.approved||[]).filter(x=>x<1);await save();
 }
 // 2. Research (bỏ qua khi chưa có nguồn; kịch bản sẽ viết thận trọng)
 if((p.sources||[]).length&&!(p.claims||[]).length&&!p.researchSummary){
  step('2/6 · Đối chiếu claim…');
  const result=await generate('research',getContext());
  p.claims=result.claims||[];p.researchQuestions=result.questions||[];p.researchSummary=result.summary||'';
  p.researchTimeline=result.timeline||[];p.researchFacts=result.facts||[];p.researchSensory=result.sensory||'';
  p.researchCast=result.cast||[];p.researchAngles=result.angles||[];await save();
 }
 // 3. Dàn ý
 if(!(p.outline||[]).length){
  step('3/6 · Dựng dàn ý…');
  const result=await generate('outline',getContext());
  if(!result.segments?.length)throw Error('AI chưa trả dàn ý.');
  p.outline=result.segments;await save();
 }
 // 4. Kịch bản (viết tiếp nháp cũ nếu còn dở)
 if(!(p.narration||'').trim()){
  step('4/6 · Viết kịch bản…');
  await writeScript();
  if(!(p.narration||'').trim())throw Error('AI chưa trả kịch bản.');
 }
 // 5. Nhân vật + bối cảnh (tự nhận đề xuất của AI)
 if(!p.rosterConfirmed){
  step('5/6 · Chốt nhân vật…');
  if(shouldSuggestRoster(c,p))await suggestRoster(c,p,{generate},true);
  p.rosterReviewed=true;
  try{confirmProjectRoster(c,p);}
  catch(e){p.rosterReviewed=false;await save();throw Error('Nhân vật chưa đạt ('+e.message+'). Mở bước Nhân vật để duyệt tay rồi bấm Chạy tự động tiếp.');}
  if(!(p.approved||[]).includes(4))p.approved.push(4);await save();
 }
 // 6. Cảnh và prompt
 step('6/6 · Tạo cảnh và prompt…');
 await runSceneBatches(p,{generate,save,channel:c,combined:true,onProgress:step});
 for(const s of [0,1,2,3,4])if(!(p.approved||[]).includes(s))p.approved.push(s);
 p.step=5;await save();
 return {scenes:(p.scenes||[]).length};
}
