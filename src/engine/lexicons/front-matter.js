// ─────────────────────────────────────────────────────────────────────────────
// Front matter, back matter and reference apparatus — text that is ABOUT the
// document, not claims IN it. extractClaims drops a sentence matching any of
// these; reference entries also go to analysis.references (no linking).
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

// The heading that opens the reference list. Everything after it is dropped,
// provided the next stretch actually reads as references (segment.js).
export const REFERENCE_HEADINGS = ['References', 'REFERENCES', 'Bibliography', 'BIBLIOGRAPHY', 'Works Cited', 'WORKS CITED', 'Literature Cited', 'Reference List', 'Sources and References']

// Reference-entry cues; an entry shows several (segment.js scores them).
export const REFERENCE_CUES = {
  authorList: [
    '^[^A-Za-z]{0,6}[A-Z][\\p{L}\'’-]+,\\s(?:[A-Z]\\.\\s?(?:-?[A-Z]\\.\\s?)*)',                  // starts "Kellert, S. R."
    '[A-Z][\\p{L}\'’-]+,\\s(?:[A-Z]\\.\\s?){1,3},?\\s(?:&\\s|and\\s)?[A-Z][\\p{L}\'’-]+,\\s[A-Z]\\.', // "Allen, J., & Ma, P."
    '\\b[A-Z][\\p{L}\'’-]+\\s[A-Z]{1,3},\\s[A-Z][\\p{L}\'’-]+\\s[A-Z]{1,3}\\b',                  // Vancouver "Allen JG, Satish U"
  ],
  yearParen: [
    '\\((?:19|20)\\d{2}[a-z]?(?:,\\s*[A-Z][a-z]+(?:\\s\\d{1,2})?)?\\)\\.',
    '\\((?![^)]*et\\s+al)[A-Z][\\w&.\\s-]{1,40},\\s(?:19|20)\\d{2}\\)\\.\\s*$',       // "(Wiley, 2008)." closing a book entry
  ],
  volumeIssue: ['\\b\\d{1,4}\\s?\\(\\d{1,4}[A-Za-z]?\\)\\s?[,:]'],
  pages: ['[,:]\\s?(?:e)?\\d{1,6}\\s?[–-]\\s?\\d{1,6}\\b', '\\bpp?\\.\\s?\\d'],
  locator: ['doi\\.org/|\\bdoi:\\s?10\\.|\\[\\s*(?:Google Scholar|PubMed|DOI|CrossRef|PMC free article)\\s*\\]', '\\b(?:Retrieved\\s+(?:from|on)|Available\\s+(?:at|from|online)|Accessed(?:\\s+on)?)\\b'],
  journalCite: ['\\b(?:19|20)\\d{2}(?:\\s[A-Z][a-z]{2}(?:\\s\\d{1,2})?)?;\\s?\\d+(?:\\(\\d+\\))?:\\s?e?\\d+'],
  venue: ['\\b(?:Journal|Proceedings|Proc\\.|Transactions|Review|Quarterly|Annals|Bulletin|University\\s+Press|Press|Publishing|Publishers|Eds?\\.|\\[Report\\])\\b'],
}

// Affiliations, correspondence, dates, licences, contributor and disclosure blocks.
export const FRONT_MATTER = {
  affiliation: [
    '^[^A-Za-z]{0,4}\\d{0,2}\\s?(?:Department|Dept\\.|School|Faculty|Institute|Division|Centre|Center|College|University|Laboratory|Program(?:me)?|Unit|Graduate\\s+School)\\s+(?:of|for)\\b[^.]{0,200},\\s*[A-Z][\\p{L}.]+',
    '^\\d[A-Z][\\p{L}\\s&,.-]{5,200}(?:University|School|Institute|College|Center|Centre|Hospital)\\b[^.]{0,120},\\s*(?:USA|UK|[A-Z][a-z]+)\\s*$',
  ],
  correspondence: [
    '\\b[\\w.+-]+@[\\w-]+\\.[\\w.-]+\\b',
    '\\b(?:address\\s+correspondence\\s+to|corresponding\\s+author|correspondence\\s*:|e-?mail\\s*:)',
  ],
  dates: [
    '\\b(?:Received|Accepted|Revised|Published(?:\\s+online)?|Epub(?:\\s+ahead\\s+of\\s+print)?|First\\s+published)\\s*:?\\s*(?:\\d{1,2}\\s+[A-Z][a-z]+\\.?\\s+\\d{4}|(?:19|20)\\d{2}\\s+[A-Z][a-z]{2}\\.?\\s+\\d{1,2}|[A-Z][a-z]+\\.?\\s+\\d{1,2},?\\s+(?:19|20)\\d{2})',
  ],
  license: [
    '©', '\\bcopyright\\b', '\\bcreative\\s+commons\\b', '\\bCC[\\s-]BY\\b', '\\blicen[cs]ed\\s+under\\b',
    '\\ball\\s+rights\\s+reserved\\b', '\\b(?:lies|is)\\s+in\\s+the\\s+public\\s+domain\\b', '\\bopen\\s+access\\s+article\\b',
    '\\bdistributed\\s+under\\s+the\\s+terms\\b', '\\bmay\\s+be\\s+reprinted\\s+freely\\b',
  ],
  contributors: [
    '\\bauthor\\s+contributions?\\b', '^\\s*contributors?\\s*:', '\\bCRediT\\b', '\\bconceptuali[sz]ation\\s*[:,]',
    '\\bwriting\\s*[–—-]\\s*(?:original\\s+draft|review)', '\\bdata\\s+curation\\b', '\\bfunding\\s+acquisition\\b',
    '^\\s*(?:This|The)\\s+(?:work|research|study|project|article)\\s+was\\s+(?:supported|funded|sponsored)\\b',
    '^\\s*(?:Funding|Acknowledg(?:e)?ments?|Footnotes|Disclosures?|Competing\\s+interests?|Conflicts?\\s+of\\s+interest)\\b',
    '^\\s*(?:We|The\\s+authors?)\\s+(?:thank|acknowledge|are\\s+grateful|declare|report\\s+no)\\b',
    '\\b(?:declare|declares|declared)\\s+(?:that\\s+)?(?:they\\s+have\\s+)?no\\s+(?:actual\\s+or\\s+potential\\s+)?(?:competing|conflicts?)\\b',
    '^\\s*Citation\\s*:',
  ],
}
