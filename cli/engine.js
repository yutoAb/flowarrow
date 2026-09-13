// Drawing engines ported from the FlowArrow web tools (index.html, spinner.html,
// highlight.html). Pure canvas-2D logic: every function draws one frame of a
// seamless loop onto `c` given the loop fraction u in [0,1).

// ---------------- flowing arrow (logical canvas 900x470) ----------------
export const ARROW_W = 900, ARROW_H = 470;

export const ARROW_PRESETS = {
  straight: [[80, 235], [820, 235]],
  hook: [[820, 120], [470, 110], [420, 360], [110, 330]],
  m: [[820, 330], [650, 120], [460, 350], [270, 120], [100, 330]],
  s: [[100, 360], [330, 120], [570, 360], [810, 120]],
};

export const ARROW_DEFAULTS = {
  mode: 'flow', style: 'dash', color: '#5f6368', thick: 20, space: 86,
  head: true, matte: '#ffffff', frames: 24, fps: 14,
};

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const c = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

export function buildPath(points) {
  if (points.length < 2) return null;
  const fine = []; const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0], p1 = points[i], p2 = points[i + 1], p3 = i + 2 < n ? points[i + 2] : points[n - 1];
    const seg = Math.max(12, Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4 | 0);
    for (let k = 0; k < seg; k++) fine.push(catmull(p0, p1, p2, p3, k / seg));
  }
  fine.push(points[n - 1]);
  const cum = [0];
  for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  return { fine, cum, total: cum[cum.length - 1] };
}

function at(P, s) {
  s = Math.max(0, Math.min(P.total, s));
  let lo = 1, hi = P.cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (P.cum[m] < s) lo = m + 1; else hi = m; }
  const i = lo, s0 = P.cum[i - 1], s1 = P.cum[i], f = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  const x = P.fine[i - 1][0] + (P.fine[i][0] - P.fine[i - 1][0]) * f;
  const y = P.fine[i - 1][1] + (P.fine[i][1] - P.fine[i - 1][1]) * f;
  const j = Math.min(P.fine.length - 1, i + 1);
  const ang = Math.atan2(P.fine[j][1] - P.fine[i - 1][1], P.fine[j][0] - P.fine[i - 1][0]);
  return { x, y, ang };
}

function strokePoly(c, P, s0, s1) {
  c.beginPath(); let first = true;
  for (let s = s0; s < s1; s += 7) { const q = at(P, s); if (first) { c.moveTo(q.x, q.y); first = false; } else c.lineTo(q.x, q.y); }
  const e = at(P, s1); c.lineTo(e.x, e.y); c.stroke();
}

function chevron(c, x, y, ang, size) {
  const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy, ny = fx;
  c.beginPath();
  c.moveTo(x - fx * size + nx * size, y - fy * size + ny * size);
  c.lineTo(x + fx * size, y + fy * size);
  c.lineTo(x - fx * size - nx * size, y - fy * size - ny * size);
  c.stroke();
}

function drawBody(c, S, P, bodyEnd, phasePx) {
  if (bodyEnd <= 0) return;
  c.strokeStyle = S.color; c.fillStyle = S.color; c.lineWidth = S.thick; c.lineCap = 'round'; c.lineJoin = 'round';
  const period = S.space;
  if (period < 1) { strokePoly(c, P, 0, bodyEnd); return; }   // spacing 0 = solid line
  const dashLen = Math.max(4, period * 0.52);
  let s = (phasePx % period) - period;
  while (s < bodyEnd) {
    if (S.style === 'chevron') { if (s >= 0 && s < bodyEnd) { const q = at(P, s); chevron(c, q.x, q.y, q.ang, S.thick * 1.05); } }
    else { const a = Math.max(0, s), b = Math.min(s + dashLen, bodyEnd); if (b > a) strokePoly(c, P, a, b); }
    s += period;
  }
}

function drawHead(c, S, P, sPos) {
  c.strokeStyle = S.color; c.lineWidth = S.thick; c.lineCap = 'round'; c.lineJoin = 'round';
  const head = S.thick * 2.4, e = at(P, sPos), ha = 38 * Math.PI / 180;
  for (const sgn of [1, -1]) {
    const ax = e.x - head * Math.cos(e.ang + sgn * ha), ay = e.y - head * Math.sin(e.ang + sgn * ha);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(e.x, e.y); c.stroke();
  }
}

const HOLD = 0.18;
function smooth(p) { return p * p * (3 - 2 * p); }

// u in [0,1) is the loop fraction; S = arrow settings; P = buildPath(points)
export function drawArrowScene(c, S, P, u) {
  if (!P) return;
  const head = S.head ? S.thick * 2.4 : 0;
  if (S.mode === 'draw') {
    const p = u < (1 - HOLD) ? u / (1 - HOLD) : 1;   // grow, then hold full before looping
    const reveal = smooth(p) * P.total;
    drawBody(c, S, P, reveal - head * 0.7, 0);
    if (S.head && reveal > head * 0.7) drawHead(c, S, P, reveal);
  } else {
    drawBody(c, S, P, P.total - head * 0.7, u * S.space);  // marching flow (one period per loop)
    if (S.head) drawHead(c, S, P, P.total);
  }
}

// ---------------- loading spinner (logical canvas 300x300) ----------------
export const SPINNER_L = 300;

export const SPINNER_DEFAULTS = { style: 'arc', color: '#4f8cff', thick: 22, cycle: 1.2, matte: '#ffffff', size: 160 };

export function drawSpinner(c, S, u) {
  const L = SPINNER_L, cx = L / 2, cy = L / 2, R = L * 0.34;
  c.lineCap = 'round';
  if (S.style === 'arc') {
    c.strokeStyle = S.color; c.lineWidth = S.thick;
    c.beginPath();
    c.arc(cx, cy, R, u * 2 * Math.PI, u * 2 * Math.PI + 1.5 * Math.PI);
    c.stroke();
  } else if (S.style === 'dots') {
    const n = 12, r = S.thick * 0.5;
    c.fillStyle = S.color;
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI - Math.PI / 2;
      const phase = (((u - i / n) % 1) + 1) % 1;   // 0 = just passed = brightest
      c.globalAlpha = 0.15 + 0.85 * (1 - phase);
      c.beginPath();
      c.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), r, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
  } else { // bars
    const n = 12;
    c.strokeStyle = S.color; c.lineWidth = Math.max(4, S.thick * 0.55);
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI - Math.PI / 2;
      const phase = (((u - i / n) % 1) + 1) % 1;
      c.globalAlpha = 0.15 + 0.85 * (1 - phase);
      c.beginPath();
      c.moveTo(cx + R * 0.55 * Math.cos(a), cy + R * 0.55 * Math.sin(a));
      c.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

// ---------------- highlight strokes (logical canvas 600x300) ----------------
export const HI_W = 600, HI_H = 300;

export const HIGHLIGHT_DEFAULTS = { style: 'circle', color: '#e5484d', thick: 10, cycle: 2, matte: '#ffffff', width: 600, height: 300 };

const DRAW = 0.45;              // fraction of the loop spent drawing; rest holds still
function ease(p) { return p * p * (3 - 2 * p); }

export function drawHighlight(c, S, u) {
  const W = HI_W, H = HI_H;
  const t = ease(Math.min(1, u / DRAW));
  if (t <= 0) return;
  c.strokeStyle = S.color; c.lineWidth = S.thick; c.lineCap = 'round'; c.lineJoin = 'round';
  if (S.style === 'circle') {
    const cx = W / 2, cy = H / 2;
    const rx = W / 2 - S.thick - 10, ry = H / 2 - S.thick - 10;
    const start = -Math.PI * 0.75, total = 2.3 * Math.PI;   // over-rotate like a real pen stroke
    const steps = 140;
    c.beginPath();
    for (let i = 0; i <= Math.round(steps * t); i++) {
      const a = start + total * (i / steps);
      const wob = Math.sin(a * 3 + 0.8) * (2 + S.thick * 0.18); // hand-drawn wobble
      const x = cx + (rx + wob) * Math.cos(a);
      const y = cy + (ry + wob * 0.6) * Math.sin(a);
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
  } else if (S.style === 'underline') {
    const y = H * 0.78, x0 = 12 + S.thick / 2, x1 = W - 12 - S.thick / 2;
    const steps = 90;
    c.beginPath();
    for (let i = 0; i <= Math.round(steps * t); i++) {
      const f = i / steps;
      const x = x0 + (x1 - x0) * f;
      const yy = y + Math.sin(f * 9 + 0.5) * 2.5;             // slight hand wobble
      i === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
    }
    c.stroke();
  } else { // marker
    const y = H * 0.52, x0 = 10, x1 = x0 + (W - 20) * t;
    c.globalAlpha = 0.45; c.lineCap = 'butt';
    c.lineWidth = H * 0.52;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(Math.max(x0 + 1, x1), y); c.stroke();
    c.globalAlpha = 1;
  }
}
