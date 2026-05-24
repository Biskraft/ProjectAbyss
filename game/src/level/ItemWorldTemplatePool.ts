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

/** Sync access — null 이면 아직 로드 중 또는 미시작. */
export function getItemWorldTemplatesIfReady(): LdtkLevel[] | null {
  return pool;
}

/** Lazy load + cache. 여러 번 호출해도 한 번만 fetch. */
export function prepareItemWorldTemplates(): Promise<LdtkLevel[]> {
  if (pool) return Promise.resolve(pool);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const json = await fetch(assetPath('assets/World_ProjectAbyss.ldtk')).then(r => r.json());
    const loader = new LdtkLoader();
    loader.load(json, 'ItemStratum');
    pool = loader.getLevelIds().map(id => loader.getLevel(id)!);
    return pool;
  })();
  return loadPromise;
}
