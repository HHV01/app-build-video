export const SCRIPT_LAST_STEP=4;
export function normalizeScriptProjects(state){for(const p of state.projects||[]){p.step=Math.min(SCRIPT_LAST_STEP,Math.max(0,Number(p.step)||0));p.approved=(p.approved||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=SCRIPT_LAST_STEP);}return state;}
