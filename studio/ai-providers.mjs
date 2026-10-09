export const DIRECT_AI_BASES={gemini:'https://generativelanguage.googleapis.com/v1beta/openai',xai:'https://api.x.ai/v1'};
const fault=(message,status=400)=>Object.assign(Error(message),{status});
export function resolveAIConnection(settings,keys,env,model){
 const explicit=/^(gemini|xai|grok|gateway)\/(.+)$/.exec(model||'');
 if(explicit?.[1]==='gateway'){settings={...settings,aiMode:'gateway'};model=explicit[2];}
 else if(explicit||settings.aiMode==='direct'){
  const match=/^(gemini|xai|grok)\/(.+)$/.exec(model||'');
  if(!match)throw fault('Model trực tiếp phải có dạng gemini/tên-model hoặc xai/tên-model.');
  const provider=match[1]==='grok'?'xai':match[1],key=keys[provider]||env[provider==='gemini'?'GEMINI_API_KEY':'XAI_API_KEY'];
  if(!key)throw fault(`Chưa có khóa ${provider==='gemini'?'Gemini':'Grok (xAI)'}. Nhập tại Kết nối API rồi lưu khóa.`,428);
  return {provider,base:DIRECT_AI_BASES[provider],key,model:match[2]};
 }
 if(!env.OPENAI_API_KEY)throw fault('Chưa có cấu hình gateway trong .env.',503);
 const base=(env.OPENAI_BASE_URL||'http://localhost:20128/v1').replace(/\/+$/,'');
 return {provider:'gateway',base,key:env.OPENAI_API_KEY,model:/^https:\/\/api\.groq\.com(?:\/|$)/.test(base)?model.replace(/^groq\//,''):model};
}
export async function sendAICompletion(settings,keys,env,model,payload,request,timeout,signal){
 const connection=resolveAIConnection(settings,keys,env,model);
 return request(connection.base+'/chat/completions',{method:'POST',signal,headers:{Authorization:'Bearer '+connection.key,'Content-Type':'application/json'},body:JSON.stringify({...payload,model:connection.model})},timeout);
}
export function updatedAIKeys(current,input){
 const updated={...current};
 for(const provider of ['gemini','xai'])if(Object.hasOwn(input,provider)){
  const key=input[provider];if(typeof key!=='string'||key.length>1000||/[\r\n]/.test(key))throw fault('Khóa API phải là chuỗi một dòng, tối đa 1.000 ký tự.');
  if(key.trim())updated[provider]=key.trim();
 }return updated;
}
