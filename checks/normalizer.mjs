// ─────────────────────────────────────────────────────────────────────────────
// Normalizer checks (Part 3). Table-driven: hyphenation rejoin (+ true-compound
// guard), header/footer strip, page-number strip (incl. the canonical "02 03"
// fused-mid-sentence case), and paragraph-preserving soft-break collapse.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeText, normalizeDocument } from '../src/ingest/normalizer.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }
const has = (s, sub) => s.includes(sub)
const hasNot = (s, sub) => !s.includes(sub)

// ── (a) hyphenation rejoin + true-compound guard ─────────────────────────────
{
  const out = normalizeText('The neuro-\narchitecture of the built envi-\nronment matters.')
  log('rejoin broken word: neuro-\\narchitecture → neuroarchitecture', has(out, 'neuroarchitecture'), out)
  log('rejoin broken word: envi-\\nronment → environment', has(out, 'environment'), out)
}
{
  // TRUE-COMPOUND GUARD — the hyphen must survive.
  const broken = normalizeText('We used an evidence-\nbased method.')
  log('compound survives line-break: evidence-\\nbased → evidence-based', has(broken, 'evidence-based') && hasNot(broken, 'evidencebased'), broken)
  const inline = normalizeText('This is an evidence-based approach.')
  log('compound survives with no line-break: "evidence-based"', has(inline, 'evidence-based'), inline)
}

// ── (c) page-number strip ────────────────────────────────────────────────────
{
  // CANONICAL CASE — "02 03" fused mid-sentence (neuroarchitecture document).
  // NOTE: reconstructed representative sentence — the source document is not in
  // the repo; the pattern (fused zero-padded page pair between sentences) is verbatim.
  const canonical = 'Space shapes how we think.02 03Spatial cognition depends on the body.'
  const out = normalizeText(canonical)
  log('canonical "02 03" fused page pair removed', hasNot(out, '02 03') && hasNot(out, '.02'), out)
  log('canonical sentence reads cleanly', has(out, 'we think. Spatial cognition'), out)
}
{
  const out = normalizeText('First line of text.\n12\nSecond line of text after a page break.')
  log('standalone bare page number "12" dropped', hasNot(out, '12'), out)
}
{
  const out = normalizeText('End of a section here.\nPage 4 of 30\nStart of the next section.')
  log('"Page 4 of 30" line dropped', hasNot(out.toLowerCase(), 'page 4 of 30'), out)
}
{
  const out = normalizeText('A standalone page pair follows.\n02 03\nAnd the text continues.')
  log('standalone page pair line "02 03" dropped', hasNot(out, '02 03'), out)
}

// ── (b) header/footer strip (≥ 40% of pages) ─────────────────────────────────
{
  const pages = [
    'Confidential Draft\nThe first page discusses the introduction.\n1',
    'Confidential Draft\nThe second page covers the methodology in detail.\n2',
    'Confidential Draft\nThe third page presents the observed results.\n3',
    'Confidential Draft\nThe fourth page states the study limitations.\n4',
  ]
  const out = normalizeDocument(pages)
  log('repeated running header "Confidential Draft" stripped', hasNot(out, 'Confidential Draft'), out.slice(0, 60) + '…')
  log('body text preserved after header strip', has(out, 'methodology') && has(out, 'limitations'))
}
{
  // Below the 40% threshold → NOT stripped (appears on 1 of 4 pages = 25%).
  const pages = [
    'Unique Banner Only Here\nPage one body content about the topic.',
    'Page two body content continues the discussion.',
    'Page three body content adds more detail.',
    'Page four body content concludes the argument.',
  ]
  const out = normalizeDocument(pages)
  log('sub-threshold line (25% of pages) is NOT stripped', has(out, 'Unique Banner Only Here'))
}

// ── (d) paragraph-preserving soft-break collapse ─────────────────────────────
{
  const out = normalizeText('This sentence was split\nacross two soft line breaks.\n\nThis is a new paragraph.')
  log('soft breaks collapse within a paragraph', has(out, 'split across two soft line breaks'), out)
  log('blank-line paragraph break preserved', has(out, '\n\n'), JSON.stringify(out))
}

// ── idempotency: the known-good pipeline string is unchanged by the normalizer ─
{
  const known = 'Our platform is the #1 best-in-class solution and is unmatched in the industry. Our internal data proves customers always see world-class results. An independent survey by Gartner found adoption grew year over year.'
  log('known-good string is a normalizer no-op (paste == pipeline input)', normalizeText(known) === known)
}

if (!ok) { console.error('\nnormalizer checks failed.'); process.exit(1) }
console.log('\nAll normalizer checks passed.')
process.exit(0)
