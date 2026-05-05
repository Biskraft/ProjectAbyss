/**
 * audioEvents.ts — Sheets/Content_System_Audio_Events.csv 의 부팅 시 로더.
 *
 * CSV 가 게임 내부 믹서의 SSoT. 본 모듈은 모듈 평가 시 CSV 를 1회 파싱해
 * Map<event_id, mix_volume> 을 빌드한다. Vite HMR 이 ?raw CSV 변경을 감지하면
 * 모듈이 재평가되어 자동 재파싱 — `loadAudioEvents()` 명시 호출 불필요.
 *
 * Usage:
 *   import { getEventMix } from '@data/audioEvents';
 *   const v = getEventMix('amb_world_shaft_tier3_builder'); // 0.4
 *
 * 미등록 event_id 호출 시 fallback 1.0 + dev 모드 1회 콘솔 경고.
 *
 * SSoT: Sheets/Content_System_Audio_Events.csv
 * Doc:  Documents/System/System_Audio_Direction.md §12-4
 */

// Vite ?raw 쿼리 — CSV 내용을 string 으로 import. 빌드 시점 인라인 + HMR 자동.
import csvRaw from '../../../Sheets/Content_System_Audio_Events.csv?raw';

const mixMap = new Map<string, number>();
const warnedOrphans = new Set<string>();

/**
 * 모듈 평가 시 자동 실행 — CSV 파싱해 mixMap 채움.
 *
 * HMR 으로 모듈 재평가되면 mixMap 이 fresh Map 으로 재생성되고 다시 채워짐.
 * 외부에서 명시 호출 불필요.
 */
function parseCsv(): void {
  mixMap.clear();
  const lines = csvRaw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return;

  const header = parseCsvRow(lines[0]);
  const idIdx = header.indexOf('event_id');
  const mixIdx = header.indexOf('mix_volume');
  if (idIdx < 0 || mixIdx < 0) {
    if (import.meta.env.DEV) {
      console.warn('[audioEvents] CSV header missing event_id or mix_volume column');
    }
    return;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const id = cols[idIdx]?.trim();
    if (!id) continue;
    const raw = cols[mixIdx]?.trim() ?? '';
    let mix = raw === '' ? 1.0 : Number.parseFloat(raw);
    if (!Number.isFinite(mix)) mix = 1.0;
    if (mix < 0) mix = 0;
    if (mix > 1) {
      if (import.meta.env.DEV) {
        console.warn(`[audioEvents] "${id}" mix_volume=${mix} > 1.0 — clamped (피크 클리핑 회피)`);
      }
      mix = 1.0;
    }
    mixMap.set(id, mix);
  }

  if (import.meta.env.DEV) {
    console.info(`[audioEvents] parsed ${mixMap.size} events from CSV`);
  }
}

// 모듈 로드 시 즉시 파싱.
parseCsv();

/**
 * 등록된 mix_volume 반환. 미등록 id 는 1.0 fallback + dev 1회 경고.
 *
 * `AudioBus.play` 가 `options.volume` 미지정 시 호출.
 */
export function getEventMix(eventId: string): number {
  const v = mixMap.get(eventId);
  if (v !== undefined) return v;
  if (import.meta.env.DEV && !warnedOrphans.has(eventId)) {
    warnedOrphans.add(eventId);
    console.warn(
      `[audioEvents] orphan event_id="${eventId}" — Sheets/Content_System_Audio_Events.csv 에 등록되지 않았습니다. fallback mix_volume=1.0`,
    );
  }
  return 1.0;
}

/**
 * 명시 로드 호출 — 후방 호환용. 모듈 평가 시 자동 파싱하므로 보통 불필요.
 * main.ts 에서 호출해도 추가 비용 없음 (idempotent).
 */
export function loadAudioEvents(): void {
  // 모듈 top-level 에서 이미 parseCsv() 실행. 명시 호출은 noop.
}

/**
 * 간이 CSV row 파서. 따옴표 안의 콤마/이스케이프 따옴표 처리.
 * RFC 4180 의 핵심 케이스만 지원 — 본 CSV 는 multiline cell 미사용.
 */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

// Vite HMR — self-accept 비활성. CSV 변경 시 page full reload 로 fallback
// (AudioBus 등 dependent 의 binding stale 회피).
