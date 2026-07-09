import { useRef, useState } from "react";
import { ACCEPT_ATTR } from "../ingest/extractFile.js";

/**
 * FileDropZone — drop a file or click to browse. Visual register: hairline
 * border, square corners, no new colors, no gradients; the drag-over state only
 * darkens the existing hairline border. Styled inline against the shared tokens
 * so landing.css is untouched.
 *
 * Props:
 *   onFile(file)  — called with the selected/dropped File
 *   disabled      — while an extraction is in flight
 */
export default function FileDropZone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const pick = (files) => { if (!disabled && files && files[0]) onFile(files[0]); };
  const open = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a file, or click to browse"
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      style={{
        border: "1px solid " + (over ? "var(--eh-ink)" : "var(--eh-hairline)"),
        padding: "14px 16px",
        cursor: disabled ? "default" : "pointer",
        background: "var(--eh-paper)",
        transition: "border-color 0.15s ease",
      }}
    >
      <p style={{ fontFamily: "var(--eh-sans)", fontSize: "12px", color: "var(--eh-ink-soft)", margin: 0, lineHeight: 1.5 }}>
        Drop a PDF, DOCX, TXT, or MD file, or{" "}
        <span style={{ textDecoration: "underline" }}>browse</span>.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        style={{ display: "none" }}
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}
