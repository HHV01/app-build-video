export const LAST_STEP=5;
export function normalizeScriptProjects(state){for(const p of state.projects||[]){p.step=Math.min(LAST_STEP,Math.max(0,Math.trunc(Number(p.step)||0)));p.approved=(p.approved||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=LAST_STEP);}return state;}
