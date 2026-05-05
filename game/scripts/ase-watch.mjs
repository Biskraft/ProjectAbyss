import { watch, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, parse } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WATCH = join(ROOT, 'public', 'assets');
const ASEPRITE = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\aseprite.exe';
const DEBOUNCE_MS = 500;
const DEBUG = process.env.ASE_WATCH_DEBUG === '1';

const pending = new Map();

const isAse = (p) => /\.ase(prite)?$/i.test(p);

function exportAse(absPath) {
  const { dir, name } = parse(absPath);
  const sheet = join(dir, `${name}_atlas.png`);
  const data = join(dir, `${name}_atlas.json`);
  const args = [
    '-b', absPath,
    '--sheet', sheet,
    '--data', data,
    '--format', 'json-array',
    '--sheet-type', 'horizontal',
    '--split-slices',
    '--list-slices',
  ];
  const rel = relative(ROOT, absPath).replace(/\\/g, '/');
  console.log(`[ase-watch] ${new Date().toLocaleTimeString()} export ${rel}`);
  const p = spawn(ASEPRITE, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  p.stderr.on('data', (d) => { stderr += d.toString(); });
  p.on('error', (e) => console.error(`  [ERR] spawn failed: ${e.message}`));
  p.on('exit', (code) => {
    if (code === 0) {
      console.log(`  [OK] -> ${name}_atlas.png + ${name}_atlas.json`);
    } else {
      console.error(`  [FAIL] exit=${code}`);
      const filtered = stderr
        .split(/\r?\n/)
        .filter((line) => line && !line.includes('pixellab'))
        .join('\n');
      if (filtered) console.error(filtered);
    }
  });
}

function schedule(absPath) {
  const prev = pending.get(absPath);
  if (prev) clearTimeout(prev);
  pending.set(
    absPath,
    setTimeout(() => {
      pending.delete(absPath);
      if (existsSync(absPath)) exportAse(absPath);
    }, DEBOUNCE_MS),
  );
}

if (!existsSync(WATCH)) {
  console.error(`[ase-watch] watch root missing: ${WATCH}`);
  process.exit(1);
}

console.log(`[ase-watch] watching ${WATCH} (recursive, debounce ${DEBOUNCE_MS}ms)`);
console.log('[ase-watch] convention: {basename}.ase -> {basename}_atlas.png + {basename}_atlas.json');
console.log(`[ase-watch] sheet-type: horizontal${DEBUG ? ' | DEBUG=on' : ''} | Ctrl+C to stop`);

watch(WATCH, { recursive: true }, (event, filename) => {
  if (DEBUG) {
    const fn = filename ?? '<null>';
    const abs = filename ? join(WATCH, filename) : '<n/a>';
    const exists = filename ? existsSync(abs) : false;
    console.log(`[debug] ${new Date().toLocaleTimeString()} event=${event} filename="${fn}" isAse=${isAse(fn)} exists=${exists}`);
  }
  if (!filename) return;
  if (!isAse(filename)) return;
  const abs = join(WATCH, filename);
  if (!existsSync(abs)) return;
  schedule(abs);
});
