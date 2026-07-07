// ─────────────────────────────────────────────────────────────────────────────
// The four rubric accent hues — the product's color system. Quality encoding
// NEVER introduces a new hue; it only desaturates/disperses the rubric's OWN
// color. (These same four values are mirrored as literals in ParticleMark's
// DEFAULT_OFFSHOOTS and RubricBranch's BRANCH_COLORS.)
// ─────────────────────────────────────────────────────────────────────────────

export const RUBRIC_ACCENTS = {
  corporate: '#3557A7',  // institutional navy
  research: '#8C2F39',   // oxblood
  journalism: '#C58A17', // ochre
  general: '#2F6B4F',    // forest
}

export const accentFor = (id) => RUBRIC_ACCENTS[id] || '#17181A'
