import React from 'react'

// Document profile — who is speaking, what study stands behind the text, and
// what that design can license. Rendered above Document signals, in the same
// register: hairline rules, square corners, no fills; data in mono.

const PROVENANCE_LABELS = {
  'peer-reviewed-journal': 'Peer-reviewed journal',
  'academic-press-office': 'Academic press office',
  government: 'Government',
  'nonprofit-research': 'Nonprofit research',
  'firm-vendor': 'Firm or vendor',
  'news-outlet': 'News outlet',
  'trade-press': 'Trade press',
  individual: 'Individual',
  unknown: 'Unknown',
}
const REGISTER_LABELS = {
  none: 'no causal',
  correlational: 'associational',
  'conditional-causal': 'hedged causal',
  'direct-causal': 'direct causal',
}
const humanize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')

function Row({ term, value, spans = [] }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-x-4 py-3 border-t border-border">
      <dt className="font-sans text-[11px] tracking-wide uppercase text-gray-400 pt-0.5">{term}</dt>
      <dd>
        <p className="text-sm text-gray-900 leading-relaxed">{value}</p>
        {spans.length > 0 && (
          <ul className="mt-1 space-y-1">
            {spans.map((s, i) => (
              <li key={i} className="font-mono text-[11px] text-gray-500 leading-relaxed break-words">“{s}”</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  )
}

export default function DocumentProfile({ profile, referenceCount = 0 }) {
  if (!profile) return null
  const { provenance, design } = profile
  const ceiling = design.ceiling
  const self = provenance.selfCitation
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-4">
        <h2 className="label-tag">Document profile</h2>
        <span className="label-tag text-gray-400">same under every rubric</span>
      </div>
      <dl className="border-b border-border">
        <Row
          term="Provenance"
          value={PROVENANCE_LABELS[provenance.kind] || humanize(provenance.kind)}
          spans={provenance.evidence.slice(0, 2).map((e) => e.span)}
        />
        <Row
          term="Study design"
          value={`${humanize(design.design)}${design.inherited ? ' — inherited from the study it describes' : ''}`}
          spans={design.evidence.slice(0, 1).map((e) => e.span)}
        />
        <Row
          term="Design ceiling"
          value={`Licenses up to ${REGISTER_LABELS[ceiling.maxRegister]} language and ${ceiling.maxRecommendation} advice.`}
        />
        {design.selfDisclaimsCausality && (
          <Row term="Causality" value="Disclaimed by the document itself — recorded, carries no weight." spans={design.disclaimerEvidence.slice(0, 1)} />
        )}
        {self.pool > 0 && (
          <Row
            term="Self-citation"
            value={<><span className="tabular-nums">{Math.round(self.share * 100)}%</span> of references and links name the publisher ({self.matched} of {self.pool}).</>}
          />
        )}
        {referenceCount > 0 && (
          <Row term="References" value={<><span className="tabular-nums">{referenceCount}</span> reference entries set aside — not scored as claims.</>} />
        )}
      </dl>
    </section>
  )
}
