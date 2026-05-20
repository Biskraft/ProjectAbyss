// One-off: render ui_title_01.svg → 2048px PNG via Puppeteer.
// Usage: node game/scripts/svg2png.mjs
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../public/assets/ui/ui_title_01.svg');
const DST = path.resolve(__dirname, '../public/assets/ui/ui_title_01_2048.png');
const TARGET_W = 2048;

let svg = fs.readFileSync(SRC, 'utf8');
const srcW = parseInt(svg.match(/width="(\d+)"/)[1]);
const srcH = parseInt(svg.match(/height="(\d+)"/)[1]);
const targetH = Math.round((TARGET_W / srcW) * srcH);
console.log(`SVG ${srcW}x${srcH} -> PNG ${TARGET_W}x${targetH}`);

// Inject viewBox if missing — without it, paths stay in native 640×289 coords
// even when CSS scales the element. With viewBox, the SVG content scales properly.
if (!/viewBox=/.test(svg)) {
  svg = svg.replace(
    /<svg([^>]*)>/,
    `<svg$1 viewBox="0 0 ${srcW} ${srcH}" preserveAspectRatio="xMidYMid meet">`,
  );
}
// Replace native width/height with target size so the SVG renders full-frame.
svg = svg
  .replace(/width="\d+"/,  `width="${TARGET_W}"`)
  .replace(/height="\d+"/, `height="${targetH}"`);

const html = `<!DOCTYPE html><html><head><style>
  *{margin:0;padding:0}html,body{background:transparent}
  svg{display:block;width:${TARGET_W}px;height:${targetH}px}
</style></head><body>${svg}</body></html>`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: TARGET_W, height: targetH, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({
  path: DST,
  omitBackground: true,
  type: 'png',
  clip: { x: 0, y: 0, width: TARGET_W, height: targetH },
});
await browser.close();

const stat = fs.statSync(DST);
console.log(`Saved: ${DST}`);
console.log(`File size: ${(stat.size / 1024).toFixed(1)} KB`);
