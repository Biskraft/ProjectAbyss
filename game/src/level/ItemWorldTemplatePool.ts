/**
 * ItemWorldTemplatePool.ts — Lazy-loaded singleton pool of LDtk Item World templates.
 *
 * Why: InventoryUI 의 anvil 미니맵이 ItemWorldScene 과 *동일한 LDtk template* 을
 *      사용하려면 별도 LdtkLoader 인스턴스가 필요한데, 매번 fetch+parse 하면 비싸다.
 *      이 모듈이 *처음 호출 시 한 번* 비동기 로드하고 이후 sync 접근을 허용한다.
 *
 * Usage:
 *   // 어딘가 (예: anvil mode open) 에서 preload 트리거:
 *   void prepareItemWorldTemplates();
 *
 *   // 렌더링 시점 — 로드 완료면 LDtk template 사용, 아니면 null:
 *   const pool = getItemWorldTemplatesIfReady();
 *   if (pool) { ... use pool ... }
 */

import { LdtkLoader, type LdtkLevel } from './LdtkLoader';
import { assetPath } from '@core/AssetLoader';

let pool: LdtkLevel[] | null = null;
let loadPromise: Promise<LdtkLevel[]> | null = null;

function fieldHasDebugTag(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(fieldHasDebugTag);
  return String(value ?? '')
    .toLowerCase()
    .split(/[,\s]+/)
    .includes('debug');
}

export function isExcludedItemWorldRandomTemplate(level: LdtkLevel): boolean {
  return level.identifier.startsWith('ItemStratum_Prologue_') || isExcludedItemWorldTemplatePoolEntry(level);
}

function isExcludedItemWorldTemplatePoolEntry(level: LdtkLevel): boolean {
  const id = level.identifier.toLowerCase();
  const tags = level.tags ?? [];
  return id.includes('debug')
    || id.includes('test')
    || level.roomType === 'Debug'
    || tags.includes('debug')
    || tags.includes('test')
    || fieldHasDebugTag(level.fields['Tags'])
    || fieldHasDebugTag(level.fields['tags'])
    || fieldHasDebugTag(level.fields['Tag'])
    || fieldHasDebugTag(level.fields['tag'])
    || fieldHasDebugTag(level.fields['Debug'])
    || fieldHasDebugTag(level.fields['debug']);
}

function filterPlayableTemplates(templates: LdtkLevel[]): LdtkLevel[] {
  return templates.filter(level => !isExcludedItemWorldTemplatePoolEntry(level));
}

/** Sync access — null 이면 아직 로드 중 또는 미시작. */
export function getItemWorldTemplatesIfReady(): LdtkLevel[] | null {
  return pool;
}

/**
 * Seed the shared pool from an LDtk project that was already parsed elsewhere.
 * This avoids a second World_ProjectAbyss.ldtk fetch when the player enters
 * Item World from the overworld.
 */
export function seedItemWorldTemplates(templates: LdtkLevel[]): void {
  if (pool || loadPromise || templates.length === 0) return;
  pool = filterPlayableTemplates(templates);
  loadPromise = Promise.resolve(pool);
}

/** Lazy load + cache. 여러 번 호출해도 한 번만 fetch. */
export function prepareItemWorldTemplates(): Promise<LdtkLevel[]> {
  if (pool) return Promise.resolve(pool);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const json = await fetch(assetPath('assets/World_ProjectAbyss.ldtk')).then(r => r.json());
    const loader = new LdtkLoader();
    loader.load(json, 'ItemStratum');
    pool = filterPlayableTemplates(loader.getLevelIds().map(id => loader.getLevel(id)!));
    return pool;
  })();
  return loadPromise;
}
