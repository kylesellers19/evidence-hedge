# Fix H: an upload's own address from a firm's closing line

Engine 7159024 against 3359293 (engine identical to 5b40af6). Predictions committed first in `checks/aec-visit-address-predictions.json` (4bc0e6e); **18 of 18 hit**. Every value PROVISIONAL — not ratified.

## What was wrong

Weighing the 267 reports added on Nov. 10, 2026 showed that uploaded Burns & McDonnell white papers lose their publisher. 150 of 159 read as provenance *unknown* and are judged General web or Research. Their links read as the firm's own (Corporate). The same papers scored 0.41 higher on average when uploaded than when linked.

With no link, the engine reads a document's own web address only when the address matches the copyright holder or a contact email. These papers carry neither. Instead, their last paragraph, under an "About Burns & McDonnell" heading, ends "For more information, visit burnsmcd.com."

## The fix

`ownHost` gains a third source, read after the copyright holder and the contact email. It looks for a closing line that sends readers to a site, but only in the text's last 3,000 characters. It keeps that line only when its paragraph, or the one before, describes the publisher:
- an "About …" heading
- "… is a … firm / company / organization …"
- "founded in", "employee-owned", "headquartered", "with N employees"

Measured on all 1,851 reports before the change:
- **Kept by the guard:** 155 lines, 154 of them the publisher's own family of sites (including Burns's 1898 & Co. and Ref-Chem). The one miss is corenetglobal.org in a Ware Malcomb paper.
- **Dropped by the guard:** 17 lines that named the firm's own site (Jacobs, Autodesk, Weitz, NV5, AECOM, Dodge, Gensler, Sasaki), plus 14 that pointed to partners or agencies, such as usgs.gov.

## Results

| | Original 1,552, before | After | New 262, before | After |
|---|---|---|---|---|
| Upload provenance unknown | 412 | 407 | 170 | 33 |
| Upload provenance differs from link | 477 | 472 | 169 | 30 |
| Upload judgment differs from link | 465 | 460 | 169 | 30 |
| Upload score differs from link | 328 | 323 | 131 | 24 |
| Median score, upload | 2.1 | 2.1 | 2.2 | 1.9 |
| Mean upload minus link | 0.11 | 0.11 | 0.27 | 0.04 |

- **Burns & McDonnell (159):** unknown on upload 150 → 13. Median upload score 2.2 → 1.8, now equal to its link median. Mean upload minus link 0.41 → 0.03.
- **Link readings:** identical on every report, since the rule never runs with a link.
- **Runs:** every reading repeated exactly (1,552 and 262).
- **Original corpus:** five upload scores moved, each now equal to its link score:
  - Procore How We Build Now 2023, North America: 3.0 → 2.1
  - Procore How We Build Now 2023, Canada: 2.8 → 1.8
  - Levelset 2021 Cash Flow & Payment Report: 2.9 → 1.8
  - Burns & McDonnell From Investment to Impact: 2.2 → 1.8
  - Burns & McDonnell Key Components (white paper): 1.1 → 1.5
- **Checks:** `npm run check` passes with no target re-recorded, and `npm run build` passes.

## Left open

- 13 Burns & McDonnell papers still read as unknown when uploaded: they have no closing line.
- The 17 own-site lines the guard drops (Jacobs, Autodesk and others) sit in paragraphs that don't describe the publisher.
- The corenetglobal.org miss in a Ware Malcomb paper.
- The List's audit entries come from upload readings. After merge, `scripts/list-load.mjs` would refresh the five moved scores.

Results (gitignored): `checks/data/aec-base/results-{3359293,7159024}`, `checks/data/aec-new/results-{3359293,7159024}`.
