// The parts of the Anchored underwater scene, shared by the live site and the
// Remotion film in film/. Change a part here and both follow.
//
// Rules: no `import "three"` (every builder takes THREE, so the site's import
// map and the film's npm copy both work); no clocks and no Math.random (state
// comes in as numbers, randomness from rng(seed)), because the film renders
// frames out of order. Labels are real values from the interchange-fees example.

export const PALETTE = {
  navy: "#0b1b2e", paper: "#f4f1ea", brass: "#c8963e", slateLight: "#93a1b1",
  verified: "#2e9e78", refused: "#e06a6a",
};
export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (x, a, b) => clamp((x - a) / (b - a)); // progress of x through [a, b]
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function makeMaterials(THREE) {
  const std = (color, metalness, roughness, envMapIntensity = 1) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity });
  return {
    brass: std(0xc08a2e, 0.95, 0.28),
    chain: std(0x9c7230, 0.92, 0.4, 0.9),
    navyPaint: std(0x16304f, 0.2, 0.55),
    wood: std(0x3b2f25, 0, 0.85),
    sand: std(0x3a4352, 0, 1),
    wire: new THREE.LineBasicMaterial({ color: PALETTE.brass, transparent: true, opacity: 0.7 }),
  };
}

// A small lit room baked into an environment map, so brass has something to reflect.
export function makeEnvironment(THREE, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x13263b, side: THREE.BackSide })));
  for (const [hex, k, w, h, x, y, z] of [
    [0xffd9a0, 2.4, 9, 6, -7, 6, 7], [0x8fb6ff, 1.3, 4, 12, 9, 0, -3],
    [0xfff0d8, 1.1, 14, 2, 0, 11, 0], [0x2a4a70, 1.5, 20, 6, 0, -10, 0],
  ]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  const tex = pm.fromScene(env, 0.04).texture;
  pm.dispose();
  return tex;
}

// Admiralty-pattern anchor. Origin = shank centre; eye ring at EYE_Y.
export const EYE_Y = 1.55;
export function buildAnchor(THREE, mats) {
  const group = new THREE.Group();
  const crownMat = mats.brass.clone(); // own copy, so the crown can dim and relight
  const add = (geo, mat = mats.brass) => group.add(new THREE.Mesh(geo, mat)).children.at(-1);
  add(new THREE.CylinderGeometry(0.1, 0.125, 2.5, 28)).position.y = 0.05;
  add(new THREE.TorusGeometry(0.26, 0.065, 16, 44)).position.y = EYE_Y;
  const stock = add(new THREE.CylinderGeometry(0.065, 0.065, 1.56, 20));
  stock.rotation.z = Math.PI / 2;
  stock.position.y = 1.05;
  for (const x of [-0.8, 0.8]) add(new THREE.SphereGeometry(0.105, 20, 14)).position.set(x, 1.05, 0);
  const crown = add(new THREE.TorusGeometry(1, 0.1, 18, 72, Math.PI), crownMat);
  crown.rotation.z = Math.PI;
  crown.position.y = -0.2;
  for (const s of [-1, 1]) {
    const f = add(new THREE.ConeGeometry(0.24, 0.6, 4), crownMat);
    f.scale.z = 0.42;
    f.position.set(s * 1.02, 0.02, 0);
    f.rotation.z = -s * 0.38;
  }
  add(new THREE.SphereGeometry(0.16, 20, 14), crownMat).position.y = -1.2;
  const lit = new THREE.Color(mats.brass.color), dark = new THREE.Color(0x2a3442);
  return {
    group,
    // where the four rule tiles sit, a 2×2 plate across the crown, in local space
    crownSlots: [[-0.48, -0.8], [0.48, -0.8], [-0.48, -1.09], [0.48, -1.09]].map(([x, y]) => new THREE.Vector3(x, y, 0.16)),
    setCrownLit(k) {
      crownMat.color.copy(dark).lerp(lit, k);
      crownMat.metalness = 0.4 + 0.55 * k;
    },
  };
}

export const LINK_GAP = 0.4;
export function buildChain(THREE, mats, count = 16) {
  const group = new THREE.Group();
  const geo = new THREE.TorusGeometry(0.17, 0.046, 12, 28);
  const links = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mats.chain);
    m.scale.set(1, 1.55, 1);
    m.position.y = i * LINK_GAP;
    m.userData.base = i % 2 === 0 ? Math.PI / 2 : 0;
    m.rotation.y = m.userData.base;
    group.add(m);
    links.push(m);
  }
  // twist = the anchor's turn, fading out over the lowest links
  const twist = (t) => links.forEach((m, i) => (m.rotation.y = m.userData.base + t * Math.max(0, 1 - i / 6)));
  return { group, links, twist };
}

// A flat panel whose face is a canvas. draw(fn, key) repaints only when key changes.
export function buildPanel(THREE, w, h, px = 640) {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = Math.round((px * h) / w);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  let last;
  return {
    mesh, canvas, material,
    draw(fn, key) {
      if (key !== undefined && key === last) return;
      last = key;
      const g = canvas.getContext("2d");
      g.clearRect(0, 0, canvas.width, canvas.height);
      fn(g, canvas.width, canvas.height);
      tex.needsUpdate = true;
    },
  };
}

export const EDGE = { idle: PALETTE.brass, pending: PALETTE.slateLight, refused: PALETTE.refused, verified: PALETTE.verified };

export function glassCard(g, W, H, edge = EDGE.idle, { dashed = false, lw = 4, fill = "rgba(19,38,59,.86)" } = {}) {
  const r = Math.min(16, H * 0.08), x = lw, y = lw, w = W - 2 * lw, h = H - 2 * lw;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fillStyle = fill;
  g.strokeStyle = edge;
  g.lineWidth = lw;
  g.setLineDash(dashed ? [14, 10] : []);
  g.fill();
  g.stroke();
  g.setLineDash([]);
}

export function text(g, str, x, y, { size = 30, weight = 500, color = PALETTE.paper, font = MONO, align = "left" } = {}) {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.fillText(str, x, y);
}

// Evidence tag on the chain: KIND, value, optional note. state: idle | pending | refused | verified
export function buildTag(THREE, kind, value, w = 2.3) {
  const p = buildPanel(THREE, w, (w * 180) / 640);
  const setState = (state = "idle", note = "") =>
    p.draw((g, W, H) => {
      const edge = EDGE[state];
      glassCard(g, W, H, edge, { dashed: state === "pending", lw: state === "idle" ? 3 : 5 });
      text(g, kind, 28, 48, { size: 26, color: edge });
      text(g, value, 28, 98, { size: 34 });
      if (note) text(g, note, 28, 146, { size: 25, weight: 400, color: state === "refused" ? PALETTE.refused : PALETTE.verified });
    }, state + note);
  setState();
  return { ...p, setState };
}

// One line of text on a transparent plane, `height` world units tall.
export function buildLabel(THREE, str, height = 0.3, { color = PALETTE.slateLight, weight = 500, font = MONO } = {}) {
  const size = 64, g0 = document.createElement("canvas").getContext("2d");
  g0.font = `${weight} ${size}px ${font}`;
  const pw = Math.ceil(g0.measureText(str).width) + 24, ph = size + 28;
  const p = buildPanel(THREE, (height * pw) / ph, height, pw);
  p.draw((g, W, H) => text(g, str, 12, H / 2 + size * 0.35, { size, weight, color, font }));
  return p;
}
