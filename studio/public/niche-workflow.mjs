// Chain ordinary API stages; a failed gate never starts the next request.
export async function runNicheSequence(actions, execute) {
  let result;
  for (const { stage, extras = {} } of actions) {
    result = await execute(stage, extras);
    if (result?.passed !== true) break;
  }
  return result;
}

// An intentionally cleared input stays empty; old surveys can reuse suggestions.
export function probeQueriesFor(survey) {
  return survey.probeQueries ?? (survey.nicheFlow?.groups?.suggestedQueries || []).join('\n');
}

export function applySurveyFields(survey, fields) {
  for(const input of fields){
    if(!/^survey\.[A-Za-z][A-Za-z0-9]*$/.test(input.binding)||input.type==='radio'&&!input.checked)continue;
    survey[input.binding.slice(7)]=input.type==='checkbox'?Boolean(input.checked):input.value;
  }
}
export function angleOptionsFor(survey){
 if(survey.angleSource==='niche')return survey.nicheAngleFor===String(survey.angleNiche||'').trim()?(survey.nicheAngleSuggestions||[]):[];
 return survey.nicheFlow?.template?.angleSuggestions||[];
}
export async function suggestNicheAngles(survey,generate,save){
 const niche=String(survey.angleNiche||'').trim();if(!niche||niche.length>300)throw Error('Nhập ngách muốn làm (tối đa 300 ký tự).');
 survey.angleSource='niche';delete survey.nicheAngleError;
 try{const output=await generate('angles',{basis:'niche',niche,language:survey.language||'vi',market:survey.market||'VN',format:survey.format||'long',titles:(survey.nicheFlow?.template?.examples||[]).filter(t=>typeof t==='string').slice(0,20).map(t=>t.slice(0,300))});
 const suggestions=(output.angles||[]).filter(x=>typeof x.angle==='string'&&x.angle.trim()).slice(0,3).map(x=>({angle:x.angle.trim(),reason:String(x.reason||'')}));if(!suggestions.length)throw Error('AI chưa trả gợi ý góc kể.');
 survey.nicheAngleSuggestions=suggestions;survey.nicheAngleFor=niche;
 }catch(error){survey.nicheAngleError='Chưa lấy được gợi ý theo ngách: '+error.message+' Góc đã chọn và kết quả kiểm tra vẫn được giữ.';}
 await save();
}
