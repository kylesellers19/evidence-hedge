// ─────────────────────────────────────────────────────────────────────────────
// YMYL ("Your Money or Your Life") domain lexicon.
//
// Consequential domains where prescriptive advice carries real-world risk.
// Used by the general-rubric posture classifier: prescription + a YMYL domain
// term ⇒ 'authoritative' posture (the writer is making expert claims), even
// inside an otherwise first-person / experiential document.
//
// Grounding: Google Search Quality Rater Guidelines — E-E-A-T and YMYL.
// ─────────────────────────────────────────────────────────────────────────────

export const YMYL = {
  health: [
    'health', 'medical', 'symptom', 'symptoms', 'disease', 'diagnosis', 'treatment',
    'medication', 'dose', 'dosage', 'supplement', 'blood pressure', 'cholesterol',
    'mental health', 'therapy', 'vaccine', 'cancer', 'diabetes', 'nutrition', 'clinical',
  ],
  finance: [
    'investment', 'invest', 'investing', 'retirement', 'mortgage', 'loan', 'tax', 'taxes',
    'credit score', 'debt', 'portfolio', 'stocks', 'insurance', 'interest rate', 'savings',
    'refinance', '401k', 'ira',
  ],
  legal: [
    'legal', 'lawsuit', 'contract', 'liability', 'your rights', 'attorney', 'court',
    'custody', 'copyright', 'compliance', 'regulation', 'statute', 'jurisdiction',
  ],
  safety: [
    'safety', 'dangerous', 'hazard', 'toxic', 'emergency', 'poison', 'overdose', 'injury',
    'fatal', 'life-threatening', 'risk of death', 'carcinogen',
  ],
}

// Flat list for quick membership scans.
export const YMYL_TERMS = Object.values(YMYL).flat()
