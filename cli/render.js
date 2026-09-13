// Headless GIF rendering: node-canvas frames -> gifenc, with the matte color
// mapped to the GIF's transparent index (same behavior as the web tools).
import { createCanvas } from 'canvas';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFileSync } from 'node:fs';
import {
  ARROW_W, ARROW_H, ARROW_PRESETS, ARROW_DEFAULTS, buildPath, drawArrowScene,
  SPINNER_L, SPINNER_DEFAULTS, drawSpinner,
  HI_W, HI_H, HIGHLIGHT_DEFAULTS, drawHighlight,
} from './engine.js';

function hexRgb(h) {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function matteIndex(palette, matte) {
  const [mr, mg, mb] = hexRgb(matte);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = palette[i];
    const d = (r - mr) ** 2 + (g - mg) ** 2 + (b - mb) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// draw(ctx, u) paints one loop-frame in logical coords; the canvas transform
// already maps logical -> output pixels.
function encodeGif({ outW, outH, logicalW, logicalH, frames, fps, matte, draw }) {
  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (let f = 0; f < frames; f++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = matte; ctx.fillRect(0, 0, outW, outH);
    ctx.setTransform(outW / logicalW, 0, 0, outH / logicalH, 0, 0);
    draw(ctx, f / frames);
    const { data } = ctx.getImageData(0, 0, outW, outH);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, outW, outH, {
      palette, delay, repeat: 0, dispose: 2,
      transparent: true, transparentIndex: matteIndex(palette, matte),
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function renderArrow(opts = {}) {
  const S = { ...ARROW_DEFAULTS, ...opts };
  const pts = S.points && S.points.length >= 2 ? S.points : ARROW_PRESETS[S.preset || 'm'];
  if (!pts) throw new Error(`unknown preset "${S.preset}" (use straight|hook|m|s or pass points)`);
  const P = buildPath(pts.map(p => [+p[0], +p[1]]));
  if (!P) throw new Error('need at least 2 points');
  const outW = clamp(Math.round(S.width || ARROW_W), 40, 2000);
  const outH = clamp(Math.round(S.height || ARROW_H), 40, 2000);
  const frames = clamp(Math.round(S.frames), 4, 120);
  const fps = clamp(Math.round(S.fps), 2, 50);
  return encodeGif({
    outW, outH, logicalW: ARROW_W, logicalH: ARROW_H, frames, fps, matte: S.matte,
    draw: (c, u) => drawArrowScene(c, S, P, u),
  });
}

export function renderSpinner(opts = {}) {
  const S = { ...SPINNER_DEFAULTS, ...opts };
  const size = clamp(Math.round(S.size), 32, 600);
  const fps = 20, frames = clamp(Math.round(S.cycle * fps), 8, 60);
  return encodeGif({
    outW: size, outH: size, logicalW: SPINNER_L, logicalH: SPINNER_L, frames, fps, matte: S.matte,
    draw: (c, u) => drawSpinner(c, S, u),
  });
}

export function renderHighlight(opts = {}) {
  const S = { ...HIGHLIGHT_DEFAULTS, ...opts };
  const outW = clamp(Math.round(S.width), 60, 2000);
  const outH = clamp(Math.round(S.height), 30, 2000);
  const fps = 20, frames = clamp(Math.round(S.cycle * fps), 12, 80);
  return encodeGif({
    outW, outH, logicalW: HI_W, logicalH: HI_H, frames, fps, matte: S.matte,
    draw: (c, u) => drawHighlight(c, S, u),
  });
}

export function renderToFile(kind, opts, outPath) {
  const buf = kind === 'spinner' ? renderSpinner(opts)
    : kind === 'highlight' ? renderHighlight(opts)
    : renderArrow(opts);
  writeFileSync(outPath, buf);
  return { path: outPath, bytes: buf.length };
}
