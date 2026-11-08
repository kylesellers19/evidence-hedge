// ─────────────────────────────────────────────────────────────────────────────
// Standards behind the shared measurement and profile layers. Every rubric's
// provenance footer lists these after its own entries, since the measures they
// ground are identical under every rubric. URLs checked 2026-11-06 (DOIs via
// the doi.org handle API; aapor.org answers scripts with 403 but resolves in a
// browser). An unresolvable URL is '' and listed in the completion report.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('../types.js').ProvenanceEntry[]} */
export const SHARED_PROVENANCE = [
  {
    criterion: 'causal register of claims',
    standard: 'Yu, Li & Wang 2019',
    citation: 'Yu, B., Li, Y. & Wang, J. (2019). Detecting Causal Language Use in Science Findings. EMNLP-IJCNLP 2019, 4664–4674.',
    url: 'https://aclanthology.org/D19-1473/',
  },
  {
    criterion: 'attribution — whose finding a sentence reports',
    standard: 'UnScientify (Ningrum, Mayr & Atanassova 2023)',
    citation: 'Ningrum, P. K., Mayr, P. & Atanassova, I. (2023). UnScientify: Detecting Scientific Uncertainty in Scholarly Full Text. arXiv:2307.14236. Authorial-reference word lists from the Scientific Uncertainty Extractor (BSD 3-Clause; see THIRD_PARTY_NOTICES.md).',
    url: 'https://arxiv.org/abs/2307.14236',
  },
  {
    criterion: 'causal strength of linking words',
    standard: 'Haber et al. 2022',
    citation: 'Haber, N. A., Wieten, S. E., Rohrer, J. M., et al. (2022). Causal and Associational Language in Observational Health Research: A Systematic Evaluation. American Journal of Epidemiology, 191(12), 2084–2097. Ratings: osf.io/jtdaz (CC BY 4.0).',
    url: 'https://doi.org/10.1093/aje/kwac137',
  },
  {
    criterion: 'recommendation strength',
    standard: 'Li, Wang & Yu 2021',
    citation: 'Li, Y., Wang, J. & Yu, B. (2021). Detecting Health Advice in Medical Research Literature. EMNLP 2021.',
    url: 'https://aclanthology.org/2021.emnlp-main.486/',
  },
  {
    criterion: 'equivalence claimed from non-significance (spin)',
    standard: 'Lazarus et al. 2015',
    citation: 'Lazarus, C., Haneef, R., Ravaud, P. & Boutron, I. (2015). Classification and prevalence of spin in abstracts of non-randomized studies evaluating an intervention. BMC Medical Research Methodology, 15, 85.',
    url: 'https://doi.org/10.1186/s12874-015-0079-x',
  },
  {
    criterion: 'reporting completeness — observational studies',
    standard: 'STROBE',
    citation: 'von Elm, E., Altman, D. G., Egger, M., et al. (2007). The Strengthening the Reporting of Observational Studies in Epidemiology (STROBE) statement. PLoS Medicine, 4(10), e296.',
    url: 'https://www.strobe-statement.org/',
  },
  {
    criterion: 'reporting completeness — cross-sectional studies',
    standard: 'AXIS',
    citation: 'Downes, M. J., Brennan, M. L., Williams, H. C. & Dean, R. S. (2016). Development of a critical appraisal tool to assess the quality of cross-sectional studies (AXIS). BMJ Open, 6(12), e011458.',
    url: 'https://doi.org/10.1136/bmjopen-2016-011458',
  },
  {
    criterion: 'reporting completeness — web surveys',
    standard: 'CHERRIES',
    citation: 'Eysenbach, G. (2004). Improving the Quality of Web Surveys: The Checklist for Reporting Results of Internet E-Surveys (CHERRIES). Journal of Medical Internet Research, 6(3), e34.',
    url: 'https://doi.org/10.2196/jmir.6.3.e34',
  },
  {
    criterion: 'reporting completeness — survey disclosure',
    standard: 'AAPOR',
    citation: 'American Association for Public Opinion Research — Code of Professional Ethics and Practices, Section III: Standards for Disclosure (2021).',
    url: 'https://aapor.org/standards-and-ethics/disclosure-standards/',
  },
  {
    criterion: 'document provenance (who is speaking)',
    standard: 'AACODS Checklist',
    citation: 'Tyndall, J. AACODS Checklist (authority, accuracy, coverage, objectivity, date, significance) for grey literature, Flinders University.',
    url: 'https://fac.flinders.edu.au/handle/2328/3326',
  },
]
