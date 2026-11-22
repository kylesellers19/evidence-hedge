import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { CONTACT_EMAIL, usePageTitle } from '../components/layout/SiteLayout.jsx'
import release from './release.json'
import { VERDICTS, readFilters, writeFilter, selectSessions, formatDate, formatLocator, claimSourceUrl, chronology, clock, validateRelease } from './model.js'
import './conferences.css'

const Research = createContext(null)
let cachedRelease = null
const downloadUrl = `${import.meta.env.BASE_URL}${release.path}`
const sessionPath = (id) => `/conferences/${id}`
const claimPath = (c) => `${sessionPath(c.sessionId)}#${c.id}`
const verdictClass = (v) => v.toLowerCase().replaceAll(' ', '-')
const useResearch = () => useContext(Research)

function SectionNav() {
  return <nav className="eh-conf-nav" aria-label="Conference research">
    <NavLink to="/conferences" end>Reviews</NavLink>
    <NavLink to="/conferences/catalogue">Catalogue</NavLink>
    <NavLink to="/conferences/access">Access log</NavLink>
    <NavLink to="/conferences/method">Review method</NavLink>
  </nav>
}
export default function ConferenceRoutes() {
  const [data, setData] = useState(cachedRelease)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (cachedRelease) { setData(cachedRelease); return }
    const controller = new AbortController()
    setError(false)
    fetch(`${downloadUrl}?v=${release.sha256.slice(0, 16)}`, { signal: controller.signal }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    }).then(validateRelease).then((value) => {
      if (!controller.signal.aborted) { cachedRelease = value; setData(value) }
    }).catch((err) => { if (err.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [attempt])
  // The site frame's first anchor attempt can finish before an asynchronous
  // research release arrives. Repeat the jump after this page renders.
  useEffect(() => {
    if (!data || !hash) return
    let id
    try { id = decodeURIComponent(hash.slice(1)) } catch { return }
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [data, hash, pathname])
  if (!data) return <main className="eh-page eh-conferences"><div className="eh-col">
    <SectionNav /><h1 className="eh-hed">Conferences</h1>
    {error ? <div role="alert"><p>The conference reviews could not be loaded. Try again in a moment.</p>
      <button className="eh-button" onClick={() => setAttempt((a) => a + 1)}>Try again</button></div>
      : <p role="status">Loading the conference reviews…</p>}
  </div></main>
  return <Research.Provider value={data}><main className="eh-page eh-conferences">
    <div className="eh-wide"><SectionNav /></div>
    <Routes>
      <Route index element={<Browse />} />
      <Route path="catalogue" element={<Browse catalogue />} />
      <Route path="method" element={<ReviewMethod />} />
      <Route path="access" element={<AccessLog />} />
      <Route path=":sessionId" element={<Session />} />
      <Route path="*" element={<MissingSession />} />
    </Routes>
  </main></Research.Provider>
}

function Browse({ catalogue = false }) {
  const data = useResearch()
  usePageTitle(catalogue ? 'Conference catalogue' : 'Conferences')
  const [params, setParams] = useSearchParams()
  const domains = useMemo(() => [...new Set(data.sessions.filter((s) => catalogue ? s.originalCatalogue : s.reviewed).map((s) => s.domain))].sort(), [data, catalogue])
  const filters = readFilters(params, domains)
  const found = selectSessions(data, filters, catalogue)
  const claimCount = found.reduce((n, r) => n + r.claims.length, 0)
  const matchingSessions = found.filter((r) => r.claims.length).length
  const narrowed = filters.q || filters.domain || filters.verdict || filters.show
  const update = (key, value) => setParams(writeFilter(params, key, value), { replace: key === 'q' })
  return <>
    <header className="eh-col eh-conf-intro">
      <p className="eh-kicker">Conference research</p>
      <h1 className="eh-hed">{catalogue ? 'The conference catalogue' : 'What the claims stand on'}</h1>
      <p className="eh-dek">{catalogue
        ? 'The 89 talks, panels and addresses in the original discovery set. Seventeen have selected claim reviews; the other 72 remain unassessed.'
        : 'Follow a claim from a conference talk to the studies, data and assumptions behind it. Read the finding, its limits and the surrounding exchange.'}</p>
      <p className="eh-conf-meta">Events from {formatDate(data.eventWindow[0])} to {formatDate(data.eventWindow[1])}. Research updated {formatDate(data.release)}.</p>
      <p className="eh-conf-disclosure">Provisional AI-assisted research. No human review or full audiovisual verification. A verdict applies to the selected claim and its stated scope. <Link to="/conferences/method">How these reviews were made</Link>.</p>
    </header>
    {!catalogue && <div className="eh-wide">
      <dl className="eh-conf-counts" aria-label="Research coverage">
        <div><dt>Reviewed sessions</dt><dd>{data.counts.reviewedSessions}</dd></div>
        <div><dt>Selected claims</dt><dd>{data.counts.claims}</dd></div>
        <div><dt>Evidence records</dt><dd>{data.counts.evidence}</dd></div>
        <div><dt>Original catalogue</dt><dd><Link to="/conferences/catalogue">{data.counts.originalCatalogue} sessions</Link></dd></div>
      </dl>
      <div className="eh-conf-reading">
        <p><strong>Energy, measured carefully.</strong> Compare <Link to="/conferences/EC15">CERAWeek</Link> and <Link to="/conferences/EC29">COP30</Link> on denominators, costs and policy effects.</p>
        <p><strong>When qualifications matter.</strong> Read the <Link to="/conferences/EC25">BPEA housing discussion</Link> and <Link to="/conferences/H12">research-methods panel</Link>.</p>
      </div>
    </div>}
    {catalogue && <p className="eh-col eh-conf-small">The original set contains 81 main candidates and eight supplements. Ten additional candidates and 30 original leads are kept separately in the <Link to="/conferences/access">access log</Link>. Inclusion does not imply an assessment of accuracy.</p>}
    <section className="eh-wide eh-conf-browser" aria-labelledby="browse-heading">
      <h2 id="browse-heading">{catalogue ? 'Browse the original sessions' : 'Explore the reviews'}</h2>
      <form className="eh-conf-filters" onSubmit={(e) => e.preventDefault()} role="search" aria-label="Search conference research">
        <label className="eh-conf-search"><span>Search sessions, speakers and claims</span>
          <input type="search" maxLength={250} value={filters.q} onChange={(e) => update('q', e.target.value)} placeholder="Try housing, energy or a speaker’s name" /></label>
        <Filter label="Subject" value={filters.domain} onChange={(v) => update('domain', v)} options={[[ '', 'All subjects'], ...domains.map((d) => [d, d])]} />
        <Filter label="Claim verdict" value={filters.verdict} onChange={(v) => update('verdict', v)} options={[[ '', 'All verdicts'], ...VERDICTS.map((v) => [v, v])]} />
        {catalogue && <Filter label="Review status" value={filters.show} onChange={(v) => update('show', v)} options={[[ '', 'All sessions'], ['reviewed', 'Claims reviewed'], ['unreviewed', 'Not assessed']]} />}
        <Filter label="Sort" value={filters.sort} onChange={(v) => update('sort', v)} options={[[ 'date-desc', 'Newest event first'], ['date-asc', 'Oldest event first'], ['title', 'Session title']]} />
      </form>
      <div className="eh-conf-results-bar">
        <div className="eh-conf-toggle" role="group" aria-label="Results view">
          <button type="button" aria-pressed={filters.view === 'sessions'} onClick={() => update('view', 'sessions')}>Sessions</button>
          <button type="button" aria-pressed={filters.view === 'claims'} onClick={() => update('view', 'claims')}>Claims</button>
        </div>
        <p role="status">{filters.view === 'claims' ? `${claimCount} ${claimCount === 1 ? 'claim' : 'claims'} in ${matchingSessions} ${matchingSessions === 1 ? 'session' : 'sessions'}` : `${found.length} ${found.length === 1 ? 'session' : 'sessions'}`}{narrowed ? ' matching your filters' : ''}</p>
        {(narrowed || filters.sort !== 'date-desc') && <button type="button" className="eh-inlinebutton" onClick={() => setParams(filters.view === 'claims' ? { view: 'claims' } : {})}>Clear filters</button>}
      </div>
      {filters.view === 'sessions' ? <ol className="eh-conf-session-list">
        {found.map(({ session: s, claims }) => <li key={s.id}>
          <div className="eh-conf-session-meta"><span>{s.domain}</span><span>{formatDate(s.date)}</span></div>
          <h3><Link to={sessionPath(s.id)}>{s.title}</Link></h3>
          <p className="eh-conf-small">{s.event} · <span className="eh-code">{s.id}</span></p>
          <p className="eh-conf-speakers">{s.speakers.join('; ')}</p>
          <p className="eh-conf-status">{s.reviewed ? `${s.claims.length} selected claims reviewed${narrowed ? ` · ${claims.length} matching` : ''}` : 'Not assessed'}</p>
          {s.reviewed && <p className="eh-conf-verdict-list">{VERDICTS.filter((v) => claims.some((c) => c.verdict === v)).map((v) => <span key={v}>{claims.filter((c) => c.verdict === v).length} {v.toLowerCase()}</span>)}</p>}
        </li>)}
      </ol> : <ol className="eh-conf-claim-results">
        {found.flatMap(({ session: s, claims }) => claims.map((c) => <li key={c.id}>
          <Verdict verdict={c.verdict} />
          <h3><Link to={claimPath(c)}>{c.statement}</Link></h3>
          <p className="eh-conf-small">{c.speaker} · {s.title} · {formatDate(s.date)}</p>
          <p><strong>Scope:</strong> {c.scope}</p>
        </li>))}
      </ol>}
      {(filters.view === 'claims' ? claimCount === 0 : found.length === 0) && <div className="eh-conf-empty">
        <p>{filters.show === 'unreviewed' && filters.view === 'claims' ? 'Unassessed sessions have no claim verdicts yet.' : 'No results match these filters.'}</p>
        <button type="button" className="eh-button is-quiet" onClick={() => setParams({})}>Show all {catalogue ? 'catalogue sessions' : 'reviewed sessions'}</button>
      </div>}
    </section>
  </>
}
function Filter({ label, value, options, onChange }) {
  return <label><span>{label}</span><select className="eh-select" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>
}
function Verdict({ verdict }) {
  return <span className={`eh-conf-verdict is-${verdictClass(verdict)}`}>{verdict}</span>
}
function SourceLinks({ sources }) {
  return <ul className="eh-conf-source-links">{sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url}>{s.label}</a></li>)}</ul>
}
function MissingSession() {
  usePageTitle('Conference session not found')
  return <div className="eh-col"><h1 className="eh-hed">Session not found</h1><p>This address does not match a session in the current release.</p><p><Link to="/conferences">Browse the reviews</Link> or <Link to="/conferences/catalogue">open the catalogue</Link>.</p></div>
}
function Session() {
  const data = useResearch()
  const { sessionId } = useParams()
  const s = data.sessions.find((r) => r.id === sessionId.toUpperCase())
  usePageTitle(s ? s.title : 'Conference session not found')
  const em = useMemo(() => Object.fromEntries(data.evidence.map((e) => [e.id, e])), [data])
  if (!s) return <MissingSession />
  const correction = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Conference review: ${s.id}`)}`
  return <article className="eh-col eh-conf-session">
    <p className="eh-conf-small"><Link to={s.originalCatalogue ? '/conferences/catalogue' : '/conferences/access'}>{s.originalCatalogue ? 'Conference catalogue' : 'Additional access candidates'}</Link> / {s.id}</p>
    <p className="eh-kicker">{s.domain}</p>
    <h1 className="eh-hed">{s.title}</h1>
    <p className="eh-dek">{s.event}</p>
    <dl className="eh-conf-facts">
      <div><dt>Event date</dt><dd>{formatDate(s.date)} <span className="eh-conf-small">({s.datePrecision})</span></dd></div>
      {s.speakers.length > 0 && <div><dt>Speakers</dt><dd>{s.speakers.join('; ')}</dd></div>}
      <div><dt>Review status</dt><dd>{s.reviewed ? `${s.claims.length} selected claims reviewed · provisional` : 'Not assessed'}</dd></div>
      <div><dt>Source access</dt><dd>{s.access}</dd></div>
    </dl>
    <SourceLinks sources={s.sources} />
    {s.reviewed ? <>
      <p className="eh-conf-disclosure">These are provisional assessments of selected assertions. They are not a verdict on the whole session or its speakers. Two AI reviews were compared; no human review or full audiovisual verification has been performed.</p>
      <details className="eh-conf-details" open><summary>Review boundaries and source limitations</summary>
        <p>{s.unit.boundaries}</p><p>{s.unit.provenance}</p><p>{s.unit.coverage}</p>
        {s.unit.secondCoverage && <p><strong>Second review:</strong> {s.unit.secondCoverage}</p>}
        <p>{s.unit.attributionLimit}</p><p className="eh-conf-small">Access checked {formatDate(s.unit.checkedOn)}. <Link to="/conferences/method">Review method and definitions</Link>.</p>
      </details>
      <nav className="eh-conf-claim-nav" aria-label="Claims in this session"><h2>Selected claims</h2><ol>{s.claims.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.statement}</a><span>{c.verdict}</span></li>)}</ol></nav>
      {s.claims.map((c) => <Claim key={c.id} claim={c} evidence={em} />)}
    </> : <section>
      <h2>What remains to be reviewed</h2>
      <p>{s.discovery.question}</p>
      <p><strong>Evidence to seek:</strong> {s.discovery.evidenceToSeek}</p>
      <p>This is a prospective research question, not a finding about the session. No claim-level verdict or score has been assigned.</p>
      {s.unit && <><h3>Current access information</h3><p>{s.unit.boundaries}</p><p>{s.unit.provenance}</p><p>{s.unit.coverage}</p></>}
    </section>}
    {s.discovery.recordedOn && <details className="eh-conf-details"><summary>Original discovery record · {formatDate(s.discovery.recordedOn)}</summary>
      <p>This preserves what was known at discovery. The review and dated access checks above may resolve the earlier caveats.</p>
      <p><strong>Date as first sourced:</strong> {formatDate(s.discovery.date)} ({s.discovery.datePrecision}).</p>
      <p><strong>Original access:</strong> {s.discovery.access}</p><p>{s.discovery.accessEvidence}</p><p>{s.discovery.caveats}</p>
      <p><strong>Prospective question:</strong> {s.discovery.question}</p>
    </details>}
    <p className="eh-conf-correction">A missing source, transcription error or different reading? <a href={correction}>Suggest a correction</a>, including the session or claim ID and the supporting source.</p>
    <p className="eh-conf-small"><Link to="/conferences">All reviewed sessions</Link> · <Link to="/conferences/method">Review method</Link> · <a href={downloadUrl} download>Download the research data (JSON)</a></p>
  </article>
}
function Claim({ claim: c, evidence }) {
  const data = useResearch()
  const definition = data.verdicts.find((v) => v.label === c.verdict)?.definition
  return <section id={c.id} className="eh-conf-claim" aria-labelledby={`${c.id}-title`}>
    <div className="eh-conf-claim-label"><Verdict verdict={c.verdict} /><a href={`#${c.id}`} aria-label={`Permanent link to ${c.id}`}>{c.id}</a></div>
    <h2 id={`${c.id}-title`}>{c.statement}</h2>
    <p className="eh-conf-meta">{c.speaker} · <a href={claimSourceUrl(c)}>{formatLocator(c.locator)}</a> · {c.type}{c.recordingUrl && <> · <a href={c.sourceUrl}>Published source text</a></>}</p>
    <p className="eh-conf-scope"><strong>Assessed scope.</strong> {c.scope}</p>
    {c.scopeNote && <p className="eh-conf-scope-note">{c.scopeNote}</p>}
    <p>{c.rationale}</p>
    <p className="eh-conf-small"><strong>{c.verdict}:</strong> {definition}</p>
    <details className="eh-conf-details"><summary>Wording and the surrounding exchange</summary>
      <p className="eh-conf-small">Short source excerpt; the statement above is an analyst paraphrase.</p>
      <blockquote>“{c.excerpt}”</blockquote>
      <p>{c.context}</p>
      {c.response.length > 0 && <p><strong>Response or qualification:</strong> {c.response.join(' ')}</p>}
      <p><strong>Attribution:</strong> {c.attribution}. {c.attributionLimit}</p>
      <p><strong>Wording:</strong> {c.explicitOrInferred}.</p>
      <p className="eh-conf-small">The full selected source span is identified by its original source and locator. Its SHA-256 fingerprint is <code className="eh-conf-hash">{c.sourceSpanHash}</code>. Full third-party text is not reproduced here.</p>
    </details>
    <div className="eh-conf-evidence"><h3>Evidence behind this assessment</h3>
      {c.evidenceIds.length ? c.evidenceIds.map((id) => <Evidence key={id} item={evidence[id]} />) : <p>This selected unit is a proposal or value judgment, or has an unresolved evidence gap described above. It does not carry an empirical validation.</p>}
    </div>
    <details className="eh-conf-details"><summary>Criteria, second review and unresolved questions</summary>
      <dl className="eh-conf-criteria">{c.criteria.map(({ code, reason }) => <div key={code}><dt><Link to={`/conferences/method#${code}`}>{code} · {data.criteria.find((r) => r.code === code)?.name}</Link></dt><dd>{reason}</dd></div>)}</dl>
      <p><strong>Initial primary:</strong> {c.review.primary}. <strong>Second review:</strong> {c.review.second}. <strong>Final provisional:</strong> {c.review.final}.</p>
      <p>{c.review.reason}</p>
      <p className="eh-conf-small">{c.stage === 'Pilot' ? 'Pilot: the primary pass was partly unblinded.' : 'Expansion: the second pass was frozen before primary verdicts were opened.'} Shared extraction and AI review are not independent human validation. Assessment dated {formatDate(c.assessedOn)}.</p>
      {c.unresolved.length > 0 && <><h3>Still unresolved</h3><ul>{c.unresolved.map((q, i) => <li key={i}>{q}</li>)}</ul></>}
    </details>
  </section>
}
function Evidence({ item: e }) {
  if (!e) return <p>Evidence record unavailable in this release.</p>
  const fields = [['Relevant passage',e.locator],['Study or source design',e.design],['Population',e.population],['Exposure or intervention',e.exposure],['Comparator',e.comparator],['Outcome',e.outcome],['Timeframe',e.timeframe],['Uncertainty and assumptions',e.uncertainty]]
  return <div className="eh-conf-evidence-item">
    <p><a href={e.url}>{e.title}</a></p>
    <p className="eh-conf-small"><span className={e.availableAtEvent === false ? 'eh-conf-later' : ''}>{chronology(e)}</span>{e.date && ` · ${e.date}`} · {e.id}</p>
    <p>{e.relation || e.summary}</p>
    <details><summary>Source details and limitations</summary><dl className="eh-conf-source-detail">{fields.filter(([,v])=>v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
  </div>
}

function ReviewMethod() {
  const data = useResearch()
  usePageTitle('Conference review method')
  return <article className="eh-col eh-conf-method">
    <p className="eh-kicker">Conference research</p><h1 className="eh-hed">How a claim is reviewed</h1>
    <p className="eh-dek">Does the evidence justify the strength, scope, outcome and practical implication of the assertion?</p>
    <p>Conference reviews trace selected assertions to external studies, data and reports. They use six provisional verdicts and ten criteria. The document analyzer has a separate <Link to="/method">rule-based method and 1–10 score</Link>; these research verdicts are not converted into that score.</p>
    <p className="eh-conf-disclosure">{data.review.limits}</p>
    <nav className="eh-conf-local-nav" aria-label="On this method page"><a href="#selection">Selection</a><a href="#verdicts">Verdicts</a><a href="#criteria">Criteria</a><a href="#reviewers">Review and disagreement</a><a href="#downloads">Data and sources</a></nav>
    <h2 id="selection">What was selected</h2><p>{data.review.selection}</p>
    <p>The original discovery set contains 89 entries: 81 main candidates and eight supplements. The review covers all 15 first-pass sessions plus the CERAWeek address and BPEA housing discussion, for 17 sessions and 86 claim units. The other 72 original entries remain unassessed. Ten newer access candidates remain separate.</p>
    <p>Reviewers read the full available text unit before extraction, preserving questions, qualifications, challenges and later responses. Access limits remain visible: edited-out discussions, missing language segments, automatic-caption errors and inferred speaker turns. A second reviewer’s extent of reading is reported where it is narrower than the primary review.</p>
    <h2 id="verdicts">What the verdicts mean</h2>
    <dl className="eh-conf-definitions">{data.verdicts.map((v)=><div key={v.label}><dt>{v.label}</dt><dd>{v.definition}</dd></div>)}</dl>
    <p>“Not assessed” is a workflow status, not a seventh verdict. “Supported” may describe a faithfully reported model, survey or first-party result within its explicit scope; it does not mean the underlying data were independently replicated. Missing support is not proof of falsity. A contradiction does not establish deceptive intent.</p>
    <h2 id="criteria">Ten questions about the evidence</h2>
    <p>Apply only the criteria that matter to the scoped assertion. The criteria do not add up to a composite misinformation score.</p>
    <dl className="eh-conf-definitions">{data.criteria.map((c)=><div id={c.code} key={c.code}><dt>{c.code} · {c.name}</dt><dd><p>{c.test}</p><p className="eh-conf-small">Look for: {c.evidenceToSeek}</p></dd></div>)}</dl>
    <h2 id="reviewers">Review and disagreement</h2><p>{data.review.blinding}</p>
    <p>The three-session pilot had 18 matching initial verdicts out of 20. The expansion had 52 out of 66, with 14 disagreements. Both initial codes and the final provisional judgment appear on each claim. Adjudication also corrected scope when two reviewers happened to agree.</p>
    <p>Later evidence can corroborate a finding retrospectively, but cannot be treated as public evidence available at the event. Dates for delivery, upload, publication and access are kept distinct. A forecast retains its conditions; being future-dated is not disproof. A whole panel receives no truth rating from its selected claims.</p>
    <h2>How much the counts tell us</h2>
    <table className="eh-data"><caption>Verdicts among the 86 selected claims</caption><thead><tr><th scope="col">Verdict</th><th scope="col">Claims</th></tr></thead><tbody>{data.verdicts.map((v)=><tr key={v.label}><th scope="row">{v.label}</th><td>{data.counts.verdicts[v.label]}</td></tr>)}</tbody></table>
    <p>These are counts in a purposive sample, not estimates of misinformation prevalence, rankings of speakers or measures of human reviewer reliability.</p>
    <h2 id="downloads">Data and sources</h2><p>{data.review.sourceHandling}</p>
    <p><a className="eh-button" href={downloadUrl} download>Download the research data (JSON)</a></p>
    <p className="eh-conf-small">Release {data.release} · {data.rubricVersion}. Includes the public catalogue, 86 claim records, 178 evidence records, initial and adjudicated verdicts, criteria and access checks.</p>
    <details className="eh-conf-details"><summary>Release provenance</summary><p>The discovery snapshot is dated {formatDate(data.provenance.snapshotDate)}. {data.provenance.notes}</p><p>Original snapshot SHA-256: <code className="eh-conf-hash">{data.provenance.snapshotSha256}</code></p><p>Public release SHA-256: <code className="eh-conf-hash">{release.sha256}</code></p></details>
    <p>Send a source, timestamp or proposed correction through the <Link to="/contact#conference-corrections">conference corrections contact</Link>. Source access and versions can change after the recorded check date.</p>
  </article>
}

function AccessLog() {
  const data = useResearch()
  usePageTitle('Conference access log')
  const candidates = data.sessions.filter((s) => !s.originalCatalogue)
  return <article className="eh-col eh-conf-access">
    <p className="eh-kicker">Conference research</p><h1 className="eh-hed">What can be reviewed</h1>
    <p className="eh-dek">A dated record of accessible units, incomplete recordings and the sources still out of reach.</p>
    <p className="eh-conf-meta">Access checks: {formatDate(data.access.checkedOn)}.</p>
    <p>All 30 original leads were rechecked. Ten additional candidates are recorded below, separately from the original 89. A working player, public manifest or labelled recording is an access indication; it is not full playback verification or a substantive assessment.</p>
    <nav className="eh-conf-local-nav" aria-label="On this access page"><a href="#candidates">New candidates</a><a href="#bpea">BPEA boundaries</a><a href="#speeches">Published speeches</a><a href="#leads">All 30 leads</a></nav>
    <h2 id="candidates">Ten additional candidates</h2>
    <p>All remain unassessed. Exact event-day, language and completeness limits are retained on each record.</p>
    <ol className="eh-conf-access-list">{candidates.map((s)=><li key={s.id}><Link to={sessionPath(s.id)}>{s.title}</Link><p className="eh-conf-small">{s.id} · {formatDate(s.date)} · Not assessed</p><p>{s.access}</p></li>)}</ol>
    <h2 id="bpea">Three BPEA units, bounded</h2>
    <p>Introductions and closing discussion in the captions locate these units more accurately than the original video chapters. These are selected caption intervals, not independently measured playback durations.</p>
    {data.access.boundaries.map((b)=><section key={b.session_id} className="eh-conf-access-row"><h3><Link to={sessionPath(b.session_id)}>{b.session_id}</Link> · {formatDate(b.event_date)}</h3><p><a href={`${b.source_url}&t=${Math.floor(b.start_ms/1000)}`}>{clock(b.start_ms/1000)}–{clock(b.end_ms/1000)}</a></p><p>{b.boundary_basis}</p><p className="eh-conf-small">{b.runtime_status}</p></section>)}
    <h2 id="speeches">Five published-speech checks</h2>
    <p>Published remarks and verified delivery are different evidence. No full audiovisual alignment was performed. A scheduled appearance alone does not establish delivery.</p>
    {data.access.speechChecks.map((s)=><section key={s.session_id} className="eh-conf-access-row"><h3><Link to={sessionPath(s.session_id)}>{s.session_id}</Link> · {formatDate(s.event_date)}</h3><p>{s.delivery_check}</p><p><strong>Limit:</strong> {s.limitations}</p><p className="eh-conf-small"><a href={s.source_url}>Published text</a> · <a href={s.delivery_evidence_url}>Delivery-related source</a></p></section>)}
    <h2 id="leads">The 30 original leads</h2>
    <p>These are bounded investigations, not claims that an unavailable source exists nowhere. Account and payment restrictions were respected. T21 remains in the original catalogue and was not counted again as a new candidate.</p>
    {data.access.leads.map((l)=><section id={l.id} key={l.id} className="eh-conf-access-row"><h3>{l.id} · {l.title}</h3><p className="eh-conf-status">{l.status}</p><p>{l.findings}</p><p><strong>Remaining step:</strong> {l.nextAction}</p>{l.candidateIds.length>0&&<p>{l.candidateIds.map((id)=><Link key={id} to={sessionPath(id)}>Open candidate {id}</Link>)}</p>}<details><summary>Previous status and access sources</summary><p>{l.previousStatus}</p><ol>{l.sources.map((u,i)=><li key={u}><a href={u}>Access source {i+1} · {new URL(u).hostname}</a></li>)}</ol></details></section>)}
  </article>
}
