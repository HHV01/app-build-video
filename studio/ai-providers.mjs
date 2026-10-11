export const DIRECT_AI_BASES={gemini:'https://generativelanguage.googleapis.com/v1beta/openai',xai:'https://api.x.ai/v1',groq:'https://api.groq.com/openai/v1'};
const fault=(message,status=400)=>Object.assign(Error(message),{status});
export function resolveAIConnection(settings,keys,env,model){
 const explicit=/^(gemini|xai|grok|groq|gateway)\/(.+)$/.exec(model||'');
 if(explicit?.[1]==='gateway'){settings={...settings,aiMode:'gateway'};model=explicit[2];}
 // Old gateway installations used groq/... as a gateway model ID.
 else if((explicit&&(explicit[1]!=='groq'||settings.aiMode==='direct'||keys.groq||env.GROQ_API_KEY))||settings.aiMode==='direct'){
  const match=/^(gemini|xai|grok|groq)\/(.+)$/.exec(model||'');
  if(!match)throw fault('Model trực tiếp phải có dạng gemini/tên-model hoặc xai/tên-model.');
  const provider=match[1]==='grok'?'xai':match[1],key=keys[provider]||env[{gemini:'GEMINI_API_KEY',xai:'XAI_API_KEY',groq:'GROQ_API_KEY'}[provider]];
  if(!key)throw fault(`Chưa có khóa ${{gemini:'Gemini',xai:'Grok (xAI)',groq:'Groq'}[provider]}. Nhập tại Kết nối API rồi lưu khóa.`,428);
  return {provider,base:DIRECT_AI_BASES[provider],key,model:match[2]};
 }
 if(!env.OPENAI_API_KEY)throw fault('Chưa có cấu hình gateway trong .env.',503);
 const base=(env.OPENAI_BASE_URL||'http://localhost:20128/v1').replace(/\/+$/,'');
 return {provider:'gateway',base,key:env.OPENAI_API_KEY,model:/^https:\/\/api\.groq\.com(?:\/|$)/.test(base)?model.replace(/^groq\//,''):model};
}
export async function sendAICompletion(settings,keys,env,model,payload,request,timeout,signal){
 const connection=resolveAIConnection(settings,keys,env,model);
 const thinking=(connection.provider==='gemini'&&/^gemini-3(?:\.\d+)?-flash(?:-|$)/.test(connection.model))||(connection.provider==='groq'&&/^openai\/gpt-oss-/.test(connection.model))?{reasoning_effort:'low'}:{};
 const call=key=>request(connection.base+'/chat/completions',{method:'POST',signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({...thinking,...payload,model:connection.model})},timeout);
 try{return await call(connection.key);}catch(e){
  const backup=keys.groqBackup||env.GROQ_BACKUP_API_KEY;
  if(connection.provider!=='groq'||!backup||backup===connection.key||![401,403].includes(e.upstreamStatus))throw e;
  return call(backup);
 }
}
export function updatedAIKeys(current,input){
 const updated={...current};
 for(const provider of ['gemini','xai','groq','groqBackup'])if(Object.hasOwn(input,provider)){
  const key=input[provider];if(typeof key!=='string'||key.length>1000||/[\r\n]/.test(key))throw fault('Khóa API phải là chuỗi một dòng, tối đa 1.000 ký tự.');
  if(key.trim())updated[provider]=key.trim();
 }return updated;
}
