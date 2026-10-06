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
