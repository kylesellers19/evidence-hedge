import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../components/layout/SiteLayout.jsx'
import { RUBRIC_ORDER, getRubric, HYBRIDS, GENRE_LABELS } from '../rubrics/index.js'
import { FRAMEWORKS } from '../rubrics/frameworks.js'
import { routeDocument } from '../rubrics/route.js'
import { analyze } from '../engine/analyze.js'
import { TIERS } from '../engine/measure/certainty.js'
import { SHARED_EXTRACTION } from '../engine/measure/index.js'
import { REGISTERS, CAUSAL_ROOT_MIN } from '../engine/measure/causalRegister.js'
import { STRENGTHS } from '../engine/measure/recommendation.js'
import { REFERENCE_MIN_POSITION } from '../engine/measure/segment.js'
import { PRONOUN_REACH } from '../engine/attribution.js'
import { SCORE_WEIGHTS as W, BAND_THRESHOLDS, SUMMARY, bandFor, READ_AS } from '../engine/scoreDocument.js'
import { DESIGNS, DESIGN_CEILINGS, CITATION_DENSE_MIN } from '../engine/profile/design.js'
import { SHARED_PROVENANCE } from '../engine/profile/standards.js'
import { SIGNAL_TITLES } from '../engine/signals/titles.js'
import { COMPLETENESS_CHECKS } from '../engine/signals/completeness.js'
import { GATE_MIN_WORDS } from '../engine/signals/general.js'
import { REGISTER_MISMATCH_SHARE } from '../engine/signals/corporate.js'
import { SPONSOR_HEAD_CHARS } from '../engine/signals/hybrid.js'
import { MIN_LINK_WORDS } from '../ingest/validateText.js'
import { PROVENANCE_LABELS, ROLE_META, DESIGN_LABELS } from '../components/genre/labels.js'
import { engine_commit as BENCH_ENGINE, generated as BENCH_DATE, metrics as BENCH } from '../../checks/reports/benchmark-af3c2e7.json'
import { apDate } from '../list/entry.js'
import { ANCHORS, scoreAnchor, standardAnchor } from '../components/results/briefTop.js'
import SCALE from './method-scale.json'

/**
 * Method — how Evidence Hedge weighs a document, after Delgam's method page:
 * the steps as a numbered spine, then each step in full, one paragraph worked
 * through by the live engine, the score's arithmetic, what it cannot see, how
 * it is tested and its sources.
 *
 * No figure on this page is typed into the copy. Weights, thresholds, ladders,
 * ceilings, scenarios and sources are imported from the engine and rubric
 * modules; the worked example runs analyze() as the page renders; benchmark
 * results are read from the committed benchmark report. Change the engine and
 * this page changes with it.
 */

// ── Plain words for the engine's keys ────────────────────────────────────────

const TYPE_WORDS = {
  doi: 'a DOI',
  url: 'a link',
  'url-own': 'a link to the publisher’s own site',
  numeric: 'a numbered citation, such as [3]',
  'author-year': 'an author and year, such as (Allen et al. 2016)',
  year: 'a year in parentheses',
  phrase: 'an attribution phrase, such as “according to”',
}
const REGISTER_WORDS = {
  none: 'no causal claim',
  correlational: 'things move together',
  'conditional-causal': 'one thing may cause another',
  'direct-causal': 'one thing causes another',
}
const STRENGTH_WORDS = { none: 'no advice', weak: 'a suggestion', strong: 'firm advice' }
const ATTRIBUTION_WORDS = {
  'own-current': 'the document’s own new finding',
  'own-prior': 'the publisher’s own earlier work',
  'cited-other': 'someone else’s work, cited',
  quoted: 'a quotation, attributed to its speaker',
  unattributed: 'no one in particular',
  undetermined: 'unclear',
}
const RUBRIC_WORDS = {
  research: 'Papers, reviews, preprints and research reports. Evidence climbs from opinion to primary studies to peer-reviewed work and meta-analyses.',
  corporate: 'White papers, marketing, thought leadership and a firm’s own reports. Evidence climbs from a firm’s say-so to its own metrics, to third parties and to audited disclosures.',
  journalism: 'News, analysis and opinion. Evidence climbs from anonymous sources to named ones, documents and independent verification.',
  general: 'Everything else on the web: blogs, explainers and advice. Evidence climbs from a bare assertion to a link, a citation and a primary or official source.',
}
const humanize = (s) => s.replace(/-/g, ' ')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const postureName = (p) => cap(humanize(p))
const tierFor = (weight) => TIERS.find((t) => t.weight === weight)?.label || String(weight)
const pct = (x) => `${Math.round(x * 100)}%`
const num = (n) => Number(n).toLocaleString('en-US')
const list = (items, and = 'and') => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`)
const DISCOUNTED = W.DISCOUNTED_PROVENANCE.map((k) => PROVENANCE_LABELS[k].toLowerCase())
const REPO = 'https://github.com/kylesellers19/evidence-hedge'

// What each document check looks for, and what it costs (from SCORE_WEIGHTS).
const COST = {
  flag: () => `${W.signal.flag} points`,
  note: () => `${W.signal.note} points`,
  platitude: () => `${W.PLATITUDE_PER} points for each platitude`,
  gaps: () => `${W.COMPLETENESS_PER_GAP} points for each missing item, at most ${W.COMPLETENESS_CAP}`,
  pattern: () => `${W.REPORTING_PATTERN} points`,
  none: () => 'Nothing; it is recorded only',
  credit: () => 'Nothing; the brief credits it',
  'credit-note': () => `Nothing when present; ${W.signal.note} points when missing`,
  'credit-flag': () => `Nothing when labeled at the top; ${W.signal.flag} points when the label comes later`,
  gate: () => `Sets the score to ${W.GATE_SCORE}`,
}
const SIGNAL_COPY = {
  'limitations-absent': ['The document never states a limitation, a caveat or a need for further research.', 'note'],
  'abstract-body-confidence-delta': ['Claims at the front (the abstract or summary) are stated more confidently than the claims in the body.', 'note'],
  'secondary-evidence-dominance': ['Among the strongly stated claims, more rest on argument (“argued,” “suggested”) than on measurement (“found,” “measured”).', 'note'],
  'platitude-density': ['Content-free lines such as “now more than ever” recur. They are counted rather than flagged one by one, because no evidence could back them.', 'platitude'],
  'self-citation-dominance': ['The publisher cites itself at least as often as it cites anyone else.', 'note'],
  'register-mismatch': [`The text borrows the vocabulary of research while ${pct(REGISTER_MISMATCH_SHARE)} or more of its strongly stated claims sit below the third-party rung.`, 'flag'],
  'per-claim-sourcing': ['Fewer than half of the strongly stated claims carry any source.', 'flag'],
  'label-transparency': ['No opinion, analysis or sponsored label appears at the top.', 'note'],
  'method-disclosure': ['The piece never says how the reporting was done: documents reviewed, people interviewed, records obtained or data analyzed.', 'note'],
  'perspective-plurality': ['One voice at most is quoted or named as a source.', 'note'],
  'right-of-reply': ['Someone criticized was asked to respond (“declined to comment”).', 'credit'],
  'anonymous-sourcing': ['Sources go unnamed (“people familiar with”) and no source is named anywhere.', 'note'],
  'posture-gate': [`A page of personal experience, at least ${GATE_MIN_WORDS} words long, that cites nothing, gives no advice and touches no topic of health, money, law or safety makes no expert claims and so owes no evidence.`, 'gate'],
  'completeness-gaps': [`A document reporting its own study leaves out items a reader needs to judge it: ${list(COMPLETENESS_CHECKS.map((c) => c.label))}. Each item is asked only of the designs it applies to.`, 'gaps'],
  'equivalence-from-nonsignificance': ['“No significant difference” is read as proof that two things are the same, or that something is safe.', 'pattern'],
  'subgroup-selection': ['A significant result in a subgroup is reported beside an overall result that was not significant.', 'pattern'],
  'covariate-inconsistency': ['Different analyses adjust for clearly different sets of factors.', 'pattern'],
  'self-disclaimed-causality': ['The document says its findings do not show cause. A disclaimer does not excuse a causal claim elsewhere, so it earns nothing.', 'none'],
  'study-traceability': ['A document describing someone else’s study gives a way to find it: a DOI, a journal, a named report or a link.', 'credit-note'],
  'sponsorship-disclosure': [`Paid content says so within its first ${SPONSOR_HEAD_CHARS} characters, not only further down.`, 'credit-flag'],
  'subject-source-dependence': ['Most of the attributed sentences come from one firm, which is also what the story is about.', 'flag'],
  'undisclosed-interest': ['A firm’s own study, or a publisher with an advocacy mission, states its funding or conflicts of interest.', 'credit-note'],
}
const COMPLETENESS_GROUP = ['completeness-gaps', 'equivalence-from-nonsignificance', 'subgroup-selection', 'covariate-inconsistency', 'self-disclaimed-causality']
const HYBRID_AUDITS = ['study-traceability', 'sponsorship-disclosure', 'subject-source-dependence', 'undisclosed-interest']

const STEPS = [
  ['Read the text', 'Turn what you paste, upload or link to into clean text, in your browser.', 'ingest and normalization', 'reading'],
  ['Decide what kind of document it is', 'Ask who publishes it, what form it takes, whose stake stands behind it and what study it rests on, and pick the evidence standard that fits.', 'genre roles and routing', 'kind'],
  ['Find the claims', 'Split the body into sentences and keep the ones that assert something.', 'claim extraction', 'claims'],
  ['Decide whose finding each claim is', 'Tell the document’s own results from the work it cites, the people it quotes and the lines that belong to no one.', 'attribution', 'whose'],
  ['Find and grade the evidence', 'Link each claim to what backs it and place that evidence on the standard’s ladder.', 'evidence linkage and grading', 'evidence'],
  ['Measure how strongly each claim is stated', 'Read its certainty, how much cause it claims and how firmly it advises.', 'certainty, causal register and recommendation strength', 'strength'],
  ['Flag claims that outrun their evidence', 'Compare each claim’s strength with what its evidence and the study design can carry.', 'mismatch detection', 'flags'],
  ['Check the document as a whole, then score it', 'Look for what a sentence-by-sentence reading misses, and subtract each problem from a fixed budget.', 'document signals and scoring', 'score'],
]

// The paragraph worked through below. The engine reads it as this page renders.
const EXAMPLE = 'Hybrid work is transforming how companies grow. In our survey of 412 office workers, 61% said they were more productive at home. These results show that hybrid work causes higher productivity. According to industry commentary, hybrid schedules clearly improve retention. Employees who work from home two days a week may report less burnout (Bloom et al. 2024). Companies should adopt a hybrid policy now.'

export default function MethodPage() {
  usePageTitle('Method')
  const example = useMemo(() => {
    const route = routeDocument(EXAMPLE, {})
    return { route, result: analyze(EXAMPLE, route.judgment.rubric, route.posture, {}) }
  }, [])
  const rubrics = RUBRIC_ORDER.map(getRubric)

  return (
    <main className="eh-page eh-method">
      <article>
        <header className="eh-col">
          <p className="eh-kicker">Method</p>
          <h1 className="eh-hed">How Evidence Hedge weighs a document</h1>
          <p className="eh-dek">
            It finds every sentence that makes a claim, measures how strongly the claim is stated and checks
            whether the evidence beside it can carry that much. The score counts the places where the two
            come apart, so a report earns a high score by stating its findings as firmly as its evidence
            allows, and no more.
          </p>
        </header>

        <div className="eh-col">
          <p>
            Most misleading reports are not wrong so much as sure. A survey of a few hundred people becomes
            “companies that adopt hybrid work grow faster,” and a vendor’s own pilot becomes “proven to cut
            costs.” The sentence may even be true, but nothing on the page shows it. Evidence Hedge looks for
            that gap one sentence at a time, and it judges a research paper, a press release, a news story and
            a marketing page each against the evidence its own genre can reasonably be expected to show.
          </p>
          <p>
            It does not check facts, rate a publisher’s reputation or decide whether a conclusion is right. A
            careful report built on thin evidence can score well, because it says so; a confident report built
            on strong evidence can score well too. What scores badly is confidence the evidence does not carry.
            Everything runs in your browser, by fixed rules, so the same text always gets the same score.
          </p>

          <nav className="eh-toc" aria-label="On this page">
            <p className="eh-toc-h">On this page</p>
            <ol>
              <li><a href="#steps">The eight steps</a></li>
              <li><a href="#reading">Reading the text</a></li>
              <li><a href="#kind">What kind of document it is</a></li>
              <li><a href="#claims">Finding the claims</a></li>
              <li><a href="#whose">Whose finding it is</a></li>
              <li><a href="#evidence">Finding and grading the evidence</a></li>
              <li><a href="#strength">How strongly a claim is stated</a></li>
              <li><a href="#flags">When a claim outruns its evidence</a></li>
              <li><a href="#design">What the study design can carry</a></li>
              <li><a href="#signals">Checks on the whole document</a></li>
              <li><a href="#score">From flags to a score</a></li>
              <li><a href="#numbers">The numbers on a brief</a></li>
              <li><a href="#scale">What makes a 1 through a 10</a></li>
              <li><a href="#example">One paragraph, worked through</a></li>
              <li><a href="#limits">What the score does not show</a></li>
              <li><a href="#testing">How we test it</a></li>
              <li><a href="#privacy">Your document</a></li>
              <li><a href="#sources">Sources</a></li>
            </ol>
          </nav>

          <h2 id="steps">The eight steps</h2>
          <p>
            Every document goes through the same eight steps. The genre changes the standard a claim is held
            to in steps 5, 7 and 8. It changes how claims are found in one way only: a news story keeps its
            headlines and labels as claims, so the journalism standard can weigh more sentences than the
            others. Every claim found under two standards is measured the same way under both.
          </p>
          <ol className="eh-spine">
            {STEPS.map(([title, what, term, id], i) => (
              <li key={id}>
                <span className="eh-spine-n" aria-hidden="true">{i + 1}</span>
                <h3><a href={`#${id}`}>{title}</a></h3>
                <p>{what} <span className="eh-term">({term})</span></p>
              </li>
            ))}
          </ol>

          {/* ── 1 ─────────────────────────────────────────────────────────── */}
          <h2 id="reading">Reading the text</h2>
          <p>
            You can paste text, upload a file (a PDF, a Word document or plain text) or paste a link. A PDF is
            read page by page in column order, so a two-column paper is not read straight across both columns,
            and small superscript citation numbers stay attached to the sentence they mark. Running headers,
            footers and page numbers that repeat across pages are removed, and words broken across lines are
            rejoined, unless the hyphen belongs to the word.
          </p>
          <p>
            A link is first requested by your browser directly. If the site allows that and the link is a file,
            the file is read like an upload. Otherwise the address goes to r.jina.ai, a third-party reader
            service, which fetches the page and returns its text; lines of site navigation are then removed.
            Text that comes back as an error page, a bot check or a page under {MIN_LINK_WORDS} words is refused
            with a sentence saying why, rather than scored.
          </p>
          <p>
            A scanned PDF has no text layer, and we do not run character recognition on it, so it is refused;
            so are password-protected PDFs and the old Word format (.doc).
          </p>
          <p>
            A document that is not in English is refused too, since the word lists and sentence rules below are
            English ones. We call a text English unless most of its letters are in another script, or it uses
            more of another language’s common short words (les, und, una, het) than of English’s (the, of, and).
          </p>

          {/* ── 2 ─────────────────────────────────────────────────────────── */}
          <h2 id="kind">What kind of document it is</h2>
          <p>
            The same sentence deserves different scrutiny in a peer-reviewed paper and on a product page, so
            before any claim is judged, the document’s genre is read from four roles:
          </p>
          <dl className="eh-defs">
            {Object.entries(ROLE_META).map(([key, r]) => (
              <React.Fragment key={key}>
                <dt>{r.label}</dt>
                <dd>{r.question}. {ROLE_WORDS[key]}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p>
            One genre sets one standard: research, corporate, journalism or general web, each with its own
            ladder of evidence and its own tolerance for confidence. Many documents mix genres, though: a
            firm’s research report, a press release about a university study, a news story built on one
            company’s survey. We judge those as hybrids. The first scenario that fits sets the evidence
            standard, and every scenario that fits adds its own checks, so a hybrid never drops a check that
            either of its genres would run.
          </p>
          <div className="eh-table-scroll eh-break">
            <table className="eh-data">
              <caption>Hybrid scenarios, in the order they are tried</caption>
              <thead>
                <tr><th scope="col">Scenario</th><th scope="col">Genres</th><th scope="col">Held to</th><th scope="col">Checks it adds</th></tr>
              </thead>
              <tbody>
                {HYBRIDS.map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>{list(h.genres.map((g) => GENRE_LABELS[g]))}</td>
                    <td>{GENRE_LABELS[h.standard]}</td>
                    <td>{h.audits.length ? list(h.audits.map((a) => SIGNAL_TITLES[a])) : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Within a genre, a document also takes a posture: a corporate document may be marketing, thought
            leadership, a research-like report or a press release; an article may be news, opinion, sponsored or
            unlabeled; a general page may be personal experience or authoritative advice. Each posture tolerates
            a different amount of confidence. Before the analysis runs, you see the reading and can add or
            drop a genre and change the posture.
          </p>
          <p>
            The posture changes which claims are flagged on the brief and how the verdict is worded. It never
            changes the score, which always judges claims at the genre’s strictest posture. Changing the
            genres does change the standard, and so it can change the score.
          </p>

          {/* ── 3 ─────────────────────────────────────────────────────────── */}
          <h2 id="claims">Finding the claims</h2>
          <p>
            The text is split into sentences, with care for abbreviations such as “et al.” and “Fig.” A short
            paragraph with no closing punctuation, such as a heading, a label or a line of a cover, ends where
            the paragraph does, so it is not read as the start of the sentence below it. Standing alone, a line
            with no verb and no closing punctuation is a label, such as a heading, a chart label or a table row,
            and is not weighed; a news story keeps its headlines. A
            reference list is set aside first, once a heading such as References appears in the last{' '}
            {pct(1 - REFERENCE_MIN_POSITION)} of the text and the lines under it read as reference entries;
            claims come only from the body.
          </p>
          <p>
            Lines that make no claim are dropped: boilerplate, bylines and reading times, navigation, contents
            lines with dot leaders, author
            affiliations and contact lines, received and accepted dates, licenses, funding and acknowledgment
            blocks, chart notes and fragments under {SHARED_EXTRACTION.minClaimLength} characters. Questions,
            all-capital lines, captions and title-style headings are marked down. In practice nearly every
            declarative sentence of ordinary length is weighed as a claim, and that includes a mission
            statement, which commits a publisher to something as surely as a finding does.
          </p>
          <p>
            This step is the same under every standard but one. Under the journalism standard, headlines and
            labels count as claims, because a news headline makes one; of the {num(SCALE.corpus.scored)} documents
            in our corpus that received a score, {num(SCALE.moreClaimsUnderJournalism)} have more claims under
            journalism than under the other three. A check holds the rest: every claim found under two
            standards is measured the same way under both, and the extra journalism claims are all headlines
            or labels.
          </p>

          {/* ── 4 ─────────────────────────────────────────────────────────── */}
          <h2 id="whose">Whose finding it is</h2>
          <p>
            A claim can only be backed by the right kind of evidence for whose claim it is. A study cited from
            elsewhere needs a citation; the document’s own result needs its own data; a quotation needs a
            named speaker. So each claim is first given one of six labels:
          </p>
          <ul className="eh-tight">
            {Object.entries(ATTRIBUTION_WORDS).map(([k, words]) => <li key={k}>{cap(words)}</li>)}
          </ul>
          <p>
            The label comes from cues in the sentence: an author and year or a numbered citation, “according
            to” and a name, “we found” or “this study,” the publisher’s own name with a verb, quotation marks
            and a speech verb. A sentence that opens with “they” or “these results” takes the label of the
            attributed sentence before it, up to {PRONOUN_REACH} sentences back in the same paragraph. The
            publisher’s own earlier reports count as its own prior work, not as independent evidence.
          </p>

          {/* ── 5 ─────────────────────────────────────────────────────────── */}
          <h2 id="evidence">Finding and grading the evidence</h2>
          <p>
            Each claim is then linked to whatever backs it, by the routes its label allows: citation markers
            matched against the reference list, footnotes, “Source:” lines under a chart, hyperlinks, the
            results section of the document’s own study and the speaker of a quotation. A marker that matches
            no entry in the reference list is kept as unresolved rather than dropped.
          </p>
          <p>
            The evidence is then placed on the standard’s ladder, five rungs from unsourced to the strongest
            evidence that genre can offer. A claim sits on the highest rung any of its evidence reaches.
            Reaching a rung takes a kind of citation, such as a DOI (digital object identifier), a link or an
            author and year, or words that name the kind of evidence, such as “randomized controlled trial”
            or “audited.”
          </p>
          {rubrics.map((r) => (
            <div className="eh-table-scroll" key={r.id}>
              <table className="eh-data eh-ladder">
                <caption>
                  {r.label}{r.stub ? ' (draft standard)' : ''}
                  <span className="eh-caption-sub">{RUBRIC_WORDS[r.id]}</span>
                </caption>
                <thead>
                  <tr><th scope="col">Rung</th><th scope="col">Reached by</th><th scope="col">Or by words such as</th></tr>
                </thead>
                <tbody>
                  {[...r.ladder].sort((a, b) => b.rank - a.rank).map((rung) => (
                    <tr key={rung.key}>
                      <td><span className="eh-rank">{rung.rank}</span> {rung.label}</td>
                      <td>{rung.match?.types?.length ? cap(list(rung.match.types.map((t) => TYPE_WORDS[t] || t), 'or')) : rung.rank === 0 ? 'Nothing: no citation and no evidence words' : 'Words alone'}</td>
                      <td>{rung.match?.keywords?.length ? rung.match.keywords.slice(0, 4).map((k) => `“${k}”`).join(', ') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p>
            A document’s own result, backed by its own study, is graded at least at the standard’s own-result
            rung ({rubrics.map((r) => `${r.ladder.find((x) => x.key === r.ownResultRung)?.label.toLowerCase()} for ${r.label.toLowerCase()}`).join('; ')}).
            When the publisher is a {list(DISCOUNTED, 'or')}, evidence from inside the document counts one rung lower
            in the score, since the publisher is grading its own work.
          </p>
          <p>
            The grade comes from the kind of citation and the words around it. We do not open the cited
            source, judge its quality or check that it says what the claim says it does.
          </p>

          {/* ── 6 ─────────────────────────────────────────────────────────── */}
          <h2 id="strength">How strongly a claim is stated</h2>
          <p>
            Three measures describe a claim’s strength, and none of them reads the genre. The first is
            certainty, after Ken Hyland’s study of hedges and boosters in academic writing:
          </p>
          <div className="eh-table-scroll">
            <table className="eh-data">
              <caption>Certainty</caption>
              <thead><tr><th scope="col">Tier</th><th scope="col" className="n">Weight</th><th scope="col">Marked by words such as</th></tr></thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.key}>
                    <td>{t.label}</td>
                    <td className="n">{t.weight}</td>
                    <td>{t.cues.length ? `${t.cues.slice(0, 5).map((c) => `“${c}”`).join(', ')} (${t.cues.length} in all)` : 'Nothing: a plain statement'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A hedge with a booster reads as measured, and a booster with a negation just before it (“not
            always”) counts as a hedge. Attitude words (“unfortunately,” “remarkably”) are recorded but never
            move the tier.
          </p>
          <p>
            The second is causal register: how much cause a claim asserts, on the scale Bei Yu and colleagues
            built for findings in health research and later used to compare papers with the press releases
            about them. It has {REGISTERS.length} levels:{' '}
            {list(REGISTERS.map((r) => `“${REGISTER_WORDS[r]}” (${humanize(r)})`))}. Whether a linking word
            is causal comes from Noah Haber and colleagues’ ratings of how strongly words such as “associated
            with,” “linked to” and “drives” imply cause; a word rated {CAUSAL_ROOT_MIN} or higher on their
            scale counts as causal. A causal word softened by “may” or “could” makes a
            conditional claim. Recommendations, calls for more research and what survey respondents believe
            are not causal claims of the document’s own.
          </p>
          <p>
            The third is recommendation strength, after Li, Wang and Yu’s scheme for advice in health
            research: {list(STRENGTHS.map((s) => `${STRENGTH_WORDS[s]} (${s})`))}. “Should,” “must” and “we
            recommend” are firm; “may want to consider” is a suggestion.
          </p>
          <p>
            Each claim is also given a function: a method statement, the document’s own result, background,
            an interpretation, a recommendation or other. Method statements describe what was done, not what
            was found, so they are never flagged.
          </p>

          {/* ── 7 ─────────────────────────────────────────────────────────── */}
          <h2 id="flags">When a claim outruns its evidence</h2>
          <p>
            Every standard sets a ceiling for each rung of its ladder: the most certainty that grade of evidence
            can carry. Under the research standard an unsourced sentence may only be stated tentatively, while
            a peer-reviewed finding may be stated outright. A claim above its ceiling is flagged, in one of
            three ways.
          </p>
          <dl className="eh-defs">
            <dt id={ANCHORS.flag('unsupported-assertion')}>Unsupported assertion</dt>
            <dd>
              The claim cites nothing, and it is stated more firmly than an unsourced claim may be. On a brief it
              is counted as a claim that cites nothing.
            </dd>
            <dt id={ANCHORS.flag('overconfident')}>Overconfident relative to source</dt>
            <dd>
              The claim cites something, but that grade of evidence cannot carry the certainty it asserts. On a
              brief it is counted as a claim that cites too little.
            </dd>
            <dt id={ANCHORS.flag('causal-overreach')}>Causal overreach</dt>
            <dd>
              The claim asserts more cause, or gives firmer advice, than the design of the study behind it can
              support. This is checked for the document’s own results, its interpretations and its
              recommendations.
            </dd>
          </dl>
          <p>
            The ceilings differ by posture, which is how a marketing page may sound surer than a research
            report without a flag on every line. The score always uses the strictest posture, marked here.
          </p>
          {rubrics.map((r) => {
            const postures = r.postures?.length ? r.postures : ['default']
            return (
              <div className="eh-table-scroll eh-break" key={r.id} id={standardAnchor(r.id)}>
                <table className="eh-data eh-ceilings">
                  <caption>{r.label}: the strongest certainty each rung may carry</caption>
                  <thead>
                    <tr>
                      <th scope="col">Rung</th>
                      {postures.map((p) => (
                        <th scope="col" key={p}>{postureName(p)}{p === r.strictestPosture ? ' (scored)' : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...r.ladder].sort((a, b) => a.rank - b.rank).map((rung) => (
                      <tr key={rung.key}>
                        <td>{rung.label}</td>
                        {postures.map((p) => {
                          const row = r.tolerance.ceilings[p] || r.tolerance.ceilings.default
                          return <td key={p}>{tierFor(row[rung.rank])}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
          <p>
            A claim that discloses its own gap (“declined to comment,” “we did not verify,” “no data were
            available”), or that is hedged, may lose an unsupported-assertion flag, depending on how firmly it
            is stated. Nothing softens causal overreach: a
            limitations paragraph does not excuse an overreaching claim, and a check holds that removing a
            document’s limitations and causal disclaimers changes neither its overreach flags nor its penalty.
          </p>

          {/* ── 8 ─────────────────────────────────────────────────────────── */}
          <h2 id="design">What the study design can carry</h2>
          <p>
            Causal overreach needs to know what kind of study stands behind a document. We read the design
            from positive evidence only: sentences that describe the document’s own study (“we randomly
            assigned,” “respondents were surveyed”), cite no other work and are not negated. A document with no
            design cues that cites others heavily ({CITATION_DENSE_MIN} citing sentences or more) reads as a
            narrative review.
          </p>
          <p>
            Each design has a ceiling, following the start-low rule of GRADE (Grading of Recommendations,
            Assessment, Development and Evaluation): only randomized or controlled experiments may claim
            outright cause and give firm advice.
          </p>
          <div className="eh-table-scroll">
            <table className="eh-data">
              <caption>Study designs and the most each can support</caption>
              <thead><tr><th scope="col">Design</th><th scope="col">Cause it can support</th><th scope="col">Advice it can support</th></tr></thead>
              <tbody>
                {DESIGNS.map((d) => (
                  <tr key={d}>
                    <td>{cap(DESIGN_LABELS[d] || humanize(d))}</td>
                    <td>{cap(REGISTER_WORDS[DESIGN_CEILINGS[d].maxRegister])}</td>
                    <td>{cap(STRENGTH_WORDS[DESIGN_CEILINGS[d].maxRecommendation])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A document that describes someone else’s study inherits that study’s ceiling. A press release, a
            news story or a firm’s page about a cross-sectional survey can claim no more cause than the survey
            could, however confidently the release is written.
          </p>

          {/* ── 9 ─────────────────────────────────────────────────────────── */}
          <h2 id="signals">Checks on the whole document</h2>
          <p>
            Some problems show only across a whole document: a report that never admits a limitation, an
            abstract surer than its body, a story that quotes one side. Each standard runs its own set of these
            checks, every document that reports its own study runs the reporting checks, and hybrids add the
            checks their scenarios call for.
          </p>
          {rubrics.map((r, i) => (
            <SignalTable key={r.id} table={i} caption={`${r.label} checks`} ids={r.documentSignals.filter((id) => !COMPLETENESS_GROUP.includes(id))} />
          ))}
          <SignalTable table={rubrics.length} caption="Reporting checks, for a document’s own study" ids={COMPLETENESS_GROUP} />
          <SignalTable table={rubrics.length + 1} caption="Checks hybrids add" ids={HYBRID_AUDITS} />

          {/* ── 10 ────────────────────────────────────────────────────────── */}
          <h2 id="score">From flags to a score</h2>
          <p>
            Every document starts with {W.START_BUDGET} points and loses them in four ways. The score cannot fall
            below {W.MIN} or rise above {W.MAX}, and it is kept to one decimal place: The List shows that decimal,
            and a brief shows it rounded to the nearest whole number (see <a href="#scale">What makes a 1 through
            a 10</a>). A document in which we find no claims gets no score at all, not a perfect one: there is
            nothing for its evidence to support.
          </p>
          <ol className="eh-steps">
            <li>
              <strong>Flagged claims, as a rate.</strong> Each unsupported assertion counts{' '}
              {W.flag['unsupported-assertion']} and each overconfident claim {W.flag.overconfident}, times the
              number of certainty steps the claim sits above its ceiling. The total is divided by the number of
              claims and multiplied by {W.FLAG_RATE_SCALE}. Because it is a rate, a long report is not marked
              down for being long, and a short one is not excused for being short.
            </li>
            <li>
              <strong>Causal overreach.</strong> {W.OVERREACH_PER} points for each step a claim reaches past its
              design’s ceiling, up to {W.OVERREACH_CAP} in all. This sum is not divided by the number of claims,
              so padding a report with cautious sentences cannot dilute it.
            </li>
            <li>
              <strong>Checks on the whole document,</strong> at the costs listed above.
            </li>
            <li>
              <strong>Self-citation.</strong> Up to {W.SELF_CITATION} points, in proportion to the share of
              references and links that point back to the publisher, once there are at least{' '}
              {W.SELF_CITATION_MIN_POOL} of them.
            </li>
          </ol>
          <p>
            For the score, every claim is judged again at the standard’s strictest posture (a brief calls it the
            strictest setting), which is why the posture you choose can change the flags on the brief but not the
            number. The score never reads the
            date or anything random, so the same text and the same standard always produce the same score.
          </p>
          <div className="eh-table-scroll">
            <table className="eh-data">
              <caption>Score bands and the verdict each one gives</caption>
              <thead><tr><th scope="col">Band</th><th scope="col" className="n">From</th><th scope="col">Verdict, for a report</th></tr></thead>
              <tbody>
                {BAND_THRESHOLDS.map((b) => (
                  <tr key={b.band}>
                    <td>{cap(b.band)}</td>
                    <td className="n">{b.min.toFixed(1)}</td>
                    <td>{SUMMARY[b.band]?.('report')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A press release, a marketing page or another promotional document gets a verdict about what it
            “asserts” rather than about “the evidence” until its score reaches the strong band.
          </p>
          <p className="eh-note">
            Every weight, threshold, ceiling and word list on this page is provisional. We set them, tuned
            them against a small set of documents and checked them against published human labels where those
            exist (see <a href="#testing">How we test it</a>); none is yet ratified against human judgments
            of flags. Each is marked as provisional in <a href={REPO}>the code, which is public</a>.
          </p>

          <BriefNumbers rubrics={rubrics} />
          <ScoreScale />

          {/* ── 11 ────────────────────────────────────────────────────────── */}
          <h2 id="example">One paragraph, worked through</h2>
          <p>
            Here is a short paragraph in the voice of a firm’s report, read by the engine as this page loads.
            Nothing below is typed in by hand; if the engine changes, so does this example.
          </p>
          <blockquote className="eh-example">{EXAMPLE}</blockquote>
          <Example {...example} />
        </div>

        <div className="eh-col">
          {/* ── 12 ────────────────────────────────────────────────────────── */}
          <h2 id="limits">What the score does not show</h2>
          <ul>
            <li><strong>Whether a claim is true.</strong> A well-sourced claim can be wrong and an unsourced one right. The score measures support, not truth.</li>
            <li><strong>Whether a source says what the claim says.</strong> Citations are graded by their kind, not read. A claim that misstates the study it cites is graded as if it did not.</li>
            <li><strong>The quality of a cited study.</strong> A DOI earns the same rung whether it points to a strong trial or a weak one.</li>
            <li><strong>Numbers, tables and charts.</strong> Statistics are not recomputed, and figures are read only through their captions and “Source:” lines.</li>
            <li><strong>Links on pages read through the reader service.</strong> Text returned by r.jina.ai carries no links, so a web page’s hyperlinks cannot count as evidence there.</li>
            <li><strong>The echo of someone else’s overreach.</strong> A quoted, attributed sentence is the speaker’s claim, so a story that quotes an overreaching source is not flagged for it.</li>
            <li><strong>Every misreading.</strong> Word lists miss things. A sentence can be mistaken for a method statement and escape a flag, and a causal verb can be read as a noun.</li>
            <li><strong>Drafts.</strong> The {list(rubrics.filter((r) => r.stub).map((r) => r.label.toLowerCase()))} standards are drafts, still being tuned.</li>
          </ul>

          {/* ── 13 ────────────────────────────────────────────────────────── */}
          <h2 id="testing">How we test it</h2>
          <p>
            The code holds the engine to a suite of checks: the score is identical however often it runs,
            identical across postures and never higher for a hybrid than for its standard alone; a claim found
            under two standards is measured the same way under both; removing disclosures does not move causal
            overreach; and documents in a working corpus are routed to the genre, posture, publisher type and
            design we labeled them with. For benchmark documents, every field of the evidence brief is
            recorded, and a change that moves any of them fails until it is reviewed and recorded again.
          </p>
          <p>
            We also score the measurement layer against data sets that people labeled for published studies,
            beside the models those studies trained. The engine is a set of rules and word lists, not a trained
            model, and on most of these tasks it trails the models built for them.
          </p>
          <Benchmarks />
          <p>
            We have not yet measured, against human judgments of our own documents, how often a flag is right
            or how many flags the engine misses. Until we have, read a flag as a place to look, not a verdict.
          </p>

          {/* ── 14 ────────────────────────────────────────────────────────── */}
          <h2 id="privacy">Your document</h2>
          <p>
            Text you paste and files you upload are read entirely in your browser; nothing is uploaded and
            nothing is stored once you leave the page. A link is the exception: its address goes to the site it
            points to and, for most web pages, to r.jina.ai, which fetches the page and returns its text. The
            analysis itself still runs in your browser.
          </p>
          <p>
            A report reaches <Link to="/list">The List</Link> only if you add it from the bottom of its evidence
            brief. Then we send the details you confirm, the score, the engine build and a one-way fingerprint
            of the text that keeps the same report from being listed twice. The text itself is never sent.
          </p>

          {/* ── 15 ────────────────────────────────────────────────────────── */}
          <h2 id="sources">Sources</h2>
          <p>
            The rules draw on published standards and studies. Each evidence brief lists the ones behind the
            standard it used; here are all of them.
          </p>
          <SourceList title="Behind every standard" entries={SHARED_PROVENANCE} />
          {rubrics.map((r) => (
            <SourceList key={r.id} title={r.label} entries={r.provenance.filter((p) => !SHARED_PROVENANCE.includes(p))} />
          ))}
          <SourceList title="Behind the hybrid scenarios" entries={Object.values(FRAMEWORKS)} />

          <p className="eh-note eh-method-foot">
            Questions about the method, or a document you think it misreads: <Link to="/contact">Contact</Link>.
          </p>
        </div>
      </article>
    </main>
  )
}

const ROLE_WORDS = {
  speaker: 'Read from the link’s domain, or for an upload from the web address the document gives as its own (its copyright holder’s site or its contact email), and from cues in the text, such as a journal’s volume line, a press office’s “for immediate release” or a newsroom’s byline.',
  form: 'A press release, a research paper, a report, a news story, a column, a marketing page, sponsored content or a blog post.',
  stake: 'A news story built mostly on one firm’s statements, or a publisher with an advocacy mission or industry membership.',
  evidence: 'The design of the study the document reports or describes, from a randomized trial to none at all.',
}

// The first table to list a check holds its anchor (#signal-<id>), which a
// brief's document signals link to.
const SIGNAL_TABLES = [...RUBRIC_ORDER.map((id) => getRubric(id).documentSignals.filter((x) => !COMPLETENESS_GROUP.includes(x))), COMPLETENESS_GROUP, HYBRID_AUDITS]
const FIRST_TABLE = {}
SIGNAL_TABLES.forEach((ids, t) => ids.forEach((id) => { if (!(id in FIRST_TABLE)) FIRST_TABLE[id] = t }))

function SignalTable({ caption, ids, table }) {
  if (!ids.length) return null
  return (
    <div className="eh-table-scroll eh-break">
      <table className="eh-data eh-signals">
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Check</th><th scope="col">What it looks for</th><th scope="col">What it costs</th></tr></thead>
        <tbody>
          {ids.map((id) => {
            const [what, cost] = SIGNAL_COPY[id] || ['', 'note']
            return (
              <tr key={id} id={FIRST_TABLE[id] === table ? ANCHORS.signal(id) : undefined}>
                <td>{SIGNAL_TITLES[id] || humanize(id)}</td>
                <td>{what}</td>
                <td>{COST[cost]()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Example({ route, result }) {
  const rubric = route.judgment.rubric
  const b = result.documentScore.breakdown
  const flagName = (c) => {
    const names = []
    if (c.flag) names.push(c.flag === 'overconfident' ? 'Overconfident' : 'Unsupported assertion')
    if (c.overreach) names.push('Causal overreach')
    return names.join('; ') || 'None'
  }
  const minus = (x) => (x > 0 ? `−${round1(x)}` : '0')
  return (
    <>
      <p>
        The engine reads it as {rubric.label.toLowerCase()}, with a {DESIGN_LABELS[result.profile.design.design] || humanize(result.profile.design.design)}{' '}
        design of its own, and finds {result.claims.length} claims.
      </p>
      <div className="eh-table-scroll eh-break">
        <table className="eh-data eh-example-table">
          <caption>Each claim, as the engine reads it</caption>
          <thead>
            <tr>
              <th scope="col">Claim</th>
              <th scope="col">Whose</th>
              <th scope="col">Stated as</th>
              <th scope="col">Cause claimed</th>
              <th scope="col">Evidence reaches</th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            {result.claims.map((c, i) => (
              <tr key={i}>
                <td className="eh-example-claim">{c.text}</td>
                <td>{cap(ATTRIBUTION_WORDS[c.attribution?.label] || humanize(c.attribution?.label || ''))}</td>
                <td>{c.tier.label}</td>
                <td>{cap(REGISTER_WORDS[c.register?.register] || 'none')}</td>
                <td>{c.rung.label}</td>
                <td className={c.flag || c.overreach ? 'eh-flagged' : undefined}>{flagName(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>The score, step by step:</p>
      <table className="eh-data eh-arith">
        <tbody>
          <tr><td>Starting points</td><td className="n">{b.start}</td></tr>
          <tr><td>Flagged claims, as a rate</td><td className="n">{minus(b.flagContribution)}</td></tr>
          <tr><td>Causal overreach</td><td className="n">{minus(b.overreachPenalty)}</td></tr>
          <tr><td>Checks on the whole document</td><td className="n">{minus(b.signalPenalty + b.completenessPenalty + b.platitudePenalty)}</td></tr>
          <tr><td>Self-citation</td><td className="n">{minus(b.selfCitationPenalty)}</td></tr>
          <tr className="eh-arith-total"><td>Score</td><td className="n"><a href={`#${scoreAnchor(result.documentScore.display)}`}>{result.documentScore.score.toFixed(1)}</a></td></tr>
        </tbody>
      </table>
      <p>
        Its verdict: “{result.documentScore.summary}” The survey result stands, because the survey backs
        it. What costs the paragraph is everything stated past the survey: a trend asserted with no source,
        a correlation in a survey turned into a cause, commentary treated as proof and advice the evidence
        cannot support.
      </p>
    </>
  )
}
const round1 = (x) => Math.round(x * 10) / 10

// Engine against each published model, on the same labeled rows.
const BENCH_TASKS = [
  { source: 'yu2019_pubmed', metric: 'macroF1', task: 'Causal language in research findings', data: 'Yu, Li and Wang 2019 (PubMed abstracts)' },
  { source: 'yu2020_eureka', metric: 'macroF1', task: 'Causal language in press releases', data: 'Yu and colleagues 2020 (EurekAlert! releases)' },
  { source: 'pei2021', metric: 'spearman', task: 'How certain a finding is stated', data: 'Pei and Jurgens 2021' },
  { source: 'cessc_ssc', metric: 'f1', task: 'Whether a sentence claims cause', data: 'Causal sentences from social-science papers' },
]
const SYSTEM_NAMES = {
  'yu2019-causal': 'Yu and colleagues’ model',
  'certainty-estimator-sentence': 'Pei and Jurgens’ certainty estimator',
  cessc: 'that data set’s own model',
  'unicausal-seq': 'UniCausal (our training run)',
  'unicausal-seq-released': 'UniCausal (released weights)',
}
const METRIC_WORDS = { macroF1: 'macro F1', spearman: 'rank correlation', f1: 'F1' }

function Benchmarks() {
  const engine = `engine@${BENCH_ENGINE}`
  const rows = BENCH_TASKS.flatMap((t) =>
    BENCH.filter((m) => m.source === t.source && m.metric === t.metric && m.system !== engine && m.split === 'model-eligible').map((m) => {
      const ours = BENCH.find((e) => e.system === engine && e.source === m.source && e.metric === m.metric && e.split === m.split && e.rows === m.rows)
        || BENCH.find((e) => e.system === engine && e.source === m.source && e.metric === m.metric && e.split === 'all')
      return { ...t, rows: m.rows, model: SYSTEM_NAMES[m.system.split('@')[0]] || m.system, theirs: m.value, ours: ours?.value }
    }),
  )
  return (
    <div className="eh-table-scroll eh-break">
      <table className="eh-data">
        <caption>
          Engine and published models on the same human-labeled rows
          <span className="eh-caption-sub">
            Engine {BENCH_ENGINE}, run {apDate(BENCH_DATE.slice(0, 10))}. Higher is closer to the human labels,
            and 1 is full agreement. <a href={`${REPO}/blob/main/checks/reports/benchmark-${BENCH_ENGINE}.md`}>The full report</a>.
          </span>
        </caption>
        <thead>
          <tr><th scope="col">Task</th><th scope="col">Labeled data</th><th scope="col" className="n">Rows</th><th scope="col">Measure</th><th scope="col" className="n">Engine</th><th scope="col">Model</th><th scope="col" className="n">Model’s score</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.task}</td>
              <td>{r.data}</td>
              <td className="n">{r.rows.toLocaleString('en-US')}</td>
              <td>{METRIC_WORDS[r.metric]}</td>
              <td className="n">{r.ours?.toFixed(3) ?? '—'}</td>
              <td>{r.model}</td>
              <td className="n">{r.theirs.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceList({ title, entries }) {
  if (!entries.length) return null
  return (
    <section className="eh-sources">
      <h3>{title}</h3>
      <ul>
        {entries.map((p) => (
          <li key={p.standard}>
            {p.url ? <a href={p.url} target="_blank" rel="noreferrer noopener">{p.standard}</a> : p.standard}
            <span className="eh-source-for"> for {p.criterion.replace(/ — /g, ': ')}.</span> <span className="eh-source-cite">{p.citation}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── The numbers on a brief ───────────────────────────────────────────────────
// Each label on a brief's top links to its definition here (briefTop.js).
// PROVISIONAL — not ratified (definitions).
function BriefNumbers({ rubrics }) {
  const strictest = rubrics.map((r) => `${r.strictestPosture} for ${r.label.toLowerCase()}`)
  const firmResearch = HYBRIDS.find((h) => h.id === 'firm-research')
  const strongTiers = TIERS.filter((t) => t.weight >= 3).map((t) => t.label.toLowerCase())
  return (
    <>
      <h2 id="numbers">The numbers on a brief</h2>
      <p>
        The top of every brief says what we read the document as and the standard we held it to, then
        gives a score and four counts. Each is defined here, and each links here from the brief.
      </p>
      <dl className="eh-defs">
        <dt id={ANCHORS.readAs}>Read as</dt>
        <dd>
          What kind of document we took it for. A document that mixes genres reads as the scenario that fits
          it, such as “{firmResearch.name.toLowerCase()}”; a document of one genre reads as the kind it is
          within that genre, such as “{READ_AS['research-like'].toLowerCase()}.” You see the reading, and can
          change it, before the analysis runs (see <a href="#kind">What kind of document it is</a>).
        </dd>
        <dt id="held-to">Held to</dt>
        <dd>
          The standard the claims were judged against: research, corporate, journalism or general web. Each has
          its own ladder of evidence and its own limit on how firmly each kind of evidence may be stated, in the
          tables under <a href="#flags">When a claim outruns its evidence</a>.
        </dd>
        <dt id={ANCHORS.claims}>Claims weighed</dt>
        <dd>
          Every sentence we kept as a claim (see <a href="#claims">Finding the claims</a>). Statements of
          method are counted but never flagged.
        </dd>
        <dt id={ANCHORS.strong}>Read as strong</dt>
        <dd>
          Claims stated with a booster or an absolute and no hedge, such as “clearly,” “shows that,” “always”
          or “proves” (the {list(strongTiers)} levels of certainty). A plain statement is not strong, yet under
          a strict standard it is still flagged when it cites nothing, so most flagged claims on a brief are
          plain statements.
        </dd>
        <dt id={ANCHORS.flagged}>Flagged</dt>
        <dd>
          Claims with at least one flag: an unsupported assertion, an overconfident claim or a causal
          overreach, each counted once. One claim can be both unsupported and an overreach, so the three counts
          under the row can add up to more than the flagged total; the brief says how many claims have two. The
          headline counts the same claims, as “so many of so many claims say more than their evidence shows.”
        </dd>
        <dt id={ANCHORS.strictest}>The strictest setting</dt>
        <dd>
          A brief flags claims at the setting the document was read with, so a marketing page may sound surer
          than a research report without a flag on every line. The score does not: it judges every claim again
          at the strictest setting of its standard ({list(strictest)}), and counts a firm’s or a press
          office’s own data one step lower on the ladder. When the two differ, the brief says how many claims
          the score counted.
        </dd>
      </dl>
    </>
  )
}

// ── What makes a 1 through a 10 ─────────────────────────────────────────────
// Derived from scoreDocument.js: the shown number is Math.round of a score
// that is 10 minus the losses, held to 1–10 and kept to one decimal, so a
// shown N means the document lost more than 9.5 − N and at most 10.5 − N
// points. The counts and anchors come from scripts/method-scale.mjs (the
// corpus audit), never typed in. PROVISIONAL — not ratified (meanings).
const BAND_MEANING = {
  strong: 'Almost every claim is stated no more firmly than its evidence shows.',
  carried: 'The evidence supports most of what it claims; some claims go further.',
  mixed: 'Some claims go beyond what their evidence supports, though most do not.',
  weak: 'Much of what it claims goes beyond its evidence.',
  failing: 'The evidence does not support what it claims.',
}
const SCALE_NOTE = {
  10: 'A 10 and a 9 give the same verdict; a 10 lost almost nothing.',
  9: 'A 10 and a 9 give the same verdict; a 9 lost a little more.',
  8: `A 7 and an 8 give the same verdict; they differ only in points lost. Writing from personal experience, which is not weighed, gets ${W.GATE_SCORE} and shows as ${Math.round(W.GATE_SCORE)}.`,
  7: 'A 7 and an 8 give the same verdict; they differ only in points lost.',
  5: 'A 5 straddles two verdicts: a score of 5.0 or more is “mixed” and anything lower is “weak,” so two documents showing 5 can read differently.',
  3: 'A 3 straddles two verdicts: a score of 3.0 or more is “weak” and anything lower is “failing,” so two documents showing 3 can read differently.',
  2: 'A 2 and a 1 give the same verdict; a 2 lost less.',
  1: `A 1 is the floor: it also takes in every document that would score lower, so a 1 does not say how far below the floor a document fell.`,
}

function ScoreScale() {
  const plainCost = W.flag['unsupported-assertion'] * W.FLAG_RATE_SCALE
  const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  const stdRows = RUBRIC_ORDER.map((id) => ({ id, label: getRubric(id).label, ...SCALE.byStandard[id] }))
  return (
    <>
      <h2 id="scale">What makes a 1 through a 10</h2>
      <p>
        A brief shows the score rounded to the nearest whole number. The score is {W.START_BUDGET} minus what
        the document loses. It loses points for its flagged claims, counted as a rate, and up to{' '}
        {W.OVERREACH_CAP} for causal overreach; it also pays for the checks on the whole document, missing
        reporting items, platitudes and self-citation (see <a href="#score">From flags to a score</a>). It is held between {W.MIN} and {W.MAX}{' '}
        and kept to one decimal. So a whole number on a brief means the document lost more than half a point
        below what would round to the next number up, and at most half a point above it.
      </p>
      <p>
        One way to picture the losses: under a strict standard, a plain statement that cites nothing costs a
        document {round1(plainCost / 10)} points for every tenth of its claims that are like it. A claim stated
        absolutely with nothing cited costs up to three times as much.
      </p>
      <p className="eh-note">
        The examples below are documents from our corpus that scored each number and that a reviewer read
        alongside their text and found the output sound. They were scored by engine build {SCALE.engine} on{' '}
        {apDate(SCALE.generated)}, each as its PDF uploaded, and they change when the scoring changes. Pasting
        the link instead can give a different reading, because the web address names the publisher. We name
        and link them; we do not quote them.
      </p>
      <ol className="eh-scale">
        {scores.map((n) => <ScaleEntry key={n} n={n} plainCost={plainCost} />)}
      </ol>

      <h3>Whether a 4 means the same under every standard</h3>
      <p>
        It does not quite. A score is relative to the standard a document is held to, because each standard
        has its own ladder and its own limits on how firmly each kind of evidence may be stated (compare the
        tables under <a href="#flags">When a claim outruns its evidence</a>). The same text can score
        differently under two of them. Every document in our corpus was also scored under all four standards,
        whatever it was read as:
      </p>
      <div className="eh-table-scroll">
        <table className="eh-data">
          <caption>The same {num(SCALE.corpus.scored)} documents, scored under each standard</caption>
          <thead><tr><th scope="col">Standard</th><th scope="col" className="n">Median score</th><th scope="col" className="n">Shown as a 1</th></tr></thead>
          <tbody>
            {stdRows.map((r) => (
              <tr key={r.id}><td>{r.label}</td><td className="n">{r.median?.toFixed(1)}</td><td className="n">{num(r.shownAsOne)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        So a 4 under the journalism standard and a 4 under the general web standard both mean the document
        lost about six points, but they lost them against different limits. Compare scores across documents
        held to the same standard.
      </p>
    </>
  )
}

const aN = (n) => (n === 8 || n === 11 || n === 18 ? `an ${n}` : `a ${n}`)
const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
// A manifest's publication date ("2024" or "2024-04") in AP style.
const published = (p) => { const m = /^(\d{4})(?:-(\d{2}))?/.exec(p || ''); return m ? (m[2] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : m[1]) : null }

function ScaleEntry({ n, plainCost }) {
  const lost = { lo: Math.max(0, 9.5 - n), hi: 10.5 - n }
  const bands = [...new Set([bandFor(Math.min(W.MAX, n + 0.4)), bandFor(Math.max(W.MIN, n - 0.5))])]
  const meaning = bands.length > 1 ? `${BAND_MEANING[bands[0]]} Or, at the low end: ${BAND_MEANING[bands[1]].charAt(0).toLowerCase()}${BAND_MEANING[bands[1]].slice(1)}` : BAND_MEANING[bands[0]]
  const at = SCALE.byScore[n]
  const lostText = n === 10
    ? `It lost no more than ${lost.hi.toFixed(1)} points.`
    : n === 1
      ? `It lost more than ${lost.lo.toFixed(1)} points.`
      : `It lost more than ${lost.lo.toFixed(1)} and at most ${lost.hi.toFixed(1)} points.`
  const share = (x) => Math.round((x / plainCost) * 100)
  const plainText = lost.lo >= plainCost
    ? 'Plain statements that cite nothing cannot do this alone: a document whose every claim was one would still score 2. It also takes overreach, problems with the whole document or claims stated absolutely.'
    : n === 10
      ? `If plain statements that cite nothing were its only loss, at most ${share(lost.hi)}% of its claims could be like that.`
      : `If plain statements that cite nothing were its only loss, ${share(lost.lo)}% to ${Math.min(100, share(lost.hi))}% of its claims would be like that.`
  return (
    <li id={scoreAnchor(n)} className="eh-scale-entry">
      <h3><span className="eh-scale-n">{n}</span> {cap(bands.join(' or '))}</h3>
      <p><strong>{meaning}</strong> {SCALE_NOTE[n] || ''}</p>
      <p>{lostText} {plainText}</p>
      <p className="eh-scale-example">
        {at.documents === 0
          ? `No document in our corpus scored ${aN(n)}, so there is no example; the arithmetic allows it.`
          : at.anchor
            ? <>Example: <a href={at.anchor.url}>{at.anchor.title}</a>{at.anchor.publisher ? `, ${at.anchor.publisher}` : ''}{published(at.anchor.published) ? ` (${published(at.anchor.published)})` : ''}, read as {at.anchor.readAs.toLowerCase()}, scored {at.anchor.score.toFixed(1)}. {num(at.documents)} {at.documents === 1 ? 'document' : 'documents'} in our corpus scored {aN(n)}.</>
            : `No clean example yet: ${num(at.documents)} ${at.documents === 1 ? 'document' : 'documents'} in our corpus scored ${aN(n)}, and none has passed review.`}
      </p>
    </li>
  )
}
