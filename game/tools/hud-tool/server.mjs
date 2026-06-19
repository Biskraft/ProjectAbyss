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
const ATTACK_HTML_FILE = path.join(__dirname, 'attack-timeline-tool.html');
const LAYOUT_FILE  = path.join(GAME_DIR, 'public', 'data', 'hud_layout.json');
const MANIFEST_TS  = path.join(GAME_DIR, 'src', 'ui', 'hud', 'hudLayout.ts');
const ATLAS_JSON   = path.join(GAME_DIR, 'public', 'assets', 'ui', 'ui_hud_01_atlas.json');
const ATLAS_PNG    = path.join(GAME_DIR, 'public', 'assets', 'ui', 'ui_hud_01_atlas.png');
const ERDA_ATLAS_JSON = path.join(GAME_DIR, 'public', 'assets', 'characters', 'erda_atlas.json');
const ERDA_ATLAS_PNG = path.join(GAME_DIR, 'public', 'assets', 'characters', 'erda_atlas.png');
const FX_SLASH_PNG = path.join(GAME_DIR, 'public', 'assets', 'sprites', 'fx_slash_02_atlas.png');
const ATTACK_TIMELINE_CSV = path.resolve(GAME_DIR, '..', 'Sheets', 'Content_PlayerAttackTimeline.csv');
const FX_WEAPON_TYPE_CSV = path.resolve(GAME_DIR, '..', 'Sheets', 'Content_FX_WeaponType.csv');
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

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function readAttackTimelineCsv() {
  return readCsvFile(ATTACK_TIMELINE_CSV);
}

function readCsvFile(file) {
  const text = fs.readFileSync(file, 'utf-8').trim();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map((x) => x.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function writeAttackTimelineCsv(headers, rows) {
  writeCsvFile(ATTACK_TIMELINE_CSV, headers, rows);
}

function writeCsvFile(file, headers, rows) {
  const body = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ].join('\n') + '\n';
  fs.writeFileSync(file, body, 'utf-8');
}

function readErdaAttackAtlas() {
  const j = JSON.parse(fs.readFileSync(ERDA_ATLAS_JSON, 'utf-8'));
  const frameDurations = (Array.isArray(j.frames) ? j.frames : Object.values(j.frames ?? {}))
    .map((frame) => Number(frame?.duration) || 0);
  const tags = {};
  for (const tag of j.meta?.frameTags ?? []) {
    const from = Number(tag.from);
    const to = Number(tag.to);
    if (!tag.name || !Number.isFinite(from) || !Number.isFinite(to)) continue;
    const durations = frameDurations.slice(from, to + 1);
    tags[tag.name] = {
      name: tag.name,
      from,
      to,
      count: Math.max(0, to - from + 1),
      durations,
      totalMs: durations.reduce((a, b) => a + b, 0),
    };
  }
  return {
    frameW: 48,
    frameH: 48,
    imageW: Number(j.meta?.size?.w) || 0,
    imageH: Number(j.meta?.size?.h) || 0,
    tags,
  };
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
  if (req.method === 'GET' && req.url === '/attack.html') {
    return send(res, 200, MIME['.html'], fs.readFileSync(ATTACK_HTML_FILE));
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
  if (req.method === 'GET' && req.url === '/erda_atlas.png') {
    try {
      return send(res, 200, MIME['.png'], fs.readFileSync(ERDA_ATLAS_PNG));
    } catch (e) {
      return send(res, 404, MIME['.json'], JSON.stringify({ error: String(e) }));
    }
  }
  if (req.method === 'GET' && req.url === '/fx_slash_02_atlas.png') {
    try {
      return send(res, 200, MIME['.png'], fs.readFileSync(FX_SLASH_PNG));
    } catch (e) {
      return send(res, 404, MIME['.json'], JSON.stringify({ error: String(e) }));
    }
  }
  if (req.method === 'GET' && req.url === '/api/layout') {
    return send(res, 200, MIME['.json'], JSON.stringify(readLayout()));
  }
  if (req.method === 'GET' && req.url === '/api/attack-timeline') {
    try {
      return send(res, 200, MIME['.json'], JSON.stringify({
        ...readAttackTimelineCsv(),
        atlas: readErdaAttackAtlas(),
        fx: readCsvFile(FX_WEAPON_TYPE_CSV),
      }));
    } catch (e) {
      return send(res, 500, MIME['.json'], JSON.stringify({ ok: false, error: String(e) }));
    }
  }
  if (req.method === 'POST' && req.url === '/api/attack-timeline/save') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!Array.isArray(data.headers) || !Array.isArray(data.rows)) {
          throw new Error('payload must be { headers, rows }');
        }
        writeAttackTimelineCsv(data.headers, data.rows);
        console.log(`[save] Content_PlayerAttackTimeline.csv ${data.rows.length} row(s)`);
        send(res, 200, MIME['.json'], JSON.stringify({ ok: true, count: data.rows.length }));
      } catch (e) {
        send(res, 400, MIME['.json'], JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/fx-weapon-type/save') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!Array.isArray(data.headers) || !Array.isArray(data.rows)) {
          throw new Error('payload must be { headers, rows }');
        }
        writeCsvFile(FX_WEAPON_TYPE_CSV, data.headers, data.rows);
        console.log(`[save] Content_FX_WeaponType.csv ${data.rows.length} row(s)`);
        send(res, 200, MIME['.json'], JSON.stringify({ ok: true, count: data.rows.length }));
      } catch (e) {
        send(res, 400, MIME['.json'], JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
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
