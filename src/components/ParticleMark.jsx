import { useEffect, useRef } from "react";

/**
 * ParticleMark — the Evidence Hedge animated mark.
 *
 * A revolving sphere of ink-black particles (the document: thousands of
 * individual claims that only cohere in aggregate) with four colored
 * particle streams sprouting off it — one per rubric branch.
 *
 * Pure canvas, no assets, loops forever. Respects prefers-reduced-motion
 * by rendering a single static frame.
 *
 * Props:
 *   size          px, default 300
 *   ink           particle color, default near-black
 *   offshoots     array of CSS colors, one stream each
 */

const DEFAULT_OFFSHOOTS = [
  "#3557A7", // corporate — institutional navy
  "#8C2F39", // research — oxblood
  "#C58A17", // journalism — ochre
  "#2F6B4F", // general — forest
];

export default function ParticleMark({
  size = 300,
  ink = "23, 24, 26",
  offshoots = DEFAULT_OFFSHOOTS,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // ---- sphere points (fibonacci lattice) ----
    const N = 2200;
    const R = size * 0.30;
    const pts = new Array(N);
    const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = GA * i;
      pts[i] = {
        x: Math.cos(th) * r,
        y,
        z: Math.sin(th) * r,
        // per-particle turbulence phase + amplitude (the "wispy" feel)
        ph: Math.random() * Math.PI * 2,
        amp: 0.02 + Math.pow(Math.random(), 3) * 0.22,
        sz: 0.5 + Math.random() * 0.9,
      };
    }

    // ---- offshoot streams: colored wisps flowing off the surface ----
    // Each stream has an anchor direction on the sphere and a bundle of
    // particles at different progress values along a curved outward path.
    const STREAM_LEN = size * 0.34;
    const streams = offshoots.map((color, s) => {
      const phi = (s / offshoots.length) * Math.PI * 2 + 0.7;
      const tilt = s % 2 === 0 ? 0.45 : -0.35;
      const anchor = {
        x: Math.cos(phi) * Math.cos(tilt),
        y: Math.sin(tilt),
        z: Math.sin(phi) * Math.cos(tilt),
      };
      // perpendicular for curvature
      const perp = norm(cross(anchor, { x: 0, y: 1, z: 0.31 }));
      const parts = Array.from({ length: 46 }, () => ({
        p: Math.random(),
        speed: 0.0016 + Math.random() * 0.0028,
        jitter: (Math.random() - 0.5) * 0.16,
        sz: 0.6 + Math.random() * 1.0,
      }));
      return { color, anchor, perp, parts };
    });

    const f = size * 0.9; // perspective focal length
    const cx = size / 2;
    const cy = size / 2;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let t = reduced ? 12.4 : 0; // pleasant static pose for reduced motion

    const frame = () => {
      ctx.clearRect(0, 0, size, size);
      const ry = t * 0.28; // revolve
      const rx = 0.42 + Math.sin(t * 0.11) * 0.06; // slow precession
      const cosy = Math.cos(ry), siny = Math.sin(ry);
      const cosx = Math.cos(rx), sinx = Math.sin(rx);

      // sphere body
      for (let i = 0; i < N; i++) {
        const pt = pts[i];
        // turbulence along the normal — breathes like the reference
        const w = 1 + Math.sin(t * 1.3 + pt.ph + pt.y * 3.1) * pt.amp;
        let x = pt.x * w, y = pt.y * w, z = pt.z * w;
        // rotate Y then X
        let x1 = x * cosy - z * siny;
        let z1 = x * siny + z * cosy;
        let y1 = y * cosx - z1 * sinx;
        z1 = y * sinx + z1 * cosx;

        const zc = z1 * R;
        const s = f / (f + zc);
        const px = cx + x1 * R * s;
        const py = cy + y1 * R * s;
        const depth = (z1 + 1) / 2; // 0 far → 1 near
        const a = 0.06 + depth * 0.55;
        ctx.fillStyle = `rgba(${ink}, ${a.toFixed(3)})`;
        const d = pt.sz * (0.5 + depth * 0.9);
        ctx.fillRect(px, py, d, d);
      }

      // colored offshoots
      for (const st of streams) {
        // rotate the anchor & perp with the sphere so streams revolve too
        const A = rot(st.anchor, cosy, siny, cosx, sinx);
        const P = rot(st.perp, cosy, siny, cosx, sinx);
        for (const q of st.parts) {
          if (!reduced) {
            q.p += q.speed;
            if (q.p >= 1) q.p -= 1;
          }
          const p = q.p;
          const arc = Math.sin(p * Math.PI); // fade in/out envelope
          const bend = Math.sin(p * Math.PI) * 0.55 + q.jitter;
          const dist = R + p * STREAM_LEN;
          const x = A.x * dist + P.x * bend * R * 0.6;
          const y = A.y * dist + P.y * bend * R * 0.6;
          const z = A.z * dist + P.z * bend * R * 0.6;
          const s = f / (f + z);
          const px = cx + x * s;
          const py = cy + y * s;
          const a = arc * 0.75 * (0.35 + ((z / R + 1) / 2) * 0.65);
          ctx.fillStyle = hexA(st.color, Math.max(a, 0));
          const d = q.sz * (0.6 + (1 - p) * 0.8);
          ctx.fillRect(px, py, d, d);
        }
      }

      if (!reduced) {
        t += 0.016;
        raf = requestAnimationFrame(frame);
      }
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [size, ink, offshoots]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block" }}
      role="img"
      aria-label="Evidence Hedge mark: a revolving sphere of particles with colored streams branching off"
    />
  );
}

// ---- tiny vector helpers ----
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function norm(v) {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}
function rot(v, cosy, siny, cosx, sinx) {
  const x1 = v.x * cosy - v.z * siny;
  const z0 = v.x * siny + v.z * cosy;
  const y1 = v.y * cosx - z0 * sinx;
  const z1 = v.y * sinx + z0 * cosx;
  return { x: x1, y: y1, z: z1 };
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
}
