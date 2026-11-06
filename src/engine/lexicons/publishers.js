// ─────────────────────────────────────────────────────────────────────────────
// Publisher hosts → provenance kind. A link's host is the strongest single
// signal of who is speaking; pasted text falls back to text cues
// (profile/provenance.js). Hosts match on the registrable suffix
// ("www.bdcnetwork.com" → "bdcnetwork.com"). PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

export const PUBLISHER_HOSTS = {
  // journals and journal hosts (the document's own venue block still decides)
  'ncbi.nlm.nih.gov': 'peer-reviewed-journal', 'sciencedirect.com': 'peer-reviewed-journal',
  'springer.com': 'peer-reviewed-journal', 'link.springer.com': 'peer-reviewed-journal',
  'nature.com': 'peer-reviewed-journal', 'wiley.com': 'peer-reviewed-journal',
  'onlinelibrary.wiley.com': 'peer-reviewed-journal', 'plos.org': 'peer-reviewed-journal',
  'journals.plos.org': 'peer-reviewed-journal', 'frontiersin.org': 'peer-reviewed-journal',
  'mdpi.com': 'peer-reviewed-journal', 'tandfonline.com': 'peer-reviewed-journal',
  'sagepub.com': 'peer-reviewed-journal', 'journals.sagepub.com': 'peer-reviewed-journal',
  'bmj.com': 'peer-reviewed-journal', 'jamanetwork.com': 'peer-reviewed-journal',
  'thelancet.com': 'peer-reviewed-journal', 'academic.oup.com': 'peer-reviewed-journal',
  'ehp.niehs.nih.gov': 'peer-reviewed-journal', 'cell.com': 'peer-reviewed-journal',
  'science.org': 'peer-reviewed-journal', 'pnas.org': 'peer-reviewed-journal',
  // academic press offices and the services that republish their releases
  'sciencedaily.com': 'academic-press-office', 'eurekalert.org': 'academic-press-office',
  'phys.org': 'academic-press-office', 'medicalxpress.com': 'academic-press-office',
  'news.harvard.edu': 'academic-press-office', 'hsph.harvard.edu': 'academic-press-office',
  // nonprofit research
  'pewresearch.org': 'nonprofit-research', 'brookings.edu': 'nonprofit-research', 'rand.org': 'nonprofit-research',
  'urban.org': 'nonprofit-research', 'milkeninstitute.org': 'nonprofit-research', 'wri.org': 'nonprofit-research',
  'kff.org': 'nonprofit-research', 'nber.org': 'nonprofit-research',
  // news outlets
  'sciencealert.com': 'news-outlet', 'nytimes.com': 'news-outlet', 'washingtonpost.com': 'news-outlet',
  'theguardian.com': 'news-outlet', 'bbc.co.uk': 'news-outlet', 'bbc.com': 'news-outlet', 'reuters.com': 'news-outlet',
  'apnews.com': 'news-outlet', 'npr.org': 'news-outlet', 'cnn.com': 'news-outlet', 'wsj.com': 'news-outlet',
  'bloomberg.com': 'news-outlet', 'theatlantic.com': 'news-outlet', 'vox.com': 'news-outlet', 'axios.com': 'news-outlet',
  'newscientist.com': 'news-outlet', 'scientificamerican.com': 'news-outlet', 'livescience.com': 'news-outlet',
  // trade press
  'bdcnetwork.com': 'trade-press', 'greenbuildingadvisor.com': 'trade-press', 'archdaily.com': 'trade-press',
  'dezeen.com': 'trade-press', 'archpaper.com': 'trade-press', 'metropolismag.com': 'trade-press',
  'buildings.com': 'trade-press', 'facilitiesnet.com': 'trade-press', 'architectmagazine.com': 'trade-press',
  'workdesign.com': 'trade-press', 'interiordesign.net': 'trade-press', 'enr.com': 'trade-press',
  // firms and vendors
  'gensler.com': 'firm-vendor', 'hksinc.com': 'firm-vendor', 'naava.io': 'firm-vendor', 'co2meter.com': 'firm-vendor',
  'perkinswill.com': 'firm-vendor', 'steelcase.com': 'firm-vendor', 'hermanmiller.com': 'firm-vendor',
  'millerknoll.com': 'firm-vendor', 'arup.com': 'firm-vendor', 'jll.com': 'firm-vendor', 'cbre.com': 'firm-vendor',
  // individual platforms
  'medium.com': 'individual', 'substack.com': 'individual', 'wordpress.com': 'individual', 'blogspot.com': 'individual',
}

// Host-suffix fallbacks, checked when no host above matches.
export const HOST_SUFFIX_KINDS = [
  [/\.gov(?:\.[a-z]{2})?$|\.gc\.ca$|\.gov\.uk$|\.europa\.eu$/, 'government'],
  [/\.(?:com|io|co|ai|biz|shop|store)$/, 'firm-vendor'],
]

// A path segment that marks a genre within any publisher.
export const PATH_GENRES = [
  [/\/(?:press-releases?|news-releases?|pressroom|newsroom)\//i, 'press-release'],
  [/\/(?:blogs?|opinion|op-ed|commentary|columns?)\//i, 'opinion'],
]
