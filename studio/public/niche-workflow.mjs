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
