// MCP server exposing the three FlowArrow generators as tools, so AI agents
// can produce slide-ready transparent GIFs directly. Runs over stdio:
//   npx flowarrow mcp
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve } from 'node:path';
import { renderToFile } from './render.js';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'hex color like #5f6368');

function result(kind, settings, outPath) {
  const { path, bytes } = renderToFile(kind, settings, resolve(outPath));
  return {
    content: [{
      type: 'text',
      text: `Wrote ${path} (${(bytes / 1024).toFixed(1)} kB). Transparent GIF; the matte color ${settings.matte || '#ffffff'} is transparent — insert it as an image into Google Slides / PowerPoint / Notion and it loops automatically.`,
    }],
  };
}

export async function runMcpServer() {
  const server = new McpServer({ name: 'flowarrow', version: '0.1.0' });

  server.tool(
    'create_flow_arrow',
    'Create a flowing-arrow animation GIF (transparent background) for slides. The arrow follows a smooth path through the given points; dashes or chevrons flow along it, or the line draws itself.',
    {
      out_path: z.string().default('flow-arrow.gif').describe('Output .gif path'),
      points: z.array(z.tuple([z.number(), z.number()])).min(2).optional()
        .describe('Path points in a 900x470 logical canvas, start to end (arrowhead at the last point). 3+ points make a smooth curve. Omit to use a preset.'),
      preset: z.enum(['straight', 'hook', 'm', 's']).default('m').describe('Path preset used when points are omitted'),
      mode: z.enum(['flow', 'draw']).default('flow').describe('flow = dashes march along the path; draw = the line draws itself then holds'),
      style: z.enum(['dash', 'chevron']).default('dash').describe('Dash segments or chevron (≫) marks'),
      color: hex.default('#5f6368'),
      thick: z.number().min(4).max(60).default(20).describe('Stroke thickness px (logical)'),
      space: z.number().min(0).max(180).default(86).describe('Dash spacing px; 0 = solid line'),
      head: z.boolean().default(true).describe('Draw an arrowhead at the end'),
      matte: hex.default('#ffffff').describe('Background color that becomes transparent; match the slide background so anti-aliased edges blend'),
      width: z.number().int().min(40).max(2000).default(900),
      height: z.number().int().min(40).max(2000).default(470),
      frames: z.number().int().min(4).max(120).default(24).describe('Frames per loop'),
      fps: z.number().int().min(2).max(50).default(14),
    },
    async (a) => result('arrow', a, a.out_path)
  );

  server.tool(
    'create_spinner',
    'Create a loading-spinner animation GIF (transparent background): rotating arc, fading dots, or fading bars. For mockups and "processing" states in slides/demos.',
    {
      out_path: z.string().default('spinner.gif').describe('Output .gif path'),
      style: z.enum(['arc', 'dots', 'bars']).default('arc'),
      color: hex.default('#4f8cff'),
      thick: z.number().min(6).max(44).default(22).describe('Stroke/dot thickness (logical 300x300 canvas)'),
      cycle: z.number().min(0.5).max(3).default(1.2).describe('Seconds per rotation'),
      matte: hex.default('#ffffff').describe('Background color that becomes transparent'),
      size: z.number().int().min(32).max(600).default(160).describe('Square output size px'),
    },
    async (a) => result('spinner', a, a.out_path)
  );

  server.tool(
    'create_highlight',
    'Create a hand-drawn emphasis animation GIF (transparent background): a red-pen circle drawing itself around content, a wobbly underline, or a marker sweep. Overlay it on slide text to draw attention. The GIF contains only the stroke, no text.',
    {
      out_path: z.string().default('highlight.gif').describe('Output .gif path'),
      style: z.enum(['circle', 'underline', 'marker']).default('circle'),
      color: hex.default('#e5484d').describe('Stroke color; markers usually look best in yellow like #f5d90a'),
      thick: z.number().min(4).max(30).default(10).describe('Stroke thickness (logical 600x300 canvas; ignored by marker)'),
      cycle: z.number().min(1).max(4).default(2).describe('Seconds per loop (draw then hold)'),
      matte: hex.default('#ffffff').describe('Background color that becomes transparent'),
      width: z.number().int().min(60).max(2000).default(600).describe('Output width px; size it to what it should encircle'),
      height: z.number().int().min(30).max(2000).default(300),
    },
    async (a) => result('highlight', a, a.out_path)
  );

  await server.connect(new StdioServerTransport());
}
