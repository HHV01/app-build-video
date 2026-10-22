export const TASK_TIERS=Object.freeze(Object.fromEntries([...['sceneTags','scenes','animation','groups','templates','identity','angles','rosterExtras','translatePrompts'].map(a=>[a,'light']),...['research','outline','script','ideas','topics','packaging','planSegment','scriptReview','sceneReview'].map(a=>[a,'heavy'])]));
const AUTO_MODELS={deepseek:'deepseek/deepseek-chat',xai:'xai/grok-3',gemini:'gemini/gemini-2.5-flash',groq:'groq/openai/gpt-oss-120b'};
const canonicalModel=model=>String(model||'').replace(/^grok\//,'xai/');
export function selectTaskModels(settings,action,availableProviders=[]){
  if(!TASK_TIERS[action]&&action!=='test')throw Error('Tác vụ chưa phân loại model: '+action);
  const light=TASK_TIERS[action]==='light'&&settings.lightModel?.trim();
  const primary=light?settings.lightModel:settings.model;
  const auto=settings.autoFallback===true;
  const backups=auto?[...(light?settings.lightFallbackModels||[]:settings.fallbackModels||[])]:[];
  // A saved key is enough: append one sensible model per configured provider, without asking the user to wire the chain.
  if(auto){
    const present=new Set([primary,...backups].map(canonicalModel));
    for(const provider of ['deepseek','xai','gemini','groq']){
      const candidate=AUTO_MODELS[provider];
      if(availableProviders.includes(provider)&&candidate&&!present.has(canonicalModel(candidate))&&backups.length<3){backups.push(candidate);present.add(canonicalModel(candidate));}
    }
  }
  return {primary,backups};
}
export function createUsageCounter(){const values=new Map();return {record(action,model,usage={},switched=false){const key=JSON.stringify([action,model]),row=values.get(key)||{action,model,calls:0,inputTokens:0,outputTokens:0,totalTokens:0,switches:0};row.calls++;row.switches+=Number(switched);row.inputTokens+=Number(usage?.prompt_tokens)||0;row.outputTokens+=Number(usage?.completion_tokens)||0;row.totalTokens+=Number(usage?.total_tokens)||((Number(usage?.prompt_tokens)||0)+(Number(usage?.completion_tokens)||0));values.set(key,row);},rows(){return [...values.values()].map(x=>({...x}));}};}
