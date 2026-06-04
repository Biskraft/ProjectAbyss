// ECHORIS HUD Layout Tool — local save server.
//
//   node tools/hud-tool/server.mjs        (or: npm run hud-tool)
//   open http://localhost:4330
//
// Serves the editor, exposes the element manifest (parsed from the TS SSoT),
// reads/writes game/public/data/hud_layout.json. Saving writes the repo file
// directly; Vite's dev server picks it up so a game reload shows the new HUD.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR     = path.resolve(__dirname, '..', '..');
const HTML_FILE    = path.join(__dirname, 'hud-tool.html');
const LAYOUT_FILE  = path.join(GAME_DIR, 'public', 'data', 'hud_layout.json');
const MANIFEST_TS  = path.join(GAME_DIR, 'src', 'ui', 'hud', 'hudLayout.ts');
const ATLAS_JSON   = path.join(GAME_DIR, 'public', 'assets', 'ui', 'ui_hud_01_atlas.json');
const ATLAS_PNG    = path.join(GAME_DIR, 'public', 'assets', 'ui', 'ui_hud_01_atlas.png');
const PORT = 4330;

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };

/** Read the UISkin atlas → { atlasW, atlasH, slices: { name: {x,y,w,h} } }. */
function readAtlas() {
  try {
    const j = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf-8'));
    const slices = {};
    for (const s of (j.meta?.slices ?? [])) {
      const k = s.keys.find((x) => x.frame === 0) ?? s.keys[0];
      if (k) slices[s.name] = k.bounds;
    }
    return { atlasW: j.meta?.size?.w ?? 640, atlasH: j.meta?.size?.h ?? 360, slices };
  } catch {
    return { atlasW: 640, atlasH: 360, slices: {} };
  }
}

/** Parse the HUD_ELEMENTS array out of the TS manifest (SSoT, no duplication). */
function readManifest() {
  const src = fs.readFileSync(MANIFEST_TS, 'utf-8');
  const block = src.match(/HUD_ELEMENTS[^=]*=\s*\[([\s\S]*?)\]\s*as const/);
  const elements = [];
  if (block) {
    const re = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*group:\s*'([^']+)',\s*kind:\s*'([^']+)',\s*x:\s*(-?\d+),\s*y:\s*(-?\d+),\s*w:\s*(-?\d+),\s*h:\s*(-?\d+)\s*\}/g;
    let m;
    while ((m = re.exec(block[1])) !== null) {
      elements.push({
        id: m[1], label: m[2], group: m[3], kind: m[4],
        x: +m[5], y: +m[6], w: +m[7], h: +m[8],
      });
    }
  }
  return { baseW: 640, baseH: 360, elements };
}

function readLayout() {
  try {
    return JSON.parse(fs.readFileSync(LAYOUT_FILE, 'utf-8'));
  } catch {
    return { version: 1, elements: {} };
  }
}

function send(res, code, type, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, MIME['.json'], '');

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    return send(res, 200, MIME['.html'], fs.readFileSync(HTML_FILE));
  }
  if (req.method === 'GET' && req.url === '/api/manifest') {
    try {
      return send(res, 200, MIME['.json'], JSON.stringify({ ...readManifest(), ...readAtlas() }));
    } catch (e) {
      return send(res, 500, MIME['.json'], JSON.stringify({ error: String(e) }));
    }
  }
  if (req.method === 'GET' && req.url === '/atlas.png') {
    try {
      return send(res, 200, MIME['.png'], fs.readFileSync(ATLAS_PNG));
    } catch (e) {
      return send(res, 404, MIME['.json'], JSON.stringify({ error: String(e) }));
    }
  }
  if (req.method === 'GET' && req.url === '/api/layout') {
    return send(res, 200, MIME['.json'], JSON.stringify(readLayout()));
  }
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object' || typeof data.elements !== 'object') {
          throw new Error('payload must be { version, elements }');
        }
        fs.writeFileSync(LAYOUT_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        const n = Object.keys(data.elements).length;
        console.log(`[save] hud_layout.json — ${n} override(s)`);
        send(res, 200, MIME['.json'], JSON.stringify({ ok: true, count: n }));
      } catch (e) {
        send(res, 400, MIME['.json'], JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }
  send(res, 404, MIME['.json'], JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`ECHORIS HUD Tool → http://localhost:${PORT}`);
  console.log(`  manifest: ${path.relative(GAME_DIR, MANIFEST_TS)}`);
  console.log(`  writes:   ${path.relative(GAME_DIR, LAYOUT_FILE)}`);
});
