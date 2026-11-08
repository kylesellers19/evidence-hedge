# Third-party notices

Code and data from other projects that ship in the Evidence Hedge bundle, with
their licenses. Only MIT, BSD or Apache material may enter the bundle. The npm
packages the app depends on (React, pdf.js, mammoth, the Fontsource fonts) are
distributed under their own licenses, recorded in their packages; this file
lists material copied into the source tree.

A copy is served with the site (`public/THIRD_PARTY_NOTICES.md`); a check keeps
the two identical.

---

## UnScientify — Scientific Uncertainty Extractor

- **Used for:** the authorial-reference word lists behind attribution
  (`src/engine/lexicons/unscientify_lexicon.json`, read by
  `src/engine/attribution.js`). Only the literal word lists of its spaCy
  reference and citation patterns are copied; the patterns and code are not.
- **Source:** https://github.com/Project-InSciM/Scientific-Uncertainty-Extractor,
  commit `24f12a6500e61d7e8d277aa323bb56acbd8f1d15`,
  `UnScientify-ver0125/dist/su_extractor-0.0.1.tar.gz`:
  `patterns/reference/reference.json`, `patterns/citations/citations.json`.
- **Authors:** Iana Atanassova, Panggih Kusuma Ningrum, Nicolas Gutehrlé
  (Université de Franche-Comté), Project InSciM.
- **Citation:** Ningrum, P. K., Mayr, P. & Atanassova, I. (2023). UnScientify:
  Detecting Scientific Uncertainty in Scholarly Full Text. arXiv:2307.14236.
- **License:** BSD 3-Clause, as stated in the project README ("This tool is
  under BSD 3-Clause Licence"). The repository's and the package's LICENSE
  files are empty, so the license text below is the standard BSD 3-Clause text
  with the authors named in the package metadata.

```
Copyright (c) Iana Atanassova, Panggih Kusuma Ningrum, Nicolas Gutehrlé.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
