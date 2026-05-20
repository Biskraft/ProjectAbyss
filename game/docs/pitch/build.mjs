// Generate PDFs from index.html (pitch deck) and one-pager.html.
// Usage: node game/docs/pitch/build.mjs
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, 'dist');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
try {
  // PDF is vector-native — deviceScaleFactor=1 keeps text crisp without bloating raster ops.
  // ---- Pitch Deck (1920x1080 landscape) — EN + KO ----
  for (const { src, out } of [
    { src: 'index.html',    out: 'ECHORIS_PitchDeck_EN_v1.pdf' },
    { src: 'index_ko.html', out: 'ECHORIS_PitchDeck_KO_v1.pdf' },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    const url = 'file:///' + path.resolve(__dirname, src).replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.evaluateHandle('document.fonts.ready');
    const outPath = path.join(outDir, out);
    await page.pdf({
      path: outPath,
      width: '1920px',
      height: '1080px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });
    console.log('[pdf] pitch deck →', outPath);
    await page.close();
  }
  // ---- One-Pager (A4 portrait) — EN + KO ----
  for (const { src, out } of [
    { src: 'one-pager.html',    out: 'ECHORIS_OnePager_EN_v1.pdf' },
    { src: 'one-pager_ko.html', out: 'ECHORIS_OnePager_KO_v1.pdf' },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    const url = 'file:///' + path.resolve(__dirname, src).replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.evaluateHandle('document.fonts.ready');
    const outPath = path.join(outDir, out);
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });
    console.log('[pdf] one-pager →', outPath);
    await page.close();
  }
} finally {
  await browser.close();
}
