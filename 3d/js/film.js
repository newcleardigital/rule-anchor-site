// The Anchored film, minimal cut: thin light on near-black, one brass accent.
// Shared by the scroll page (site/story.html) and the Remotion render (film/).
// Same eight beats as before, 3.5 s each. draw(g, frame) is a pure function of the
// frame number, because Remotion renders frames out of order and in parallel.
import { PALETTE as P, MONO, SANS, rng, clamp, lerp, span, ease, text } from "./kit.js";

export const FPS = 24;
export const BEAT = 84; // 3.5 s
export const BEATS = ["drift", "weight", "signature", "catch", "gate", "proof", "dock", "drop"];
export const TOTAL = BEAT * BEATS.length;

const W = 1920, H = 1080, CX = 960, CY = 470, R = 220, TAU = Math.PI * 2, HY = 600;
const GOLD = "#f0c06a", SILVER = "#c9d6e3", OK = "#3fbf8f", BAD = P.refused;
const out = (t) => 1 - Math.pow(1 - t, 3);

const CAPTIONS = [
  "Each AI session reads the rules a little differently.",
  "Every clause of the law gets one ID.",
  "Only a named approver signs a reading.",
  "Caught while the AI types.",
  "Every commit passes the same gates.",
  "Proof for internal audit and the regulator.",
  "Start free. Buy when you need the evidence.",
  "",
];
const RULES = [["IF-CAP-001", "Art. 3(1)"], ["IF-CAP-002", "Art. 4"], ["IF-SCOPE-001", "Art. 1(3)(a)"], ["IF-INFO-001", "Art. 12(1)"]];
const TESTS = ["test_interchange.py:13", "test_interchange.py:18", "test_interchange.py:23", "test_interchange.py:27"];
const GATES = ["catalogue well formed", "boundary named", "requirement traceability", "authority thresholds", "checks copy intact"];
const GX = [400, 680, 960, 1240, 1520];
const LINE_A = "    cap = amount * 0.2 / 100";
const LINE_B = "    cap = amount * debit_cap_pct(day) / 100";

// Session rings: [colour, phase, squash, drift x, drift y]. The brass one becomes the rule.
const RINGS = [
  [SILVER, 0.0, 0.84, -0.9, -0.4], ["#8fb8e8", 1.3, 0.9, 0.8, -0.7], ["#e8d3b0", 2.4, 0.86, 0.3, 0.9],
  ["#a9a6d9", 3.9, 0.8, -0.6, 0.8], ["#7fd0e0", 5.1, 0.92, 1.0, 0.2], [P.brass, 0.7, 0.95, -0.2, -1.0],
];

// Fingerprint contours, fixed by seed.
const rr = rng(5);
const PRINT = Array.from({ length: 30 }, (_, k) => ({ k, a0: rr() * TAU, gap: k < 4 ? 1.2 + rr() : 0.15 + rr() * 0.45 }));
const SPARKS = Array.from({ length: 14 }, () => [8 + Math.floor(rr() * 22), rr() * TAU]);
const REG = Array.from({ length: 14 }, (_, i) => 200 + rr() * 110 - (i % 4 === 3 ? 90 : 0));
const HL = [2, 5, 8, 11], RX = 1330; // the regulation column, right of the ring

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
// Light: additive, so overlapping lines brighten like the reference rings.
function ink(g, style, a, lw = 1.5, blur = 0, shadow = typeof style === "string" ? style : SILVER) {
  if (a <= 0.002) return;
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.min(1, a);
  g.strokeStyle = style;
  g.lineWidth = lw;
  g.shadowColor = shadow;
  g.shadowBlur = blur;
  g.stroke();
}
function dot(g, x, y, r, color, a, blur = 16) {
  if (a <= 0.002) return;
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.min(1, a);
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
function say(g, s, x, y, a, { size = 18, color = P.paper, font = MONO, weight = 400, align = "left", spacing = 0, blur = 0 } = {}) {
  if (a <= 0.002 || !s) return;
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.min(1, a);
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.letterSpacing = `${spacing}px`;
  text(g, s, x, y, { size, color, font, weight, align });
  g.letterSpacing = "0px";
}
// A horizontal hairline that fades out at both ends, like a light streak.
function hline(g, y, x0, x1, color, a, lw = 1.2, blur = 0) {
  if (x1 - x0 < 1) return;
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, rgba(color, 0));
  gr.addColorStop(0.18, rgba(color, 1));
  gr.addColorStop(0.82, rgba(color, 1));
  gr.addColorStop(1, rgba(color, 0));
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  ink(g, gr, a, lw, blur, color);
}

function ringPt(k, th, t, wob, drift) {
  const [, ph, sy0, dx, dy] = RINGS[k];
  const r = R * (1 + wob * (0.07 * Math.sin(2 * th + ph + t * 0.7) + 0.045 * Math.sin(3 * th - ph * 1.7 - t * 0.5)));
  const rot = ph + t * 0.15 * (k % 2 ? 1 : -1);
  const x = r * Math.cos(th), y = r * Math.sin(th) * lerp(1, sy0, wob);
  return [CX + drift * dx * 70 + x * Math.cos(rot) - y * Math.sin(rot), CY + drift * dy * 45 + x * Math.sin(rot) + y * Math.cos(rot)];
}

// Product glyphs, drawn from the bottom centre (x, y), h tall.
function anchorGlyph(g, x, y, h) {
  const top = y - h, cy = y - h * 0.45, ar = h * 0.43;
  g.beginPath();
  g.arc(x, top + h * 0.07, h * 0.07, 0, TAU);
  g.moveTo(x, top + h * 0.14);
  g.lineTo(x, y - h * 0.02);
  g.moveTo(x - h * 0.2, top + h * 0.27);
  g.lineTo(x + h * 0.2, top + h * 0.27);
  g.moveTo(x + ar * Math.cos(0.1 * Math.PI), cy + ar * Math.sin(0.1 * Math.PI));
  g.arc(x, cy, ar, 0.1 * Math.PI, 0.9 * Math.PI);
  for (const s of [1, -1]) {
    const ex = x + s * ar * Math.cos(0.1 * Math.PI), ey = cy + ar * Math.sin(0.1 * Math.PI);
    const tx = ex + s * 0.03 * h, ty = ey - 0.07 * h;
    g.moveTo(ex + s * 0.08 * h, ey + 0.03 * h);
    g.lineTo(tx, ty);
    g.lineTo(ex - s * 0.06 * h, ey + 0.05 * h);
  }
}
function buoyGlyph(g, x, y, h) {
  const at = (f) => lerp(0.21, 0.1, f) * h; // half width at height fraction f of the body
  g.beginPath();
  g.moveTo(x - at(0), y);
  g.lineTo(x - at(1), y - h * 0.62);
  g.lineTo(x, y - h * 0.84);
  g.lineTo(x + at(1), y - h * 0.62);
  g.lineTo(x + at(0), y);
  g.closePath();
  for (const f of [0.3, 0.65]) {
    g.moveTo(x - at(f), y - h * 0.62 * f);
    g.lineTo(x + at(f), y - h * 0.62 * f);
  }
}
function compassGlyph(g, x, y, h) {
  const cy = y - h * 0.4, r = h * 0.4;
  g.beginPath();
  g.arc(x, cy, r, 0, TAU);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, r0 = i % 3 ? r * 0.86 : r * 0.76;
    g.moveTo(x + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(x + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
  }
  g.moveTo(x, cy - r * 0.62);
  g.lineTo(x + r * 0.12, cy);
  g.lineTo(x, cy + r * 0.62);
  g.lineTo(x - r * 0.12, cy);
  g.closePath();
}

// view = [scale, x, y]: where the 1920×1080 design lands on the canvas. The ground fills beyond it.
export function draw(g, frame, captions = true, view = [1, 0, 0]) {
  const u = frame / BEAT, t = frame / FPS;
  g.setTransform(view[0], 0, 0, view[0], view[1], view[2]);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.shadowBlur = 0;

  // ground: deep navy, a faint teal rise at the bottom
  const bg = g.createRadialGradient(CX, CY, 0, CX, CY, 1150);
  bg.addColorStop(0, "#0e2033");
  bg.addColorStop(0.55, "#081422");
  bg.addColorStop(1, "#04080f");
  g.fillStyle = bg;
  g.fillRect(-W, -H, 3 * W, 3 * H);
  const teal = g.createLinearGradient(0, 760, 0, H);
  teal.addColorStop(0, "rgba(14,58,70,0)");
  teal.addColorStop(1, "rgba(14,58,70,0.32)");
  g.fillStyle = teal;
  g.fillRect(-W, 760, 3 * W, H - 760);
  g.fillStyle = "rgba(14,58,70,0.32)";
  g.fillRect(-W, H, 3 * W, H);

  // ---------- 1 drift: session rings wobble and pull apart; 2 weight: they settle into one ----------
  const converge = ease(span(u, 1, 1.4));
  const drift = (0.25 + 0.75 * ease(span(u, 0.1, 0.85))) * (1 - converge);
  const wob = 1 - converge;
  const ringGone = 1 - span(u, 2.95, 3.15);
  RINGS.forEach(([col], k) => {
    const isRule = k === RINGS.length - 1;
    const a = (isRule ? 1 : 1 - span(u, 1.25, 1.45)) * ringGone;
    if (a <= 0.002) return;
    g.beginPath();
    for (let i = 0; i <= 180; i++) g.lineTo(...ringPt(k, (i / 180) * TAU, t, wob, drift));
    const c = isRule && converge > 0.5 ? GOLD : col;
    ink(g, c, a * 0.07, 14);
    ink(g, c, a * (isRule ? lerp(0.75, 0.95, converge) : 0.7), isRule ? lerp(1.6, 2, converge) : 1.6, 14);
  });

  // two sessions, one rule, two answers; the thread between them snaps
  const sA = span(u, 0.12, 0.25) * (1 - span(u, 0.9, 1));
  const [ax, ay] = ringPt(0, Math.PI + t * 0.15, t, wob, drift), [bx, by] = ringPt(4, -RINGS[4][1] - t * 0.15, t, wob, drift);
  dot(g, ax, ay, 4, SILVER, sA, 10);
  dot(g, bx, by, 4, SILVER, sA, 10);
  say(g, "SESSION 3", ax - 20, ay - 10, sA * 0.8, { size: 13, color: P.slateLight, align: "right", spacing: 2 });
  say(g, "VAT 19%", ax - 20, ay + 16, sA, { size: 20, align: "right" });
  say(g, "SESSION 12", bx + 20, by - 10, sA * 0.8, { size: 13, color: P.slateLight, spacing: 2 });
  say(g, "VAT 16%", bx + 20, by + 16, sA, { size: 20 });
  const snap = out(span(u, 0.66, 0.8)), mx = (ax + bx) / 2, my = (ay + by) / 2;
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(lerp(mx, ax, snap), lerp(my, ay, snap));
  g.moveTo(bx, by);
  g.lineTo(lerp(mx, bx, snap), lerp(my, by, snap));
  ink(g, BAD, sA * (1 - snap) * 0.9, 1.2, 8);
  say(g, "contradicts", mx, my - 14, sA * (1 - span(u, 0.62, 0.68)), { size: 15, color: BAD, align: "center" });

  // ---------- 2 weight: the regulation's clauses become four rules on the ring ----------
  const w = span(u, 1, 2), regA = span(u, 0.95, 1.1) * (1 - span(u, 1.85, 2));
  say(g, "Regulation (EU) 2015/751", RX, 330, regA * 0.8, { size: 15, color: P.slateLight });
  REG.forEach((len, i) => {
    const y = 362 + i * 22, k = HL.indexOf(i);
    g.beginPath();
    g.moveTo(RX, y);
    g.lineTo(RX + len, y);
    ink(g, P.slateLight, regA * 0.32, 2);
    if (k < 0) return;
    const lit = span(w, 0.15 + k * 0.08, 0.22 + k * 0.08);
    ink(g, GOLD, regA * lit, 2, 10);
    say(g, RULES[k][1], RX + len + 14, y + 5, regA * lit, { size: 13, color: GOLD });
  });
  const ANG = [-0.75 * Math.PI, -0.25 * Math.PI, 0.25 * Math.PI, 0.75 * Math.PI];
  ANG.forEach((an, k) => {
    const f = ease(span(w, 0.22 + k * 0.08, 0.5 + k * 0.08));
    if (u < 1.2) return;
    const x0 = RX, y0 = 362 + HL[k] * 22, x1 = CX + R * Math.cos(an), y1 = CY + R * Math.sin(an);
    const qx = lerp(x0, x1, 0.5), qy = Math.min(y0, y1) - 140;
    const x = (1 - f) * (1 - f) * x0 + 2 * (1 - f) * f * qx + f * f * x1, y = (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * qy + f * f * y1;
    dot(g, x, y, 4.5, GOLD, (f > 0 ? 1 : 0) * ringGone, 18);
    const la = span(w, 0.5 + k * 0.08, 0.58 + k * 0.08) * (k === 0 ? 1 - span(u, 2.92, 3.02) : 1 - span(u, 2, 2.12));
    const right = Math.cos(an) > 0, lx = CX + (R + 24) * Math.cos(an), ly = CY + (R + 24) * Math.sin(an) + (an < 0 ? -10 : 14);
    say(g, RULES[k][0], lx, ly, la, { size: 17, align: right ? "left" : "right" });
    say(g, RULES[k][1], lx, ly + 20, la * 0.8, { size: 13, color: P.slateLight, align: right ? "left" : "right" });
  });

  // ---------- 3 signature: a fingerprint forms; the AI is refused; a person signs ----------
  const s = span(u, 2, 3), printA = 1 - span(u, 3, 3.15), goldness = span(s, 0.6, 0.85);
  if (u >= 2 && printA > 0) {
    if (goldness > 0) {
      const gl = g.createRadialGradient(CX, CY, 0, CX, CY, R * 0.85);
      gl.addColorStop(0, rgba(GOLD, 0.22 * goldness * printA));
      gl.addColorStop(1, rgba(GOLD, 0));
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 1;
      g.shadowBlur = 0;
      g.fillStyle = gl;
      g.fillRect(CX - R, CY - R, 2 * R, 2 * R);
    }
    const ptOf = (c, th) => {
      const rk = R * 0.88 * ((c.k + 1) / PRINT.length), n = 0.045 * Math.sin(3 * th + 1.1 + c.k * 0.06) + 0.025 * Math.sin(5 * th + 2.3 + c.k * 0.04);
      return [CX + rk * 0.78 * Math.cos(th) * (1 + n), CY + (1 - c.k / PRINT.length) * 12 + rk * Math.sin(th) * (1 + n)];
    };
    for (const c of PRINT) {
      const drawn = span(s, 0.02 + c.k * 0.006, 0.22 + c.k * 0.006), steps = 30 + c.k * 6;
      if (drawn <= 0) continue;
      g.beginPath();
      for (let i = 0; i <= steps; i++) g.lineTo(...ptOf(c, c.a0 + (TAU - c.gap) * drawn * (i / steps)));
      ink(g, SILVER, 0.5 * printA, 1.1, 6);
      const lit = span(s, 0.6 + (c.k / PRINT.length) * 0.18, 0.66 + (c.k / PRINT.length) * 0.18);
      ink(g, GOLD, lit * printA, 1.3, 12);
    }
    for (const [k, th] of SPARKS) dot(g, ...ptOf(PRINT[k], th), 2.4, GOLD, goldness * printA, 10);
  }
  if (u >= 2 && u < 3) {
    const cin = ease(span(s, 0.18, 0.38)), back = ease(span(s, 0.56, 0.7));
    const aiX = lerp(lerp(CX + 560, CX + R + 26, cin), CX + 520, back), aiA = span(s, 0.12, 0.2) * (1 - back);
    dot(g, aiX, CY, 6, P.slateLight, aiA, 14);
    say(g, "AI", aiX, CY - 18, aiA * 0.8, { size: 13, color: P.slateLight, align: "center", spacing: 2 });
    const rp = span(s, 0.4, 0.56);
    g.beginPath();
    g.arc(CX + R, CY, lerp(8, 70, out(rp)), 0, TAU);
    ink(g, BAD, rp > 0 && rp < 1 ? 1 - rp : 0, 1.5, 10);
    say(g, "AI cannot approve itself", CX + R + 40, CY + 46, span(s, 0.42, 0.46) * (1 - span(s, 0.62, 0.68)), { size: 16, color: BAD });
  }
  say(g, "signed · M. Petrova · a3ebe5a", CX, CY + R + 58, span(s, 0.8, 0.88) * (1 - span(u, 2.95, 3.08)), { size: 18, color: GOLD, align: "center", blur: 10 });

  // ---------- 4 catch: the AI types a number from the law; refused; rewritten ----------
  const c = span(u, 3, 4), codeA = span(c, 0.1, 0.2) * (1 - span(u, 3.9, 4.04));
  if (codeA > 0) {
    let line = LINE_A.slice(0, 4 + Math.round((LINE_A.length - 4) * span(c, 0.18, 0.38)));
    if (c >= 0.54) line = LINE_A.slice(0, Math.round(LINE_A.length - (LINE_A.length - 4) * span(c, 0.54, 0.6)));
    if (c >= 0.6) line = LINE_B.slice(0, 4 + Math.round((LINE_B.length - 4) * span(c, 0.62, 0.8)));
    const X = 640, Y = 400, LH = 54, size = 28;
    const rows = [[7, "def debit_cap(amount, day):"], [8, "    # Requirement: IF-CAP-001"], [9, line], [10, "    return cap"]];
    hline(g, Y + 2 * LH - 9, X - 120, X + 900, GOLD, codeA * 0.14, 38, 0); // the working line, softly lit
    rows.forEach(([n, str], i) => {
      say(g, String(n), X - 40, Y + i * LH, codeA * 0.5, { size: 22, color: P.slateLight, align: "right" });
      say(g, str, X, Y + i * LH, codeA * (n === 8 ? 0.55 : 0.9), { size, color: n === 9 && c >= 0.6 ? GOLD : n === 8 ? P.slateLight : P.paper });
    });
    g.font = `400 ${size}px ${MONO}`;
    const lineW = g.measureText(line).width;
    if (c > 0.16 && c < 0.84 && Math.floor(frame / 6) % 2 === 0) dot(g, X + lineW + 6, Y + 2 * LH - 10, 2.5, GOLD, codeA, 8);
    const refA = span(c, 0.4, 0.44) * (1 - span(c, 0.54, 0.58));
    const ux = X + g.measureText("    cap = amount * ").width;
    g.beginPath();
    g.moveTo(ux, Y + 2 * LH + 9);
    g.lineTo(ux + g.measureText("0.2").width, Y + 2 * LH + 9);
    ink(g, BAD, refA, 3, 10);
    say(g, "Anchored · line 9: 0.2 is a threshold from the authority — read it from `law`", X - 40, Y + 4 * LH + 34, refA, { size: 18, color: BAD });
    say(g, "✓ All checks pass · 4 of 4 rules proved by a test.", X - 40, Y + 4 * LH + 34, span(c, 0.84, 0.9) * codeA, { size: 18, color: OK });
  }

  // ---------- 5 gate → 6 proof → 7 dock: one line becomes the gates, the table, the horizon ----------
  const gt = span(u, 4, 5), p = span(u, 5, 6), d = span(u, 6, 7);
  const lineIn = ease(span(u, 3.92, 4.14));
  const toDock = ease(span(u, 6, 6.3));
  for (let i = 0; i < 6; i++) {
    const spread = ease(span(p, 0.05 + i * 0.04, 0.35 + i * 0.04));
    const y = lerp(lerp(CY, 330 + i * 66, spread), HY, toDock);
    const half = lerp(lerp(760, 600, spread), 960, toDock) * lineIn;
    const a = (i === 0 ? 1 : span(p, 0, 0.05) * (1 - span(u, 6.1, 6.3)));
    const col = i === 0 || i === 5 ? P.brass : P.slateLight;
    hline(g, y - (i === 0 ? dropPan(u) : 0), CX - half, CX + half, u >= 6 && i === 0 ? SILVER : col, a * (i === 0 ? 0.55 : 0.35), 1.2, 6);
  }

  // gates: a commit runs the line, stops red at the third, then passes all five
  const gateA = span(u, 3.95, 4.15) * (1 - span(u, 5, 5.12));
  const px = gt < 0.45 ? lerp(180, 930, ease(span(gt, 0.12, 0.45))) : gt < 0.62 ? 930 : lerp(930, 1760, out(span(gt, 0.62, 0.92)));
  const failing = gt >= 0.45 && gt < 0.62;
  GX.forEach((x, k) => {
    const passed = u >= 5 || px > x + 15, red = k === 2 && failing;
    const col = passed ? OK : red ? BAD : P.slateLight;
    g.beginPath();
    g.arc(x, CY, 15, 0, TAU);
    ink(g, col, gateA * (passed || red ? 1 : 0.6), 1.5, passed || red ? 12 : 0);
    say(g, (passed ? "✓ " : "") + GATES[k], x, CY - 34, gateA * (passed ? 1 : 0.7), { size: 14, color: passed ? OK : P.slateLight, align: "center" });
  });
  if (gateA > 0 && gt > 0.1 && gt < 0.95) {
    const pa = gateA * span(gt, 0.1, 0.16) * (1 - span(gt, 0.9, 0.95));
    hline(g, CY, px - 320, px + 20, GOLD, pa * 0.9, 2, 14);
    dot(g, px, CY, 5, GOLD, pa, 22);
  }
  const fp = span(gt, 0.45, 0.6);
  g.beginPath();
  g.arc(GX[2], CY, lerp(15, 60, out(fp)), 0, TAU);
  ink(g, BAD, fp > 0 && fp < 1 ? (1 - fp) * gateA : 0, 1.5, 10);
  const failA = gateA * span(gt, 0.45, 0.48) * (1 - span(gt, 0.6, 0.64));
  say(g, "FAIL · IF-CAP-999 at src/fees/interchange.py:34", CX, CY + 58, failA, { size: 16, color: BAD, align: "center" });
  say(g, "An ID not in the catalogue proves nothing.", CX, CY + 84, failA * 0.75, { size: 15, align: "center" });
  say(g, "ALL GATES GREEN", CX, CY + 66, span(gt, 0.9, 0.95) * (1 - span(u, 5.04, 5.14)), { size: 18, color: OK, align: "center", spacing: 4, blur: 10 });

  // proof: the record, one row per rule
  const tabA = 1 - span(u, 6, 6.12);
  const COLS = [380, 680, 940, 1380];
  [["RULE", "APPROVED BY", "TEST", "STATUS"], ...RULES.map(([id], k) => [id, "M. Petrova", TESTS[k], "✓ Proved"])].forEach((cells, r) => {
    const a = span(p, 0.35 + r * 0.07, 0.45 + r * 0.07) * tabA;
    cells.forEach((cell, i) =>
      say(g, cell, COLS[i], 330 + r * 66 + 41, a, r === 0 ? { size: 13, color: P.slateLight, spacing: 2 } : { size: 20, color: i === 3 ? OK : P.paper }));
  });
  say(g, "Traceability · interchange-fees · Generated, do not edit", 380, 304, span(p, 0.75, 0.85) * tabA, { size: 14, color: P.slateLight });

  // ---------- 7 dock: three products on the horizon; 8 drop: the anchor goes down and holds ----------
  const e = span(u, 7, 8), pan = dropPan(u), hy = HY - pan;
  if (u >= 6) {
    const water = g.createLinearGradient(0, hy, 0, H);
    water.addColorStop(0, "rgba(2,6,12,0)");
    water.addColorStop(1, "rgba(2,6,12,0.55)");
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = span(u, 6.05, 6.3);
    g.shadowBlur = 0;
    g.fillStyle = water;
    g.fillRect(-W, hy, 3 * W, H - hy);
    g.fillStyle = "rgba(2,6,12,0.55)";
    g.fillRect(-W, H, 3 * W, H);
  }
  const others = 1 - span(e, 0, 0.12);
  [["Anchored Scan", "free", buoyGlyph, 660], ["Anchored Lite", "free", compassGlyph, 960], ["Anchored", "the evidence", anchorGlyph, 1260]].forEach(([name, sub, glyph, x0], k) => {
    const a = span(d, 0.15 + k * 0.08, 0.35 + k * 0.08);
    const bob = Math.sin(t * 1.6 + k) * 3;
    if (k < 2) {
      if (a * others <= 0) return;
      glyph(g, x0, HY - 8 + bob, 150);
      ink(g, SILVER, a * others * 0.85, 1.6, 10);
    }
    say(g, name, x0, HY + 46, a * others, { size: 18, align: "center" });
    say(g, sub, x0, HY + 70, a * others * 0.8, { size: 14, color: P.slateLight, align: "center" });
    if (k < 2 || a <= 0) return;
    // the anchor: fall through air, slow through water, land and hold
    const ax2 = lerp(x0, CX, ease(span(e, 0.02, 0.22)));
    const fall = Math.pow(span(e, 0.22, 0.32), 2), sink = out(span(e, 0.32, 0.62));
    const base = e < 0.32 ? lerp(HY - 8 + bob * (1 - span(e, 0.1, 0.2)), HY + 150, fall) : lerp(HY + 150, HY + 520, sink);
    const by2 = base - pan;
    if (e > 0.3) {
      g.beginPath();
      g.moveTo(CX, hy);
      g.quadraticCurveTo(CX + 30 * (1 - span(e, 0.6, 0.8)), (hy + by2 - 150) / 2, ax2, by2 - 150);
      g.setLineDash([2, 8]);
      ink(g, P.brass, 0.8, 2, 6);
      g.setLineDash([]);
    }
    const land = span(e, 0.6, 0.85);
    if (land > 0) {
      const gl = g.createRadialGradient(ax2, by2 - 60, 0, ax2, by2 - 60, 260);
      gl.addColorStop(0, rgba(GOLD, 0.16 * Math.min(1, land * 2)));
      gl.addColorStop(1, rgba(GOLD, 0));
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 1;
      g.shadowBlur = 0;
      g.fillStyle = gl;
      g.fillRect(ax2 - 260, by2 - 320, 520, 520);
      hline(g, by2 + 4, ax2 - 320, ax2 + 320, P.slateLight, 0.4 * span(e, 0.55, 0.65), 1, 0);
      g.beginPath();
      g.ellipse(ax2, by2 + 4, 20 + 220 * out(land), (20 + 220 * out(land)) * 0.1, 0, 0, TAU);
      ink(g, GOLD, 0.7 * (1 - land), 1.2, 8);
    }
    anchorGlyph(g, ax2, by2, 150);
    ink(g, GOLD, a, 2, 14);
  });
  for (let j = 0; j < 3; j++) {
    const k = span(e, 0.31 + j * 0.05, 0.61 + j * 0.05);
    if (k <= 0 || k >= 1) continue;
    const rx = 20 + 280 * out(k);
    g.beginPath();
    g.ellipse(CX, hy, rx, rx * 0.1, 0, 0, TAU);
    ink(g, SILVER, 0.7 * (1 - k), 1.2, 8);
  }
  const endA = span(e, 0.72, 0.85);
  say(g, "Anchored", CX, 880, endA, { size: 56, font: SANS, weight: 300, align: "center", spacing: 8 });
  say(g, "AI UNDER CONTROL", CX, 922, endA * 0.8, { size: 14, color: P.slateLight, align: "center", spacing: 5 });

  // caption: one plain line per beat
  if (captions && CAPTIONS[Math.min(7, Math.floor(u))]) {
    const b = Math.min(7, Math.floor(u)), l = u - b, ca = span(l, 0.06, 0.16) * (1 - span(l, 0.88, 0.98));
    say(g, `0${b + 1} / 08`, CX, 940, ca * 0.8, { size: 13, color: P.brass, align: "center", spacing: 3 });
    say(g, CAPTIONS[b], CX, 984, ca * 0.9, { size: 30, font: SANS, weight: 300, align: "center" });
  }
}

// In the last beat the view follows the anchor down: everything on the water moves up.
function dropPan(u) {
  return 380 * ease(span(u, 7.28, 7.66));
}
