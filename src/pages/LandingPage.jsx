import { useRef, useState } from "react";
import ParticleMark from "../components/ParticleMark.jsx";
import { extractFileDocument, ACCEPT_ATTR } from "../ingest/extractFile.js";
import { ExtractionError } from "../ingest/errors.js";
import { normalizeText } from "../ingest/normalizer.js";
import { fetchLink, looksLikeUrl } from "../ingest/fetchLink.js";
import { failureCopy } from "../ingest/failureCopy.js";
import { validateText } from "../ingest/validateText.js";
import "../styles/landing.css";

/**
 * LandingPage — the app's front door. "A single question in a white room."
 *
 * First paint shows only: the animated mark, the italic serif headline, its
 * dek and a quiet input panel, under the site masthead. One decision on
 * screen: give the tool a document. The panel takes it any of three ways with
 * no mode to pick: paste text into the box, paste a link into the same box, or
 * drop a file anywhere on the page (or click "Upload a file"). On submit, the
 * parent runs autodetect and pushes to the rubric branch screen.
 *
 * Props:
 *   onAnalyze(text, meta)  — meta: { sourceUrl?: string }
 *
 * A box holding only a URL is fetched by ingest/fetchLink.js: a PDF/DOCX/TXT/MD
 * the host lets the browser download runs through the upload extractors;
 * everything else is read through the Jina Reader service (r.jina.ai). On any
 * failure the person sees one actionable sentence for that reason
 * (ingest/failureCopy.js) — a designed fallback state, not an error toast.
 */

const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");

export default function LandingPage({ onAnalyze }) {
  const fileRef = useRef(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [filename, setFilename] = useState(null);
  const [dragging, setDragging] = useState(false);

  const working = busy || extracting;
  const canSubmit = text.trim().length > 0;

  async function handleSubmit() {
    setNotice(null);
    const raw = text.trim();
    if (!raw) return;

    // A box holding only a URL is fetched; anything else is the document.
    if (!looksLikeUrl(raw)) {
      // Pasted text runs through the SAME normalizer as extracted files.
      const pasted = normalizeText(raw);
      const check = validateText(pasted, { path: "paste" });
      if (!check.ok) { setNotice(failureCopy(check)); return; }
      onAnalyze(pasted, {});
      return;
    }

    setBusy(true);
    const result = await fetchLink(raw);
    setBusy(false);

    if (result.ok) {
      // fetchLink has already run the text through the shared normalizer.
      onAnalyze(result.text, { sourceUrl: result.sourceUrl, ...(result.pages ? { pages: result.pages } : {}) });
      return;
    }

    // Designed fallback: route the person to paste the article text.
    setNotice(failureCopy(result));
  }

  // File upload → extract → normalize → hand to the pipeline as if pasted.
  async function handleFile(file) {
    if (!file || working) return;
    setNotice(null);
    setFilename(file.name);
    setExtracting(true);
    try {
      // A PDF's per-page text rides along in meta, for which page a claim is on.
      const { text: extracted, pages } = await extractFileDocument(file);
      if (!extracted.trim()) throw new ExtractionError("empty");
      onAnalyze(extracted, { source: "file", filename: file.name, ...(pages ? { pages } : {}) });
    } catch (err) {
      const kind = err instanceof ExtractionError ? err.kind : "corrupt";
      setExtracting(false);
      setNotice(failureCopy({ reason: "extract", kind }));
    }
  }

  // The whole page takes a dropped file, so a near miss doesn't open it in
  // the browser. Text dragged into the box keeps the browser's own behaviour.
  const dropProps = {
    onDragOver: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (!working) setDragging(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
  };

  // A file copied in the Finder and pasted into the box reads as an upload.
  function handlePaste(e) {
    const file = e.clipboardData?.files?.[0];
    if (file && !e.clipboardData.getData("text/plain")) {
      e.preventDefault();
      handleFile(file);
    }
  }

  return (
    <main className="eh-landing" {...dropProps}>
      <div className="eh-landing-inner">
        {/* The masthead carries the name; the mark is the identity. */}
        <ParticleMark size={300} />

        {/* The only prominent text on the page. */}
        <h1 className="eh-landing-hed">The evidence–assertion gap is where we hedge.</h1>
        <p className="eh-landing-dek">
          Find out where research falls short—across academic publications, conference proceedings,
          press releases, and corporate reports. Where evidence is selectively presented, claims
          overstate findings, and conclusions aren’t justified by the underlying data.
        </p>

        <div className={"eh-input-panel" + (dragging ? " is-dragging" : "")}>
          {notice && <p className="eh-notice">{notice}</p>}

          <textarea
            className="eh-textarea"
            aria-label="Paste the text of a document or a link to it"
            placeholder="Paste text or a link, or drop a PDF, DOCX, TXT or MD file here."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            rows={7}
            spellCheck={false}
          />

          {/* Loading state — a plain mono line, no colored spinner. */}
          {working && (
            <p className="eh-status" aria-live="polite">
              {extracting ? (
                <>
                  <span style={{ color: "var(--eh-ink)" }}>{filename}</span> — reading…
                </>
              ) : (
                "fetching…"
              )}
            </p>
          )}

          <div className="eh-submit-row">
            <button className="eh-upload" disabled={working} onClick={() => fileRef.current?.click()}>
              Upload a file
            </button>
            <button className="eh-submit" disabled={!canSubmit || working} onClick={handleSubmit}>
              {busy ? "Fetching…" : extracting ? "Reading…" : "Weigh the evidence"}
            </button>
          </div>

          {/* Disclosure: URL fetches route through a third-party reader. */}
          <p className="eh-disclosure">
            Links are read through r.jina.ai, a third-party reader service, unless they point to a PDF
            or DOCX the site lets your browser download directly.
          </p>

          {dragging && (
            <div className="eh-drop-cue" aria-hidden="true">
              Drop the file to read it.
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
    </main>
  );
}
