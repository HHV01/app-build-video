export const AI_TOKEN_BUDGET = {
  sceneTags: 600,
  rosterExtras: 1200,
  groups: 2500,
  packaging: 3500,
  identity: 1800,
  ideas: 4000,
  topics: 3000,
  research: 4500,
  outline: 1800,
  script: 2000,
};

export function tokenBudget(action, fallback = 2000) {
  return AI_TOKEN_BUDGET[action] || fallback;
}


export function parseRetryAfter(headers,detail='',now=Date.now()){
 const raw=headers.get('retry-after');
 if(raw){const seconds=Number(raw);const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(raw)-now;if(Number.isFinite(ms)&&ms>0)return ms;}
 const text=String(detail).match(/try again in\s+([\d.hms\s]+)/i)?.[1];
 if(text){let ms=0;for(const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)/g))ms+=Number(m[1])*({h:3600000,m:60000,s:1000}[m[2]]);if(ms>0)return ms;}
 return undefined;
}
export function ratePacingMs(headers,usage={}){
 const limit=Number(headers.get('x-ratelimit-limit-tokens')),used=Number(usage.total_tokens??(Number(usage.prompt_tokens||0)+Number(usage.completion_tokens||0)));
 return Number.isFinite(limit)&&limit>0&&Number.isFinite(used)&&used>0?Math.min(60000,Math.ceil(used*60000/limit)):0;
}
