# Conference research on Evidence Hedge

The `/conferences` section publishes the dated conference research as a separate research collection. It does not feed verdicts into the document engine, assign a session score or add rows to The List. The original event window is Nov. 21, 2024–Nov. 21, 2026.

## Routes and behavior

- `/conferences`: 17 reviewed sessions and their 86 selected claims; search, subject, claim verdict, date/title sorting and session/claim views.
- `/conferences/catalogue`: all 89 original entries, including the 72 without assessments. Review status is a workflow label, not a verdict.
- `/conferences/<ID>`: stable session record; `#<claim-ID>` links directly to a claim, including after the asynchronous data load. Unassessed records show prospective questions and access limits.
- `/conferences/access`: 30 dated lead checks, ten separate new candidates, three BPEA boundaries and five speech-delivery checks.
- `/conferences/method`: six verdict definitions, C1–C10 criteria, reviewer limitations, agreement counts and a JSON download.

Filters live in query parameters and work entirely in the browser. The conference reader and CSS load in a separate route chunk; the research JSON loads only when this section is opened. Loading failures offer a retry. All 99 session records and four conference entry pages receive static route shells in the Vite build, so direct GitHub Pages requests return the app with HTTP 200. Unknown session IDs have a useful not-found page. No new server, external embed, tracking or database write is introduced.

## Research scope and provenance

The public release preserves 89 original entries (81 main plus eight supplements), 15 first-pass flags, 17 reviewed sessions, 86 claims, 178 evidence records and ten separately identified new access candidates. Verdicts and scope come from the adjudicated ledger. Both initial review codes are retained. The pilot had 18/20 matching initial codes and partial primary unblinding; the expansion had 52/66 matching codes on fixed extracted units. These counts are not a reliability estimate or prevalence sample.

All assessments remain provisional AI-assisted research without human or full audiovisual verification. The reader separates short source excerpts, analyst paraphrases, assessed scope, later qualifications, evidence chronology and unresolved questions. Source dates and availability can be unknown. Published speech text is not silently represented as verified delivery. EC04 retains separate podcast and full-recording clocks. No misleading whole-session score is derived from claim counts.

The import also carries the researched T10 four-person roster and normalizes the two names used for Joe Allen in H01. Original discovery caveats are visibly dated; subsequent source boundaries and access checks take precedence. Speaker attribution limitations remain visible per claim and session.

## Public data import

The source research package is local and intentionally not committed. To regenerate this release from that package:

```sh
node scripts/import-conferences.mjs /absolute/path/to/research-package
node scripts/import-conferences.mjs /absolute/path/to/research-package --check
npm run check:conferences
```

The importer requires passing research-integrity results and checks the expected selection counts. It selects explicit public fields from the final ledger, evidence packet, source manifest, original catalogue and access records. It records input-file hashes and the original Markdown snapshot hash; it does not copy arbitrary workspace objects. Public output is `public/conferences/review-2026-11-22.json`. `src/conferences/release.json` records its path, date and byte fingerprint.

Excluded from the public repository and download: full transcripts, PDFs, media, local ASR output, full selected source spans, local paths, tool metadata and the private portable research ZIP. Public source URLs, locators, short anchors and source-span fingerprints remain available. Text is rendered through React, never injected as HTML. Source URLs are restricted to HTTPS at import.

Prose cleanup normalizes whitespace and some joined numeral/word fragments without changing verdicts or numerical values. Object-form unit boundaries are formatted explicitly. The JSON retains source-version uncertainty and both primary and secondary evidence records, including duplicate URLs with different passages or interpretations.

## Maintaining it

Keep a dated release and retain initial coding when correcting a judgment. Update the final scope, rationale and evidence together; a change in verdict without its boundary can misrepresent the source. New releases must update the importer’s expected counts and regression fixtures deliberately. Do not promote discovery questions into findings or treat access metadata as completed review.

`checks/conferences.test.mjs` checks the release fingerprint, IDs, original/new populations, claim/evidence links, criterion reasons, chronology, adjudicated cases, quote limits, source clocks, safe public fields, query-state behavior and filtering. It runs in `npm run check` and in the deployment workflow. The ordinary engine suite remains the regression check for the existing analyzer. Run `npm run build` to validate the route shells and lazy bundle.

The footer, main Method page, Terms and privacy page and Contact page explain the separate review method and correction path. The site still serves the conference data as static files from GitHub Pages. Publishing follows the existing `main` deployment workflow.
