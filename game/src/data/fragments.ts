/**
 * fragments.ts — DEC-046 Memory Fragment 카탈로그 (런타임 빌드)
 *
 * SSoT: Sheets/LoreTexts/Fragments/*.md
 *
 * 각 MD 파일을 파싱하여 인물(itemId) 별 Fragment 텍스트 + Identity Trait
 * 메타데이터를 메모리에 적재한다. 파싱은 *유연한 정규식 기반* — 작가가
 * MD 구조를 일부 변경해도 깨지지 않도록 fallback 처리.
 *
 * Fragment ID 규칙:
 *   `{itemId}_stage_{N}`        — Stage 1~4 Fragment (보스 처치 시 해금)
 *   `{itemId}_redive_{N}`       — Re-Dive 1~3 Fragment
 *
 * Trait ID 규칙:
 *   `{itemId}_trait_{N}`        — Stage 1~4 Identity Trait
 */

const rawModules = import.meta.glob('../../../Sheets/LoreTexts/Fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface FragmentEntry {
  /** `{itemId}_stage_{N}` */
  id: string;
  /** 소속 인물 (itemId) */
  itemId: string;
  /** Stage 1~4 (Stage 0은 Fragment 없음) */
  stage: number;
  /** 영문 텍스트 (있으면) */
  textEn: string;
  /** 한국어 텍스트 */
  textKo: string;
}

export interface IdentityTraitEntry {
  /** `{itemId}_trait_{N}` */
  id: string;
  itemId: string;
  stage: number;
  /** 결 이름 (예: "공명의 결") */
  name: string;
  /** 효과 요약 (예: "약점 노출 적 ATK +12%") */
  effect: string;
}

export interface ReDiveEntry {
  /** `{itemId}_redive_{N}` */
  id: string;
  itemId: string;
  /** Re-Dive 회차 1~3 */
  cycle: number;
  textEn: string;
  textKo: string;
}

export interface CharacterFragmentBundle {
  itemId: string;
  /** Identity Category (Surveyor / BulkheadRepairman / ...) */
  character: string;
  rarity: string;
  /** Stage별 Fragment (Stage 1~4 인덱스, Stage 0은 항상 undefined) */
  fragments: Map<number, FragmentEntry>;
  /** Stage별 Identity Trait */
  traits: Map<number, IdentityTraitEntry>;
  /** Re-Dive 회차별 Fragment */
  reDives: Map<number, ReDiveEntry>;
}

const CHARACTER_BUNDLES = new Map<string, CharacterFragmentBundle>();
const FRAGMENT_BY_ID = new Map<string, FragmentEntry>();
const TRAIT_BY_ID = new Map<string, IdentityTraitEntry>();
const REDIVE_BY_ID = new Map<string, ReDiveEntry>();

// ---------------------------------------------------------------------------
// MD 파싱
// ---------------------------------------------------------------------------

function extractFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

/**
 * Stage 섹션을 추출. 매치 규칙:
 *   ## Stage 1 (Recovery 25%) — Survey Tool
 *   ## Stage 4 (Recovery 100%) — Surveyor's Echo Wedge — Fire 모멘트
 *
 * 본문 첫 인용(`> EN: "..."`, `> KO: "..."` 또는 `> KO: **"..."**`)를 추출.
 */
function parseStageSection(content: string, stage: number): { en: string; ko: string } | null {
  const headerRegex = new RegExp(`^##\\s+Stage\\s+${stage}\\b[^\\n]*$`, 'm');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch) return null;

  const startIdx = headerMatch.index! + headerMatch[0].length;
  // 다음 ## 헤더까지 (또는 파일 끝)
  const restAfter = content.slice(startIdx);
  const nextHeader = restAfter.search(/\n##\s+/);
  const section = nextHeader === -1 ? restAfter : restAfter.slice(0, nextHeader);

  const enMatch = section.match(/>\s*EN:\s*\*?["“]([^"”]+)["”]\*?/);
  const koMatch = section.match(/>\s*KO:\s*\*{0,2}["“]([^"”]+)["”]\*{0,2}/);

  if (!enMatch && !koMatch) return null;
  return {
    en: enMatch?.[1].trim() ?? '',
    ko: koMatch?.[1].trim() ?? '',
  };
}

function parseTraitSection(content: string, stage: number): { name: string; effect: string } | null {
  // Stage N 헤더 ~ 다음 Stage 헤더 사이에서 "### Identity Trait" 섹션 찾기.
  const headerRegex = new RegExp(`^##\\s+Stage\\s+${stage}\\b[^\\n]*$`, 'm');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch) return null;

  const startIdx = headerMatch.index! + headerMatch[0].length;
  const restAfter = content.slice(startIdx);
  const nextHeader = restAfter.search(/\n##\s+/);
  const section = nextHeader === -1 ? restAfter : restAfter.slice(0, nextHeader);

  const traitMatch = section.match(/###\s+Identity Trait[^—\n]*—\s*([^\n(]+?)(?:\s*\([^)]+\))?\s*\n([\s\S]*?)(?=###|$)/);
  if (!traitMatch) return null;

  const name = traitMatch[1].trim();
  // 효과 라인: "- 효과: ..." 첫 줄
  const effectMatch = traitMatch[2].match(/-\s*효과:\s*([^\n]+)/);
  const effect = effectMatch?.[1].trim() ?? '';
  return { name, effect };
}

function parseReDive(content: string, cycle: number): { en: string; ko: string } | null {
  const headerRegex = new RegExp(`^##\\s+Re-Dive\\s+${cycle}\\b[^\\n]*$`, 'm');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch) return null;

  const startIdx = headerMatch.index! + headerMatch[0].length;
  const restAfter = content.slice(startIdx);
  const nextHeader = restAfter.search(/\n##\s+/);
  const section = nextHeader === -1 ? restAfter : restAfter.slice(0, nextHeader);

  const enMatch = section.match(/>\s*EN:\s*\*?["“]([^"”]+)["”]\*?/);
  const koMatch = section.match(/>\s*KO:\s*\*{0,2}["“]([^"”]+)["”]\*{0,2}/);

  if (!enMatch && !koMatch) return null;
  return {
    en: enMatch?.[1].trim() ?? '',
    ko: koMatch?.[1].trim() ?? '',
  };
}

function loadFragmentMD(path: string, raw: string): void {
  const meta = extractFrontmatter(raw);
  if (!meta.itemId) return;
  const itemId = meta.itemId;

  const bundle: CharacterFragmentBundle = {
    itemId,
    character: meta.character ?? 'Unknown',
    rarity: meta.rarity ?? 'normal',
    fragments: new Map(),
    traits: new Map(),
    reDives: new Map(),
  };

  for (let stage = 1; stage <= 4; stage++) {
    const stageText = parseStageSection(raw, stage);
    if (stageText) {
      const id = `${itemId}_stage_${stage}`;
      const entry: FragmentEntry = {
        id,
        itemId,
        stage,
        textEn: stageText.en,
        textKo: stageText.ko,
      };
      bundle.fragments.set(stage, entry);
      FRAGMENT_BY_ID.set(id, entry);
    }

    const trait = parseTraitSection(raw, stage);
    if (trait) {
      const id = `${itemId}_trait_${stage}`;
      const entry: IdentityTraitEntry = {
        id,
        itemId,
        stage,
        name: trait.name,
        effect: trait.effect,
      };
      bundle.traits.set(stage, entry);
      TRAIT_BY_ID.set(id, entry);
    }
  }

  for (let cycle = 1; cycle <= 3; cycle++) {
    const reDive = parseReDive(raw, cycle);
    if (reDive) {
      const id = `${itemId}_redive_${cycle}`;
      const entry: ReDiveEntry = {
        id,
        itemId,
        cycle,
        textEn: reDive.en,
        textKo: reDive.ko,
      };
      bundle.reDives.set(cycle, entry);
      REDIVE_BY_ID.set(id, entry);
    }
  }

  CHARACTER_BUNDLES.set(itemId, bundle);
}

// 부팅 시 모든 MD 로드
for (const [path, raw] of Object.entries(rawModules)) {
  try {
    loadFragmentMD(path, raw);
  } catch (e) {
    // Fragment 파싱 실패는 게임 동작을 막지 않는다 (placeholder 사용).
    console.warn(`[fragments] Failed to parse ${path}:`, e);
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export function getCharacterBundle(itemId: string): CharacterFragmentBundle | undefined {
  return CHARACTER_BUNDLES.get(itemId);
}

export function getFragmentById(id: string): FragmentEntry | undefined {
  return FRAGMENT_BY_ID.get(id);
}

export function getTraitById(id: string): IdentityTraitEntry | undefined {
  return TRAIT_BY_ID.get(id);
}

export function getReDiveById(id: string): ReDiveEntry | undefined {
  return REDIVE_BY_ID.get(id);
}

/** Returns Fragment for `{itemId}_stage_{stage}`. Returns undefined if not authored. */
export function getStageFragment(itemId: string, stage: number): FragmentEntry | undefined {
  return FRAGMENT_BY_ID.get(`${itemId}_stage_${stage}`);
}

/** Returns Identity Trait for `{itemId}_trait_{stage}`. */
export function getStageTrait(itemId: string, stage: number): IdentityTraitEntry | undefined {
  return TRAIT_BY_ID.get(`${itemId}_trait_${stage}`);
}

/** Returns all bundled characters (Identity Archive 전체 조회용). */
export function getAllCharacterBundles(): CharacterFragmentBundle[] {
  return Array.from(CHARACTER_BUNDLES.values());
}

/**
 * Locale-aware Fragment 텍스트 반환.
 * @param locale 'en' | 'ko' (기본 'ko')
 */
export function getFragmentText(fragmentId: string, locale: 'en' | 'ko' = 'ko'): string {
  const f = FRAGMENT_BY_ID.get(fragmentId);
  if (!f) {
    const rd = REDIVE_BY_ID.get(fragmentId);
    if (!rd) return '???';
    return locale === 'en' ? rd.textEn || rd.textKo : rd.textKo || rd.textEn;
  }
  return locale === 'en' ? f.textEn || f.textKo : f.textKo || f.textEn;
}

/** 진단용: 로드된 인물 수 */
export function getCharacterCount(): number {
  return CHARACTER_BUNDLES.size;
}
