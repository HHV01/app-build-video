export function isJSONGenerationFailure(error){
  return error?.invalidAIJSON===true || (error?.upstreamStatus===400 && (error.upstreamCode==='json_validate_failed' || /failed to validate JSON|JSON generation failed/i.test(error.message||'')));
}
export function normalizeFallbackModels(models) {
  if(!Array.isArray(models)||models.length>3||models.some(m=>typeof m!=='string'||!m.trim()||m.length>200))throw Object.assign(Error('Danh sách dự phòng cần tối đa 3 model, mỗi dòng một model.'),{status:400});
  return [...new Set(models.map(m=>m.trim()))];
}
export const MODEL_COOLDOWN_MS=10*60*1000;
export const modelCooldowns=new Map();
let lastFallback=null,activeFallback=null;
export function classifyAIError(e){
  if(isJSONGenerationFailure(e)) return 'switch';
  if(e?.outputTruncated===true) return 'switch';
  const us=e?.upstreamStatus;
  if(us===0||us===401||us===402||us===403||us===404||us===429||us===500||us===502||us===503||us===504) return 'switch';
  if(e?.status===428&&us==null) return 'switch';
  if(us===400||us===422) return 'stop';
  return 'switch';
}
export function aiErrorReason(e){
  if(e?.outputTruncated)return 'truncated';
  if(isJSONGenerationFailure(e))return 'json';
  const us=e?.upstreamStatus;
  if(us===0)return 'timeout';
  if(us===401||us===403)return 'auth';
  if(us===402)return 'credit';
  if(us===404)return 'model_not_found';
  if(us===429)return 'quota';
  if(e?.status===428)return 'missing_key';
  return 'overload';
}
export function formatFallbackHint(attempt,total,model){if(attempt<=1)return '';return `Đang thử model dự phòng (${attempt}/${total}): ${model}`;}
export function getAIStatus(now=Date.now()){
  return {cooldowns:[...modelCooldowns].filter(([,v])=>v.until>now).map(([model,v])=>({model,...v,remainingMs:v.until-now})),fallback:activeFallback||lastFallback};
}
export function clearAICooldowns(cooldowns=modelCooldowns){cooldowns.clear();}
export function setAICooldownNow(v){_now=v;}
let _now=null;
async function timed(fn,ms){
  const controller=new AbortController();
  let timer;
  try{return await Promise.race([
    Promise.resolve().then(()=>fn(controller.signal)),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('Hết thời gian chờ model.'),{upstreamStatus:0}));},ms);})
  ]);}finally{clearTimeout(timer);}
}
export async function withModelFallback(primary,backups,execute,options={}){
  const nowFn=typeof options.now==='function'?options.now:()=>_now??Date.now();
  const cooldowns=options.cooldowns||modelCooldowns;
  const timeoutFn=options.timeout||timed;
  const normalized=normalizeFallbackModels(backups);
  const models=[...new Set([primary,...normalized])];
  const attempts=[];
  const deadline=nowFn()+90000;
  let available=models.filter(m=>!cooldowns.has(m)||cooldowns.get(m).until<=nowFn());
  if(!available.length){
    const best=models.reduce((a,b)=>cooldowns.get(a).until<=cooldowns.get(b).until?a:b);
    available=[best];
  }
  for(const model of models){
    if(!available.includes(model)){
      const rest=cooldowns.get(model);
      if(rest) attempts.push({model,status:rest.status,reason:rest.reason});
    }
  }
  try{
    for(const model of available){
      const remaining=deadline-nowFn();
      if(remaining<=0) break;
      activeFallback={requestedModel:primary,selectedModel:model,used:model!==primary,attempts:[...attempts]};
      try{
        const ms=Math.min(remaining,models.length>1?30000:90000);
        const result=await timeoutFn(signal=>execute(model,{signal,timeoutMs:ms}),ms);
        cooldowns.delete(model);
        lastFallback={used:model!==primary,requestedModel:primary,selectedModel:model,attempts};
        return {...result,model:result.model||model,fallback:lastFallback};
      }catch(e){
        if(classifyAIError(e)==='stop') throw e;
        const status=e.upstreamStatus??e.status;
        const reason=aiErrorReason(e);
        attempts.push({model,status,reason});
        if([429,402,403].includes(status)){
          cooldowns.set(model,{until:nowFn()+MODEL_COOLDOWN_MS,status,reason});
        }
      }
    }
    lastFallback={used:false,requestedModel:primary,selectedModel:null,attempts};
    const msg='Các model chưa trả được kết quả: '+attempts.map(x=>`${x.model} (${x.status}: ${x.reason})`).join(' → ')+'. Không nhận được JSON hợp lệ hoặc phản hồi hoàn chỉnh. Nội dung đã lưu được giữ. Thử lại sau.';
    throw Object.assign(new Error(msg),{status:503,attempts});
  }finally{
    activeFallback=null;
  }
}