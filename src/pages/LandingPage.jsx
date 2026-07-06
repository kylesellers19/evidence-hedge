import { useState } from "react";
import ParticleMark from "../components/ParticleMark.jsx";
import "../styles/landing.css";

/**
 * LandingPage — the app's front door. "A single question in a white room."
 *
 * First paint shows only: the name as a whisper, the animated mark, one italic
 * serif question, and a near-invisible input panel. One decision on screen:
 * give the tool a document, by text or by link. On submit, the parent runs
 * autodetect and pushes to the rubric branch screen.
 *
 * Props:
 *   onAnalyze(text, meta)  — meta: { sourceUrl?: string }
 *
 * Link mode fetches client-side and degrades gracefully: most sites block
 * cross-origin reads (CORS), in which case we say so plainly and switch the
 * person into paste mode. The deferred-backend decision stands.
 */

export default function LandingPage({ onAnalyze }) {
  const [mode, setMode] = useState("text"); // "text" | "link"
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const canSubmit = mode === "text" ? text.trim().length > 0 : url.trim().length > 0;

  async function handleSubmit() {
    setNotice(null);
    if (mode === "text") {
      onAnalyze(text.trim(), {});
      return;
    }
    // link mode — attempt a client-side read
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setBusy(true);
    try {
      const res = await fetch(target);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("script, style, nav, footer, noscript").forEach((n) => n.remove());
      const extracted = (doc.body?.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
      if (extracted.length < 200) throw new Error("too little readable text");
      onAnalyze(extracted, { sourceUrl: target });
    } catch {
      setMode("text");
      setNotice(
        "That address can't be read from the browser — most sites block cross-origin requests. Paste the document text instead; the switch above is already set."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="eh-landing">
      <div className="eh-landing-inner">
        {/* The name is a whisper; the mark is the identity. */}
        <p className="eh-microlabel">Evidence Hedge</p>

        <ParticleMark size={300} />

        {/* The only prominent text on the page. */}
        <h1 className="eh-question">Does the evidence carry the claim?</h1>

        <div className="eh-input-panel">
          <div className="eh-toggle" role="tablist" aria-label="Input method">
            <button
              role="tab"
              aria-selected={mode === "text"}
              className={mode === "text" ? "is-active" : ""}
              onClick={() => { setMode("text"); setNotice(null); }}
            >
              Paste text
            </button>
            <button
              role="tab"
              aria-selected={mode === "link"}
              className={mode === "link" ? "is-active" : ""}
              onClick={() => { setMode("link"); setNotice(null); }}
            >
              Paste link
            </button>
          </div>

          {notice && <p className="eh-notice">{notice}</p>}

          {mode === "text" ? (
            <textarea
              className="eh-textarea"
              placeholder="Paste the document text — a report, a whitepaper, a press release."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              spellCheck={false}
            />
          ) : (
            <input
              className="eh-urlinput"
              type="url"
              placeholder="https://vendor.example/whitepaper"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
              spellCheck={false}
            />
          )}

          <div className="eh-submit-row">
            <button
              className="eh-submit"
              disabled={!canSubmit || busy}
              onClick={handleSubmit}
            >
              {busy ? "Reading the page…" : "Weigh the evidence"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
