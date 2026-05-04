/**
 * assetBundles.ts — Pixi `Assets.addBundle / loadBundle` 기반 그룹 prefetch.
 *
 * 목적
 *  - 첫 로딩 단축: 부팅 시 core 자산을 병렬로 미리 로드해 TitleScene 표시 직후
 *    실 게임 진입 시점에 대기 없이 자산이 준비되도록 한다.
 *  - Stratum 별 lazy: ItemWorldScene 진입 직전 item_world 번들을 프리페치해
 *    적/모루 스프라이트 로딩 hitch 를 회피한다.
 *
 * 동작 원칙
 *  - 번들 키(URL)는 엔티티가 실제로 호출하는 `Assets.load(url)` 경로와 100%
 *    일치해야 한다. 일치하면 entity 측 Assets.load 는 캐시에서 즉시 resolve.
 *  - 모든 URL 은 `assetPath()` 로 base 적용 — GitHub Pages (`/echoris/`) 대응.
 *  - 번들 등록은 1회, 로드는 idempotent.
 *
 * 추가/수정 가이드
 *  - 새 자산을 entity 가 `Assets.load(assetPath(X))` 로 부르면, 동일한 X 를
 *    아래 BUNDLES 의 적당한 그룹에 추가만 하면 된다. 코드 변경 불필요.
 *
 * pixijs-references.html roadmap P1 — Asset Bundle.
 */

import { Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

export type BundleName = 'core' | 'item_world';

/**
 * 부트 시 즉시 필요한 공용 자산. main.ts 에서 game.init() 직후 fire-and-forget
 * 로 prefetch 한다.
 */
const CORE_ASSETS: Record<string, string> = {
  title_logo: assetPath('assets/ui/title_logo.png'),
  save_point: assetPath('assets/sprites/save_point_01.png'),
  erda_portrait: assetPath('assets/portraits/erda.png'),
  fx_slash: assetPath('assets/sprites/fx_slash.png'),
  anvil_gate: assetPath('assets/sprites/anvil_gate_01.png'),
  anvil_gate_disable: assetPath('assets/sprites/anvil_gate_01_disable.png'),
  fx019: assetPath('assets/sprites/FX019.png'),
  breakable_01: assetPath('assets/sprites/breakable_01.png'),
  signboard_save: assetPath('assets/sprites/signboard_save_01.png'),
};

/**
 * ItemWorldScene 진입 전 lazy prefetch. 적/주민 스프라이트.
 */
const ITEM_WORLD_ASSETS: Record<string, string> = {
  skeleton_atlas: assetPath('assets/characters/skeleton_01_atlas.png'),
  slime: assetPath('assets/characters/slime_01.png'),
  villager: assetPath('assets/sprites/shadow_town_villager.png'),
  switch: assetPath('assets/sprites/breakable_switch_01.png'),
};

const BUNDLES: Record<BundleName, Record<string, string>> = {
  core: CORE_ASSETS,
  item_world: ITEM_WORLD_ASSETS,
};

const registered = new Set<BundleName>();
const loadPromises = new Map<BundleName, Promise<void>>();

/**
 * 번들을 idempotent 로 prefetch. 두 번째 호출부터는 첫 호출 Promise 를
 * 그대로 반환해 중복 IO 가 발생하지 않는다.
 *
 * 실패해도 throw 하지 않는다 — 자산 누락은 entity 측 Assets.load 시점에
 * 개별 catch 로 이미 처리되며, 부트 단계에서 throw 하면 전체 게임이 중단되기
 * 때문. 콘솔 경고만 남긴다.
 */
export function loadBundleOnce(name: BundleName): Promise<void> {
  const cached = loadPromises.get(name);
  if (cached) return cached;

  if (!registered.has(name)) {
    Assets.addBundle(name, BUNDLES[name]);
    registered.add(name);
  }

  const p = Assets.loadBundle(name)
    .then(() => undefined)
    .catch((e) => {
      console.warn(`[assetBundles] bundle "${name}" prefetch failed:`, e);
    });
  loadPromises.set(name, p);
  return p;
}
