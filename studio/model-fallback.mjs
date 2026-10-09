export function isJSONGenerationFailure(error){
 return error?.invalidAIJSON===true || error?.upstreamStatus===400 && (error.upstreamCode==='json_validate_failed' || /failed to validate JSON|JSON generation failed/i.test(error.message||''));
}
export function normalizeFallbackModels(models) {
 if(!Array.isArray(models)||models.length>3||models.some(m=>typeof m!=='string'||!m.trim()||m.length>200))throw Object.assign(Error('Danh sách dự phòng cần tối đa 3 model, mỗi dòng một model.'),{status:400});
 return [...new Set(models.map(m=>m.trim()))];
}
export const MODEL_COOLDOWN_MS=10*60*1000;
export const modelCooldowns=new Map();
let lastFallback=null,activeFallback=null;
export function classifyAIError(e){return isJSONGenerationFailure(e)||e.outputTruncated===true||[0,401,402,403,404,429,500,502,503,504].includes(e.upstreamStatus)||(e.status===428&&e.upstreamStatus==null)?'switch':'stop';}
export function aiErrorReason(e){if(e.outputTruncated)return 'truncated';if(isJSONGenerationFailure(e))return 'json';return ({0:'timeout',401:'auth',402:'credit',403:'auth',404:'model_not_found',429:'quota'})[e.upstreamStatus]||(e.status===428?'missing_key':'overload');}
export function getAIStatus(now=Date.now()){return {cooldowns:[...modelCooldowns].filter(([,v])=>v.until>now).map(([model,v])=>({model,...v,remainingMs:v.until-now})),fallback:activeFallback||lastFallback};}
async function timed(fn,ms){const controller=new AbortController();let timer;try{return await Promise.race([Promise.resolve().then(()=>fn(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('Hết thời gian chờ model.'),{upstreamStatus:0}));},ms);})]);}finally{clearTimeout(timer);}}
export async function withModelFallback(primary,backups,execute,options={}){
 const now=options.now||Date.now,cooldowns=options.cooldowns||modelCooldowns,timeout=options.timeout||timed;
 const models=[...new Set([primary,...normalizeFallbackModels(backups)])],attempts=[],deadline=now()+90000;
 let available=models.filter(m=>!cooldowns.has(m)||cooldowns.get(m).until<=now());
 if(!available.length)available=[models.reduce((a,b)=>cooldowns.get(a).until<=cooldowns.get(b).until?a:b)];
 for(const model of models)if(!available.includes(model)){const rest=cooldowns.get(model);attempts.push({model,status:rest.status,reason:rest.reason});}
 try{for(const model of available){
  const remaining=deadline-now();if(remaining<=0)break;
  activeFallback={requestedModel:primary,selectedModel:model,used:model!==primary,attempts:[...attempts]};
  try{const result=await timeout(signal=>execute(model,{signal,timeoutMs:Math.min(remaining,models.length>1?30000:90000)}),Math.min(remaining,models.length>1?30000:90000));cooldowns.delete(model);
   lastFallback={used:model!==primary,requestedModel:primary,selectedModel:model,attempts};return {...result,model:result.model||model,fallback:lastFallback};
  }catch(e){if(classifyAIError(e)==='stop')throw e;const status=e.upstreamStatus??e.status,reason=aiErrorReason(e);attempts.push({model,status,reason});if([429,402,403].includes(status))cooldowns.set(model,{until:now()+MODEL_COOLDOWN_MS,status,reason});}
 }
 lastFallback={used:false,requestedModel:primary,selectedModel:null,attempts};
 throw Object.assign(Error('Các model chưa trả được kết quả: '+attempts.map(x=>`${x.model} (${x.status}: ${x.reason})`).join(' → ')+'. Không nhận được JSON hợp lệ hoặc phản hồi hoàn chỉnh. Nội dung đã lưu được giữ. Thử lại sau.'),{status:503});
 }finally{activeFallback=null;}
}
