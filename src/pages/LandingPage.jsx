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
 * A pasted link (in Paste link mode, or a bare URL pasted into the text box) is
 * fetched through the Jina Reader service (r.jina.ac), which returns readable
 * article text. On any failure the person is asked to paste the article text —
 * a designed fallback state, not an error toast.
 */

const FETCH_TIMEOUT_MS = 15000;

// A value is a URL if it has no internal whitespace and either starts with
// http(s):// or reads as a bare domain (example.com, sub.example.co.uk/path).
function looksLikeUrl(value) {
  const s = value.trim();
  if (!s || /\s/.test(s)) return false;
  if (/^https?:\/\/\S+\.\S+/i.test(s)) return true;
  return /^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s);
}

function normalizeUrl(value) {
  const s = value.trim();
  return /^https?:\/\//i.test(s) ? s : "https://" + s;
}

// Fetch article text through Jina Reader. Returns { ok, text, sourceUrl } or
// { ok:false, reason } for the three designed failure states.
async function fetchViaJina(rawUrl) {
  const target = normalizeUrl(rawUrl);
  const endpoint = "https://r.jina.ac/" + encodeURIComponent(target);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return { ok: false, reason: `status ${res.status}` };
    const body = (await res.text()).trim();
    if (!body) return { ok: false, reason: "empty" };
    return { ok: true, text: body, sourceUrl: target };
  } catch (e) {
    return { ok: false, reason: e && e.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export default function LandingPage({ onAnalyze }) {
  const [mode, setMode] = useState("text"); // "text" | "link"
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const canSubmit = mode === "text" ? text.trim().length > 0 : url.trim().length > 0;

  async function handleSubmit() {
    setNotice(null);
    const raw = (mode === "text" ? text : url).trim();
    if (!raw) return;

    // Link mode always fetches; text mode fetches only if the value is a lone URL.
    const isUrl = mode === "link" || looksLikeUrl(raw);
    if (!isUrl) {
      onAnalyze(raw, {});
      return;
    }

    setBusy(true);
    const result = await fetchViaJina(raw);
    setBusy(false);

    if (result.ok) {
      onAnalyze(result.text, { sourceUrl: result.sourceUrl });
      return;
    }

    // Designed fallback: route the person to paste the article text.
    setMode("text");
    setNotice(
      result.reason === "timeout"
        ? "The reader timed out on that link. Paste the article text here instead."
        : "Couldn't pull readable text from that link. Paste the article text here instead."
    );
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

          {/* Loading state — a plain mono line, no colored spinner. */}
          {busy && (
            <p
              style={{
                fontFamily: "var(--eh-mono)",
                fontSize: "12px",
                color: "var(--eh-ink-soft)",
                margin: "10px 16px 0",
              }}
              aria-live="polite"
            >
              fetching…
            </p>
          )}

          <div className="eh-submit-row">
            <button
              className="eh-submit"
              disabled={!canSubmit || busy}
              onClick={handleSubmit}
            >
              {busy ? "Fetching…" : "Weigh the evidence"}
            </button>
          </div>

          {/* Disclosure: URL fetches route through a third-party reader. */}
          <p
            style={{
              fontFamily: "var(--eh-sans)",
              fontSize: "11px",
              lineHeight: 1.5,
              color: "var(--eh-ink-soft)",
              margin: "0 16px 14px",
              opacity: 0.85,
            }}
          >
            Links are fetched through r.jina.ac, a third-party reader service.
          </p>
        </div>
      </div>
    </main>
  );
}
