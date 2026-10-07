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

