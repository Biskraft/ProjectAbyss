#!/usr/bin/env node
/**
 * P1 현황판 자동 생성 스크립트.
 *
 * GDD 문서(Documents/System/*.md, Documents/UI/*.md)의 구현 현황 테이블에서
 * P1 기능을 추출하여 Documents/Plan/Project_Status_Dashboard_P1.md를 생성/갱신.
 *
 * Usage: node generate_dashboard.mjs [project_root]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, basename, resolve } from "path";

const ROOT = resolve(process.argv[2] || ".");
const SCAN_DIRS = [
  { dir: join(ROOT, "Documents", "System"), subdir: "System" },
  { dir: join(ROOT, "Documents", "UI"), subdir: "UI" },
];
const OUTPUT = join(ROOT, "Documents", "Plan", "Project_Status_Dashboard_P1.md");
const COMPLETE = "✅";

// ── 유틸 ──

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function progressBar(pct) {
  const filled = Math.round(pct / 10);
  return "\u{1f7e9}".repeat(Math.max(0, Math.min(10, filled))) +
    "\u2b1c".repeat(10 - Math.max(0, Math.min(10, filled))) +
    ` (${pct}%)`;
}

function parseCells(row) {
  const cells = row.split("|").map((c) => c.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function parseColumnMap(header) {
  const cells = parseCells(header);
  const map = {};
  cells.forEach((name, i) => {
    const lower = name.toLowerCase().replace(/\s+/g, "");
    if (lower.includes("기능id") || lower === "id") map.id = i;
    else if (lower.includes("우선순위") || lower.includes("priority")) map.priority = i;
    else if (lower.includes("구현") || lower.includes("상태") || lower.includes("status")) map.status = i;
  });
  return map;
}

// ── 파싱 ──

function findStatusTables(text) {
  const lines = text.split("\n");
  const tables = [];
  let inSection = false;
  let header = "";
  let sepSeen = false;
  let rows = [];

  for (const raw of lines) {
    const line = raw.trim();

    if (/^#{1,4}\s.*구현\s*현황/.test(line)) {
      if (header && rows.length) tables.push({ header, rows: [...rows] });
      inSection = true;
      header = "";
      sepSeen = false;
      rows = [];
      continue;
    }

    if (inSection && /^#{1,4}\s/.test(line) && !line.includes("구현 현황")) {
      if (header && rows.length) tables.push({ header, rows: [...rows] });
      inSection = false;
      header = "";
      sepSeen = false;
      rows = [];
      continue;
    }

    if (!inSection) continue;

    if (line.startsWith("|")) {
      if (!header) { header = line; continue; }
      if (/^\|[\s:|\-]+\|$/.test(line)) { sepSeen = true; continue; }
      if (sepSeen) rows.push(line);
    } else {
      if (header && rows.length) tables.push({ header, rows: [...rows] });
      header = "";
      sepSeen = false;
      rows = [];
    }
  }
  if (header && rows.length) tables.push({ header, rows: [...rows] });
  return tables;
}

// ── 기존 대시보드 로드 ──

function loadPrevious() {
  if (!existsSync(OUTPUT)) return { syncN: 0, statuses: {} };
  const text = readFileSync(OUTPUT, "utf-8");
  const m = text.match(/(\d+)차\s*동기화/);
  const syncN = m ? parseInt(m[1], 10) : 0;
  const statuses = {};
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = parseCells(line.trim());
    if (cells.length >= 5 && /^[A-Z]+-\d+/.test(cells[0])) {
      statuses[cells[0].trim()] = (cells[4] || "").trim();
    }
  }
  return { syncN, statuses };
}

// ── 메인 ──

function main() {
  // 문서 수집
  const allFiles = [];
  for (const { dir, subdir } of SCAN_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (f.endsWith(".md")) allFiles.push({ path: join(dir, f), subdir, name: f });
    }
  }

  const { syncN: prevN, statuses: prevStatuses } = loadPrevious();
  const newN = prevN + 1;

  const docResults = [];
  const skipped = [];
  let totalP1 = 0;
  let totalComplete = 0;

  for (const { path: fpath, subdir, name } of allFiles) {
    const text = readFileSync(fpath, "utf-8");
    const tables = findStatusTables(text);
    const p1Rows = [];
    let headerLine = "";
    let p1Complete = 0;

    for (const { header, rows } of tables) {
      const colMap = parseColumnMap(header);
      if (colMap.priority == null) continue;
      if (!headerLine) headerLine = header;

      for (const row of rows) {
        const cells = parseCells(row);
        if (colMap.priority < cells.length && cells[colMap.priority].includes("P1")) {
          p1Rows.push(row);
          if (colMap.status != null && colMap.status < cells.length && cells[colMap.status].includes(COMPLETE)) {
            p1Complete++;
          }
        }
      }
    }

    if (p1Rows.length === 0) { skipped.push(name); continue; }

    const pct = Math.round((p1Complete / p1Rows.length) * 100);
    totalP1 += p1Rows.length;
    totalComplete += p1Complete;

    // separator 생성
    const hCells = parseCells(headerLine);
    const colMap2 = parseColumnMap(headerLine);
    const sepCells = hCells.map((_, i) => i === colMap2.priority ? ":---:" : ":---");
    const separator = "| " + sepCells.join(" | ") + " |";

    docResults.push({ name, subdir, header: headerLine, separator, p1Rows, total: p1Rows.length, complete: p1Complete, pct });
  }

  const totalPct = totalP1 ? Math.round((totalComplete / totalP1) * 100) : 0;

  // 대시보드 생성
  const L = [];
  L.push("# Project Abyss P1 현황판 (프로토타입)", "");
  L.push(`> **Last Sync:** ${today()} (${newN}차 동기화)`);
  L.push("> **범위:** Phase 1 프로토타입 대상 기능", "");

  L.push("## 요약", "");
  L.push("| 문서 (Source) | 기능 수 | 진행률 |");
  L.push("| :--- | :--- | :--- |");
  for (const d of docResults) L.push(`| **${d.name}** | ${d.total}개 | ${progressBar(d.pct)} |`);
  L.push(`| **Total** | **${totalP1}개** | **${totalPct}%** |`);
  L.push("");

  L.push("## 상세", "");
  for (const d of docResults) {
    L.push(`### [${d.name}](../${d.subdir}/${d.name})`, "");
    L.push(d.header);
    L.push(d.separator);
    for (const r of d.p1Rows) L.push(r);
    L.push("");
  }

  mkdirSync(join(ROOT, "Documents", "Plan"), { recursive: true });
  writeFileSync(OUTPUT, L.join("\n"), "utf-8");

  // 변경 감지
  const changed = [];
  for (const d of docResults) {
    const colMap = parseColumnMap(d.header);
    if (colMap.id == null || colMap.status == null) continue;
    for (const row of d.p1Rows) {
      const cells = parseCells(row);
      const fid = (cells[colMap.id] || "").trim();
      const newStatus = (cells[colMap.status] || "").trim();
      const old = prevStatuses[fid];
      if (old && old !== newStatus) changed.push({ id: fid, old, new: newStatus });
    }
  }

  // JSON 출력
  console.log(JSON.stringify({
    sync_n: newN, date: today(), scanned: allFiles.length,
    with_p1: docResults.length, skipped, total_p1: totalP1,
    total_complete: totalComplete, total_pct: totalPct, changed, output: OUTPUT,
  }));
}

main();
