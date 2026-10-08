export function isJSONGenerationFailure(error){
 return error?.invalidAIJSON===true || error?.upstreamStatus===400 && (error.upstreamCode==='json_validate_failed' || /failed to validate JSON|JSON generation failed/i.test(error.message||''));
}
export function normalizeFallbackModels(models) {
 if(!Array.isArray(models)||models.length>3||models.some(m=>typeof m!=='string'||!m.trim()||m.length>200))throw Object.assign(Error('Danh sách dự phòng cần tối đa 3 model, mỗi dòng một model.'),{status:400});
 return [...new Set(models.map(m=>m.trim()))];
}
export async function withModelFallback(primary, backups, execute) {
 const models=[...new Set([primary,...normalizeFallbackModels(backups)])], attempts=[];
 for(const model of models){
  try {const result=await execute(model);return {...result,model:result.model||model,fallback:{used:model!==primary,requestedModel:primary,selectedModel:model,attempts}};}
  catch(e){
   if(![0,429,500,502,503,504].includes(e.upstreamStatus)&&!isJSONGenerationFailure(e)&&e.outputTruncated!==true)throw e;
   attempts.push({model,status:e.upstreamStatus});
   if(model===models.at(-1))throw Object.assign(Error((e.outputTruncated===true?'Model vẫn cắt dở đầu ra sau khi thử lại: ':isJSONGenerationFailure(e)?'AI chưa tạo được JSON hợp lệ sau khi thử lại và chuyển model: ':'Các model tạm thời chưa phản hồi: ')+attempts.map(x=>x.model+' ('+x.status+')').join(' → ')+'. Cảnh/nội dung đã lưu được giữ. Thử lại sau.'),{status:503});
  }
 }
}
