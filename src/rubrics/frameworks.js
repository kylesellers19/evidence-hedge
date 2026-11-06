// ─────────────────────────────────────────────────────────────────────────────
// Frameworks behind the hybrid scenarios (rubrics/hybrids.js). Each entry is a
// ProvenanceEntry plus `measures`: the signals or flags it grounds in this
// engine. An empty `measures` means the framework is cited for the scenario
// but nothing here measures it yet — the brief says "not yet measured".
//
// Citations checked 2026-11-05 against Crossref, PubMed and the doi.org handle
// API; claims against the official pages. ftc.gov and iso.org refuse scripts,
// so their pages were read from Wayback captures of October 2026.
// HealthNewsReview.org has been offline since 2022: its URL is the archived
// criteria page. ICC/ESOMAR (2025) and ISO 20252 (2026) are the current
// editions. Wojdynski & Evans found mid- and bottom-placed disclosures were
// recognized MORE often than top-placed ones, so it frames sponsorship-
// disclosure without grounding its top-of-page rule (that rule is the FTC
// guide's).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, import('../engine/types.js').ProvenanceEntry & { measures: string[] }>} */
export const FRAMEWORKS = {
  'sumner-2014': {
    criterion: 'causal claims and advice exaggerated in press releases, carried into the news',
    standard: 'Sumner et al. 2014',
    citation: 'Sumner, P., Vivian-Griffiths, S., Boivin, J., et al. (2014). The association between exaggeration in health related science news and academic press releases: retrospective observational study. BMJ, 349, g7015.',
    url: 'https://doi.org/10.1136/bmj.g7015',
    measures: ['causal-overreach'],
  },
  'woloshin-2009': {
    criterion: 'academic press releases that omit cautions and study size',
    standard: 'Woloshin et al. 2009',
    citation: 'Woloshin, S., Schwartz, L. M., Casella, S. L., Kennedy, A. T. & Larson, R. J. (2009). Press releases by academic medical centers: not so academic? Annals of Internal Medicine, 150(9), 613–618.',
    url: 'https://doi.org/10.7326/0003-4819-150-9-200905050-00007',
    measures: ['limitations-absent'],
  },
  'yavchitz-2012': {
    criterion: 'spin in an abstract’s conclusion carried into the press release and the news',
    standard: 'Yavchitz et al. 2012',
    citation: 'Yavchitz, A., Boutron, I., Bafeta, A., et al. (2012). Misrepresentation of randomized controlled trials in press releases and news coverage: a cohort study. PLoS Medicine, 9(9), e1001308.',
    url: 'https://doi.org/10.1371/journal.pmed.1001308',
    measures: ['abstract-body-confidence-delta'],
  },
  'trust-project-references': {
    criterion: 'a source the reader can check — the study behind the claims must be findable',
    standard: 'The Trust Project — References indicator',
    citation: 'The Trust Project — Trust Indicators: References (“When a journalist shows their sources, we can check their reliability for ourselves.”).',
    url: 'https://thetrustproject.org/trust-indicators/',
    measures: ['study-traceability'],
  },
  'healthnewsreview-criteria': {
    criterion: 'quality of evidence (#4), independent sources (#6), reliance on a news release (#10)',
    standard: 'HealthNewsReview.org criteria',
    citation: 'HealthNewsReview.org — Our Review Criteria (10 criteria for health news stories and news releases, 2006–2018), incl. #4 “Does the story seem to grasp the quality of the evidence?”, #6 “Does the story use independent sources and identify conflicts of interest?”, #10 “Does the story appear to rely solely or largely on a news release?” Site offline since 2022; archived copy.',
    url: 'https://web.archive.org/web/20220815112628/http://www.healthnewsreview.org/about-us/review-criteria/',
    measures: ['limitations-absent', 'perspective-plurality', 'subject-source-dependence'],
  },
  'schwitzer-2008': {
    criterion: 'how often news stories fail to judge the quality of the evidence',
    standard: 'Schwitzer 2008',
    citation: 'Schwitzer, G. (2008). How do US journalists cover treatments, tests, products, and procedures? An evaluation of 500 stories. PLoS Medicine, 5(5), e95.',
    url: 'https://doi.org/10.1371/journal.pmed.0050095',
    measures: ['limitations-absent'],
  },
  'lewis-2008': {
    criterion: 'news reliance on public-relations material',
    standard: 'Lewis, Williams & Franklin 2008',
    citation: 'Lewis, J., Williams, A. & Franklin, B. (2008). A compromised fourth estate? UK news journalism, public relations and news sources. Journalism Studies, 9(1), 1–20.',
    url: 'https://doi.org/10.1080/14616700701767974',
    measures: ['subject-source-dependence'],
  },
  'lundh-2017': {
    criterion: 'industry sponsorship and favourable results and conclusions',
    standard: 'Lundh et al. 2017 (Cochrane)',
    citation: 'Lundh, A., Lexchin, J., Mintzes, B., Schroll, J. B. & Bero, L. (2017). Industry sponsorship and research outcome. Cochrane Database of Systematic Reviews, 2017(2), MR000033.',
    url: 'https://doi.org/10.1002/14651858.MR000033.pub3',
    measures: ['undisclosed-interest'],
  },
  'icmje-coi': {
    criterion: 'disclosing sources of support and conflicts of interest',
    standard: 'ICMJE Recommendations §II.B',
    citation: 'International Committee of Medical Journal Editors — Recommendations for the Conduct, Reporting, Editing and Publication of Scholarly Work in Medical Journals, §II.B: Disclosure of Financial and Non-Financial Relationships and Activities, and Conflicts of Interest (updated January 2026).',
    url: 'https://www.icmje.org/recommendations/browse/roles-and-responsibilities/author-responsibilities--conflicts-of-interest.html',
    measures: ['undisclosed-interest'],
  },
  'aapor-ti': {
    criterion: 'naming who sponsored a survey and who conducted it',
    standard: 'AAPOR Transparency Initiative',
    citation: 'American Association for Public Opinion Research — Transparency Initiative; Code of Professional Ethics and Practices (rev. April 2021), §III.A.2 “Who Sponsored the Research and Who Conducted It”.',
    url: 'https://aapor.org/standards-and-ethics/transparency-initiative/',
    measures: ['undisclosed-interest'],
  },
  'gpp-2022': {
    criterion: 'publishing company-sponsored research',
    standard: 'GPP 2022',
    citation: 'DeTora, L. M., Toroser, D., Sykes, A., et al. (2022). Good Publication Practice (GPP) Guidelines for Company-Sponsored Biomedical Research: 2022 Update. Annals of Internal Medicine, 175(9), 1298–1304.',
    url: 'https://doi.org/10.7326/M22-1460',
    measures: [],
  },
  'icc-esomar-2025': {
    criterion: 'honest, transparent research; no conclusions the data do not support',
    standard: 'ICC/ESOMAR International Code (2025)',
    citation: 'ICC/ESOMAR International Code on Market, Opinion and Social Research and Data Analytics (2025 revision), Art. 9(c)–(d), 10(a). International Chamber of Commerce & ESOMAR.',
    url: 'https://iccwbo.org/news-publications/business-solutions/iccesomar-international-code-market-opinion-social-research-data-analytics/',
    measures: [],
  },
  'iso-20252': {
    criterion: 'service requirements for research providers',
    standard: 'ISO 20252:2026',
    citation: 'ISO 20252:2026 — Market, opinion and social research, including insights and data analytics — Vocabulary and service requirements. International Organization for Standardization.',
    url: 'https://www.iso.org/standard/88881.html',
    measures: [],
  },
  'ftc-deceptive-formats-2015': {
    criterion: 'advertising formatted as editorial content; disclosure made before the reader engages',
    standard: 'FTC Enforcement Policy Statement (2015)',
    citation: 'Federal Trade Commission (2015). Enforcement Policy Statement on Deceptively Formatted Advertisements (issued December 22, 2015). 81 Fed. Reg. 22596 (Apr. 18, 2016).',
    url: 'https://www.ftc.gov/legal-library/browse/commission-enforcement-policy-statement-deceptively-formatted-advertisements',
    measures: ['sponsorship-disclosure'],
  },
  'ftc-native-guide-2015': {
    criterion: 'disclosure clear and prominent, in front of or above the headline',
    standard: 'FTC Native Advertising Guide (2015)',
    citation: 'Federal Trade Commission (2015). Native Advertising: A Guide for Businesses (December 2015).',
    url: 'https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses',
    measures: ['sponsorship-disclosure'],
  },
  'wojdynski-evans-2016': {
    criterion: 'where and how a disclosure is worded changes whether readers recognize an ad (mid- and bottom-placed disclosures were recognized more often)',
    standard: 'Wojdynski & Evans 2016',
    citation: 'Wojdynski, B. W. & Evans, N. J. (2016). Going native: Effects of disclosure position and language on the recognition and evaluation of online native advertising. Journal of Advertising, 45(2), 157–168.',
    url: 'https://doi.org/10.1080/00913367.2015.1115380',
    measures: [],
  },
  'ftc-substantiation-1984': {
    criterion: 'a reasonable basis for objective advertising claims before they run',
    standard: 'FTC Advertising Substantiation (1984)',
    citation: 'Federal Trade Commission (1984). FTC Policy Statement Regarding Advertising Substantiation. Appended to Thompson Medical Co., 104 F.T.C. 648, 839 (1984), aff’d, 791 F.2d 189 (D.C. Cir. 1986).',
    url: 'https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation',
    measures: [],
  },
  'ftc-health-2022': {
    criterion: 'competent and reliable scientific evidence relevant to the specific product and claim',
    standard: 'FTC Health Products Compliance Guidance (2022)',
    citation: 'Federal Trade Commission (2022). Health Products Compliance Guidance (December 2022), §III.B.5 “The Relevance of the Evidence to the Specific Product and Claim”.',
    url: 'https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance',
    measures: [],
  },
  'ftc-endorsement-2023': {
    criterion: 'endorsements, testimonials and material connections',
    standard: 'FTC Endorsement Guides (16 CFR 255)',
    citation: 'Federal Trade Commission. Guides Concerning Use of Endorsements and Testimonials in Advertising, 16 C.F.R. Part 255 (revised, 88 Fed. Reg. 48092, July 26, 2023).',
    url: 'https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255',
    measures: [],
  },
  'ihc-key-concepts': {
    criterion: 'judging claims about treatment effects outside the research literature',
    standard: 'IHC Key Concepts (2022)',
    citation: 'Oxman, A. D., Chalmers, I. & Dahlgren, A. (2022). Key Concepts for assessing claims about treatment effects and making well-informed treatment choices (Version 2022). IHC Working Paper. Zenodo.',
    url: 'https://doi.org/10.5281/zenodo.6611932',
    measures: [],
  },
}
