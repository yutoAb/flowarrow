#!/usr/bin/env node
// flowarrow CLI: generate slide-ready transparent animation GIFs, or run the
// MCP server (`flowarrow mcp`) so AI agents can generate them via tools.
import { resolve } from 'node:path';
import { renderToFile } from './render.js';

const HELP = `flowarrow — flowing-arrow / spinner / highlight GIF generator (https://flow-arrow.com/)

Usage:
  flowarrow arrow     [options]   flowing arrow GIF (default command)
  flowarrow spinner   [options]   loading spinner GIF
  flowarrow highlight [options]   hand-drawn emphasis GIF (circle/underline/marker)
  flowarrow mcp                   run as an MCP server (stdio)

Common options:
  --out <file>        output path (default: ./<kind>.gif)
  --color <#hex>      stroke color
  --matte <#hex>      background color that becomes transparent (default #ffffff);
                      match it to the slide background so edges blend
  --thick <px>        stroke thickness

arrow options:
  --preset <name>     straight | hook | m | s  (default m)
  --points "x,y x,y"  custom path in 900x470 logical coords (overrides preset)
  --mode <name>       flow (marching dashes) | draw (line draws itself)
  --style <name>      dash | chevron
  --space <px>        dash spacing, 0 = solid (default 86)
  --no-head           no arrowhead
  --width/--height    output size (default 900x470)
  --frames/--fps      frames per loop / playback fps (default 24 / 14)

spinner options:
  --style <name>      arc | dots | bars
  --cycle <sec>       seconds per rotation (default 1.2)
  --size <px>         square output size (default 160)

highlight options:
  --style <name>      circle | underline | marker
  --cycle <sec>       seconds per loop (default 2)
  --width/--height    output size (default 600x300)

Examples:
  npx flowarrow --preset m --color "#5f6368" --out arrow.gif
  npx flowarrow spinner --style dots --color "#4f8cff" --size 200
  npx flowarrow highlight --style circle --color "#e5484d" --width 800 --height 400
`;

function parseArgs(argv) {
  const opts = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--no-head') { opts.head = false; }
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) { opts[key] = true; }
      else { opts[key] = val; i++; }
    } else pos.push(a);
  }
  return { opts, pos };
}

function parsePoints(str) {
  const pts = String(str).trim().split(/\s+/).map(pair => pair.split(',').map(Number));
  if (pts.some(p => p.length !== 2 || p.some(Number.isNaN))) {
    throw new Error('bad --points; expected "x,y x,y ..." e.g. "80,235 820,235"');
  }
  return pts;
}

const num = v => (v === undefined ? undefined : +v);

async function main() {
  const argv = process.argv.slice(2);
  const kinds = ['arrow', 'spinner', 'highlight'];
  let kind = 'arrow';
  let rest = argv;
  if (argv[0] === 'mcp') {
    const { runMcpServer } = await import('./mcp.js');
    await runMcpServer();
    return;
  }
  if (kinds.includes(argv[0])) { kind = argv[0]; rest = argv.slice(1); }
  const { opts } = parseArgs(rest);
  if (opts.help || argv[0] === 'help') { process.stdout.write(HELP); return; }

  const common = { color: opts.color, matte: opts.matte, thick: num(opts.thick), style: opts.style };
  let settings;
  if (kind === 'arrow') {
    settings = {
      ...common, preset: opts.preset, mode: opts.mode,
      space: num(opts.space), head: opts.head !== false,
      width: num(opts.width), height: num(opts.height),
      frames: num(opts.frames) ?? 24, fps: num(opts.fps) ?? 14,
      points: opts.points ? parsePoints(opts.points) : undefined,
    };
  } else if (kind === 'spinner') {
    settings = { ...common, cycle: num(opts.cycle), size: num(opts.size) };
  } else {
    settings = { ...common, cycle: num(opts.cycle), width: num(opts.width), height: num(opts.height) };
  }
  for (const k of Object.keys(settings)) if (settings[k] === undefined) delete settings[k];

  const out = resolve(opts.out || `${kind === 'arrow' ? 'flow-arrow' : kind}.gif`);
  const { path, bytes } = renderToFile(kind, settings, out);
  process.stdout.write(`wrote ${path} (${(bytes / 1024).toFixed(1)} kB)\n`);
}

main().catch(err => { process.stderr.write(`error: ${err.message}\n`); process.exit(1); });
