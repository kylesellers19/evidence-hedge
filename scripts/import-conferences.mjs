// Publish an allowlisted research release. Raw transcripts, downloaded papers,
// media, machine paths and the research workspace never enter the public data.
// Usage: node scripts/import-conferences.mjs /absolute/research-package [--check]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { clock } from '../src/conferences/model.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]
if (!source || source.startsWith('--')) throw new Error('Supply the research package directory.')
const inputHashes = {}
const sha = (s) => createHash('sha256').update(s).digest('hex')
function read(name, json = true) {
  const body = readFileSync(join(source, name), 'utf8')
  inputHashes[name] = sha(body)
  return json ? JSON.parse(body) : body
}
const ledger = read('Claim_Ledger.json')
const records = read('Evidence_Packet.json').evidence
const manifests = read('Source_Manifest.json')
const comparison = read('Review_Comparison.json')
const snapshot = read('snapshot/catalogue.json')
const original = read('snapshot/Conference_Proceedings_Research_and_Next_Steps_2026-11-21.md', false)
const leads = read('Access_Log.json')
const candidates = read('New_Access_Candidates.json')
const speech = read('Speech_Delivery_Checks.json')
const boundaries = read('access/BPEA_Boundaries.json')
const rubric = read('Rubric.json')
const validation = read('Validation.json')
assert(validation.all_checks_passed, 'Research integrity checks must pass before import.')
assert.equal(ledger.claims.length, 86)
assert.equal(snapshot.length, 89)
assert.equal(candidates.length, 10)
assert.equal(leads.length, 30)
const reviews = Object.fromEntries(comparison.claims.map((r) => [r.claim_id, r]))
const sources = Object.fromEntries(manifests.map((s) => [s.session_id, s]))

// Copy prose, never arbitrary nested objects. Paths are source-preparation
// details, not public evidence locators. Preserve public URLs and source hashes.
function prose(value) {
  if (value == null || typeof value === 'boolean') return ''
  if (/^https:\/\/\S+$/.test(String(value))) return url(value)
  let s = String(value)
    .replace(/(?:\/Users|\/home|\/tmp)\/[^\s;,]+/g, '[local source record]')
    .replace(/\/root\/[\w/-]+/g, 'separate AI reviewer')
    .replace(/\b(?:working|sources|sessions|reviews|pilot)\/[\w./#-]+/g, '[local source record]')
    .replace(/\b(in|of|vs|to|and|from|at|about)(?=\d)/g, '$1 ')
    .replace(/(?<=\d)(?=[a-zA-Z]{2,}\b)/g, ' ')
    .replace(/\b([a-zA-Z]{3,})(?=\d)/g, (all, word) => word === word.toUpperCase() ? word : `${word} `)
    .replace(/\s+/g, ' ').trim()
  return s
}
function url(value) {
  if (!value) return ''
  const u = new URL(value)
  assert.equal(u.protocol, 'https:', `Unsafe source URL: ${value}`)
  return u.href
}
const texts = (xs) => (Array.isArray(xs) ? xs.map(prose).filter(Boolean) : xs ? [prose(xs)] : [])
function unitBoundaries(value) {
  if (value && typeof value === 'object') return `${clock(value.start_seconds)}–${clock(value.end_seconds)}. ${prose(value.description)}`
  return prose(value)
}
const field = (md, name) => md.match(new RegExp(`\\*\\*${name}:\\*\\* (.*)`))?.[1]?.trim() || ''
const domains = {}
let domain = ''
for (const line of original.split('## Complete session catalogue').at(-1).split('\n')) {
  if (line.startsWith('### ')) domain = line.slice(4)
  if (/^#### [A-Z]+\d+$/.test(line)) domains[line.slice(5)] = domain
}
const sourceLinks = (md) => [...md.matchAll(/\[([^\]]+)\]\(<?(https:\/\/[^\s)>]+)>?\)/g)]
  .map((m) => ({ label: m[1], url: url(m[2]) }))
const dateParts = (md) => {
  const s = field(md, 'Date') || md.match(/\*\*Date:\*\* (.+?)\n/)?.[1] || ''
  const match = s.match(/^(.+?) \((.+?)\)/)
  return { date: match?.[1] || s.replace(/\.$/, ''), precision: match?.[2] || 'As sourced' }
}
function sourceLocator(loc) {
  if (typeof loc === 'string') return { text: prose(loc) }
  const keys = ['start_ms','end_ms','start_seconds','end_seconds','pdf_page','page','line_start','line_end','paragraph_index_on_page','basis','time_precision','transcript_page_or_paragraph']
  return Object.fromEntries(keys.filter((k) => loc?.[k] != null).map((k) => [k, typeof loc[k] === 'string' ? prose(loc[k]) : loc[k]]))
}
function claim(c) {
  const r = reviews[c.claim_id]
  assert.equal(r.final_provisional, c.verdict)
  const response = c.conversation_response_detail || c.conversation_response
  return {
    id: c.claim_id, sessionId: c.session_id, speaker: prose(c.speaker),
    statement: prose(c.analyst_paraphrase), excerpt: c.exact_excerpt,
    sourceUrl: url(c.source_url), recordingUrl: url(sources[c.session_id]?.recording_url), locator: sourceLocator(c.locator), sourceSpanHash: c.full_wording_sha256,
    type: c.claim_type, attribution: c.attribution_status,
    attributionLimit: prose(c.attribution_confidence || sources[c.session_id]?.attribution_limit),
    explicitOrInferred: prose(c.explicit_or_inferred), scope: prose(c.assessment_scope),
    context: prose(c.surrounding_context), response: texts(response),
    scopeNote: prose(c.additional_scope_note), verdict: c.verdict, rationale: prose(c.rationale),
    criteria: c.criteria_codes.map((code) => ({ code, reason: prose(c.criteria_rationale[code]) })),
    evidenceIds: [...new Set(c.evidence_ids)], unresolved: texts(c.unresolved_questions),
    assessedOn: c.assessment_date, stage: c.review_stage.startsWith('pilot') ? 'Pilot' : 'Expansion',
    review: { primary: r.primary_initial, second: r.second_ai_review, final: r.final_provisional,
      agreed: r.agreement_before_adjudication, reason: prose(r.decision_reason || c.adjudication_rationale || 'See the pilot review limitations. Both original codes are retained.'),
      uncertaintyRetained: Boolean(r.unresolved_disagreement) },
  }
}
const sessions = snapshot.map((s) => {
  const m = sources[s.session_id]
  const boundary = boundaries.find((b) => b.session_id === s.session_id)
  const delivery = speech.find((b) => b.session_id === s.session_id)
  const md = s.snapshot_markdown
  const dates = dateParts(md)
  const links = sourceLinks(field(md, 'Sources'))
  if (m?.source_url && !links.some((l) => l.url === m.source_url)) links.unshift({ label: 'Reviewed source', url: url(m.source_url) })
  if (m?.recording_url && !links.some((l) => l.url === m.recording_url)) links.push({ label: 'Recording', url: url(m.recording_url) })
  const claims = ledger.claims.filter((c) => c.session_id === s.session_id).map(claim)
  let speakers = field(md, 'Speakers').split(';').map((s) => s.trim()).filter(Boolean)
  for (const c of claims) if (!speakers.some((s) => s.startsWith(c.speaker))) speakers.push(c.speaker)
  // The reviewed roster resolves the incomplete discovery listing. Joe Allen
  // and Joseph (Joe) Allen are the same participant, not two speakers.
  if (s.session_id === 'T10') speakers = ['Gazmend Alushi (moderator)', 'Chris Peterson', 'Ameneh Atai', 'Jorge Ruiz']
  if (s.session_id === 'H01') speakers = ['Blythe Adamson (moderator)', 'Rachel Hodgdon', 'Joseph (Joe) Allen', 'Diana Araoz-Fraser']
  return {
    id: s.session_id, title: prose(m?.title || s.title), domain: domains[s.session_id],
    event: prose(field(md, 'Event').split('. **Date:')[0]),
    date: m?.event_date || dates.date, datePrecision: m?.date_precision || m?.event_date_precision || dates.precision,
    speakers, sources: links, originalCatalogue: true, firstPass: s.first_pass,
    reviewed: Boolean(m), access: prose(m?.access_status || m?.access || boundary?.updated_access || delivery?.updated_access || s.access),
    discovery: { recordedOn: '2026-11-21', access: s.access, date: dates.date, datePrecision: dates.precision,
      question: prose(field(md, 'Proposed question')), evidenceToSeek: prose(field(md, 'Evidence to seek')),
      accessEvidence: prose(field(md, 'Access evidence')), caveats: prose(field(md, 'Caveats')) },
    unit: m ? { boundaries: unitBoundaries(m.complete_unit_boundaries || m.boundaries), provenance: prose(m.transcript_provenance),
      coverage: typeof m.context_read === 'string' ? prose(m.context_read) : 'Full available source text read before selecting claims; audiovisual fidelity remains unverified.',
      secondCoverage: prose(m.second_review_context), checkedOn: m.access_check_date,
      attributionLimit: prose(m.attribution_limit || (typeof m.audiovisual_verification === 'string' ? m.audiovisual_verification : 'Speaker attribution and exact wording have not been verified by listening.')) }
      : boundary ? { boundaries:`Caption interval ${clock(boundary.start_ms / 1000)}–${clock(boundary.end_ms / 1000)} in the day recording.`,provenance:prose(boundary.boundary_basis),coverage:prose(boundary.runtime_status),checkedOn:boundary.access_check_date }
      : delivery ? {boundaries:prose(delivery.delivery_check),provenance:prose(delivery.limitations),coverage:'Delivery-related evidence checked; no substantive claim assessment.',checkedOn:delivery.access_check_date} : null,
    claims,
  }
})
const candidateDomains = {L02:'Architecture and housing',L06:'Architecture and housing',L08:'AI, technology and work',L15:'Health and wellbeing',L17:'Health and wellbeing',L20:'Health and wellbeing',L21:'Health and wellbeing',L25:'Economy, finance and development',L28:'Climate and energy',L30:'Climate and energy'}
for (const c of candidates) sessions.push({
  id:c.session_id, title:prose(c.title),domain:candidateDomains[c.parent_lead_id], event: leads.find((l) => l.lead_id === c.parent_lead_id)?.title || '',
  date:c.event_date,datePrecision:prose(c.date_precision),speakers:[],originalCatalogue:false,firstPass:false,reviewed:false,parentLeadId:c.parent_lead_id,
  access:prose(c.access_verified),sources:[['Source',c.source_url],['Recording',c.recording_url],['Event',c.event_url]].filter(([,v])=>v).map(([label,value])=>({label,url:url(value)})),
  unit:{boundaries:prose(c.unit_locator),provenance:prose(c.limitations),coverage:'Access investigation only. No claim assessment has been made.',checkedOn:c.access_check_date},
  discovery:{question:'Full source preparation and claim selection are still needed.',evidenceToSeek:'Read the complete available unit, retain qualifications and trace selected assertions to underlying evidence.',caveats:prose(c.limitations)},claims:[],
})
const evidence = records.map((e) => ({
  id:e.evidence_id,title:prose(e.title),url:url(e.source_url),date:prose(e.source_date),availableAtEvent:e.available_at_event_date,
  locator:prose(e.relevant_passage_or_table),design:prose(e.study_design),population:prose(e.population),
  exposure:prose(e.intervention_or_exposure),comparator:prose(e.comparator),outcome:prose(e.outcome),timeframe:prose(e.timeframe),
  uncertainty:prose(e.uncertainty_and_assumptions),relation:prose(e.relation_to_claim),summary:prose(e.summary),
}))
const counts = { originalCatalogue:89, main:81, supplements:8, accessLeads:30, newCandidates:10,
  reviewedSessions:manifests.length, firstPass:15, claims:ledger.claims.length, evidence:records.length,
  verdicts:Object.fromEntries(rubric.verdict_definitions.map((v)=>[v.verdict,ledger.claims.filter((c)=>c.verdict===v.verdict).length])) }

// Access records have varied working schemas. This limited copy retains public
// facts and URLs without copying raw fetch metadata or local source filenames.
function publicRecord(obj) {
  const banned = /(?:file|path|sha|local|raw|metadata|html|json)/i
  return Object.fromEntries(Object.entries(obj).filter(([k])=>!banned.test(k)).map(([k,v])=>[k,
    Array.isArray(v) ? v.map((x)=> typeof x==='object' ? publicRecord(x) : prose(x)) : v && typeof v==='object' ? publicRecord(v) : typeof v==='string' ? prose(v) : v
  ]))
}
const data = {
  schemaVersion:1, release:ledger.assessment_date, rubricVersion:rubric.version,
  eventWindow:['2024-11-21','2026-11-21'], counts,
  review:{pilot:{claims:20,agreement:18},expansion:{claims:66,agreement:52},
    selection:'Purposive selection after reading the full available text unit. The claim set includes supported, uncertain and non-empirical assertions. It is not an exhaustive or representative sample.',
    limits:'Provisional AI-assisted research. No human review or full audiovisual verification. Verdicts apply to selected assertions within their stated scope, not to speakers, institutions or entire sessions.',
    blinding:'Expanded second reviewers received fixed extraction packets and froze their codes before reading primary verdicts. Some source preparation was shared. The pilot primary pass was partly unblinded. These are descriptive agreement counts, not a measure of human reliability.',
    sourceHandling:'Only short source excerpts, analytical summaries, links, locators and selected-span hashes are published. Full third-party transcripts, papers, media and local research records are not included.'},
  criteria:rubric.criteria.map((c)=>({code:c.code,name:c.criterion,test:c.test,evidenceToSeek:c.evidence_to_seek})),
  verdicts:rubric.verdict_definitions.map((v)=>({label:v.verdict,definition:v.definition})),
  sessions,evidence,
  access:{checkedOn:'2026-11-22',leads:leads.map((l)=>({id:l.lead_id,title:prose(l.title),previousStatus:prose(l.previous_status),status:prose(l.current_status),findings:prose(l.findings),nextAction:prose(l.next_action),sources:l.evidence_urls.map(url),candidateIds:candidates.filter((c)=>c.parent_lead_id===l.lead_id).map((c)=>c.session_id)})),
    speechChecks:speech.map(publicRecord),boundaries:boundaries.map(publicRecord)},
  provenance:{snapshotDate:'2026-11-21',snapshotSha256:sha(original),inputHashes,
    notes:'The original discovery counts and identifiers are retained. Updated review records take precedence over dated discovery caveats. The referenced companion spreadsheet and CSV were not reconstructed.'},
}
assert.equal(sessions.filter((s)=>s.reviewed).length,17)
assert.equal(sessions.filter((s)=>s.originalCatalogue).length,89)
assert(sessions.every((s)=>s.domain && s.date && s.sources.length && /^[A-Z0-9-]+$/.test(s.id)))
const body=JSON.stringify(data,null,2)+'\n'
function checkPublic(value, key = 'release') {
  if (typeof value === 'string' && /^https:\/\/\S+$/.test(value)) { url(value); return }
  if (typeof value === 'string') assert(!/\/Users\/|\/home\/|file:\/\/|plugin:\/\/|\/root\//.test(value), `Private workspace reference at ${key}`)
  else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) checkPublic(v, `${key}.${k}`)
}
checkPublic(data)
const output=`conferences/review-${data.release}.json`
const release=JSON.stringify({path:output,date:data.release,sha256:sha(body)},null,2)+'\n'
for (const [file,content] of [[join(root,'public',output),body],[join(root,'src/conferences/release.json'),release]]) {
  if(process.argv.includes('--check')) assert.equal(readFileSync(file,'utf8'),content,`Import drift: ${file}`)
  else {mkdirSync(dirname(file),{recursive:true});writeFileSync(file,content)}
}
console.log(`${process.argv.includes('--check')?'Verified':'Imported'} ${sessions.length} sessions (${counts.reviewedSessions} reviewed), ${counts.claims} claims and ${evidence.length} evidence records.`)
