/**
 * assetBundles.ts ??Pixi `Assets.addBundle / loadBundle` ê¸°ë°˜ ê·¸ë£¹ prefetch.
 *
 * ëª©ì 
 *  - ì²?ë¡œë”© ?¨ì¶•: ë¶€????core ?ì‚°??ë³‘ë ¬ë¡?ë¯¸ë¦¬ ë¡œë“œ??TitleScene ?œì‹œ ì§í›„
 *    ??ê²Œì„ ì§„ì… ?œì ???€ê¸??†ì´ ?ì‚°??ì¤€ë¹„ë˜?„ë¡ ?œë‹¤.
 *  - Stratum ë³?lazy: ItemWorldScene ì§„ì… ì§ì „ item_world ë²ˆë“¤???„ë¦¬?˜ì¹˜?? *    ??ëª¨ë£¨ ?¤í”„?¼ì´??ë¡œë”© hitch ë¥??Œí”¼?œë‹¤.
 *
 * ?™ì‘ ?ì¹™
 *  - ë²ˆë“¤ ??URL)???”í‹°?°ê? ?¤ì œë¡??¸ì¶œ?˜ëŠ” `Assets.load(url)` ê²½ë¡œ?€ 100%
 *    ?¼ì¹˜?´ì•¼ ?œë‹¤. ?¼ì¹˜?˜ë©´ entity ì¸?Assets.load ??ìºì‹œ?ì„œ ì¦‰ì‹œ resolve.
 *  - ëª¨ë“  URL ?€ `assetPath()` ë¡?base ?ìš© ??GitHub Pages (`/echoris/`) ?€??
 *  - ë²ˆë“¤ ?±ë¡?€ 1?? ë¡œë“œ??idempotent.
 *
 * ì¶”ê?/?˜ì • ê°€?´ë“œ
 *  - ???ì‚°??entity ê°€ `Assets.load(assetPath(X))` ë¡?ë¶€ë¥´ë©´, ?™ì¼??X ë¥? *    ?„ë˜ BUNDLES ???ë‹¹??ê·¸ë£¹??ì¶”ê?ë§??˜ë©´ ?œë‹¤. ì½”ë“œ ë³€ê²?ë¶ˆí•„??
 *
 * pixijs-references.html roadmap P1 ??Asset Bundle.
 */

import { Assets, Container, Sprite, Texture, type Renderer } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { raceWithTimeout } from '@core/AsyncTimeout';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

export type BundleName = 'core' | 'item_world';

/**
 * ë¶€????ì¦‰ì‹œ ?„ìš”??ê³µìš© ?ì‚°. main.ts ?ì„œ game.init() ì§í›„ fire-and-forget
 * ë¡?prefetch ?œë‹¤.
 */
const CORE_ASSETS: Record<string, string> = {
  world_ldtk: assetPath('assets/World_ProjectAbyss.ldtk'),
  title_logo: assetPath('assets/ui/ui_title_01.png'),
  save_point: assetPath('assets/sprites/save_point_01.png'),
  erda_portrait: assetPath('assets/portraits/erda.png'),
  erda_atlas_png: assetPath('assets/characters/erda_atlas.png'),
  erda_atlas_json: assetPath('assets/characters/erda_atlas.json'),
  sword_broken: assetPath('assets/items/sword_broken.png'),
  sword_halfblade: assetPath('assets/items/sword_halfblade.png'),
  sword_scalpel: assetPath('assets/items/sword_scalpel.png'),
  sword_rustborn: assetPath('assets/items/sword_rustborn.png'),
  sword_magic: assetPath('assets/items/sword_magic.png'),
  sword_rare: assetPath('assets/items/sword_rare.png'),
  sword_legendary: assetPath('assets/items/sword_legendary.png'),
  sword_ancient: assetPath('assets/items/sword_ancient.png'),
  fx_slash: assetPath('assets/sprites/fx_slash_02_atlas.png'),
  parallax_far: assetPath('assets/parallax/parallax_far.png'),
  parallax_mid: assetPath('assets/parallax/parallax_mid.png'),
  parallax_near: assetPath('assets/parallax/parallax_near.png'),
  atlas_terrain: assetPath('assets/atlas/Terrain (32x32).png'),
  atlas_world_01: assetPath('assets/atlas/world_01.png'),
  atlas_world_02: assetPath('assets/atlas/world_02.png'),
  atlas_world_02_atlas: assetPath('assets/atlas/world_02_atlas.png'),
  atlas_world_interior_01: assetPath('assets/atlas/world_interior_01.png'),
  atlas_builder_01: assetPath('assets/atlas/builder_01.png'),
  builder_leg_atlas_png: assetPath('assets/atlas/builder_leg_01_atlas.png'),
  anvil_gate_atlas_png: assetPath('assets/sprites/anvil_gate_02_atlas.png'),
  anvil_gate_atlas_json: assetPath('assets/sprites/anvil_gate_02_atlas.json'),
  fx019: assetPath('assets/sprites/FX019.png'),
  breakable_01: assetPath('assets/sprites/breakable_01.png'),
  breakable_switch_01: assetPath('assets/sprites/breakable_switch_01.png'),
  signboard_save: assetPath('assets/sprites/signboard_save_01.png'),
  prop_lab_01: assetPath('assets/sprites/prop_lab_01.png'),
  prop_lab_02: assetPath('assets/sprites/prop_lab_02.png'),
  prop_lab_03: assetPath('assets/sprites/prop_lab_03.png'),
  prop_lab_04: assetPath('assets/sprites/prop_lab_04.png'),
  coin_atlas: assetPath('assets/sprites/coin_01_atlas.png'),
  door_atlas: assetPath('assets/sprites/door_01_atlas.png'),
  door_atlas_json: assetPath('assets/sprites/door_01_atlas.json'),
  crate_atlas: assetPath('assets/sprites/crate_01_atlas.png'),
  crate_atlas_json: assetPath('assets/sprites/crate_01_atlas.json'),
  fire_atlas: assetPath('assets/sprites/fire_01_atlas.png'),
  fire_atlas_02: assetPath('assets/sprites/fire_02_atlas.png'),
  fire_atlas_03: assetPath('assets/sprites/fire_03_atlas.png'),
  fire_atlas_04: assetPath('assets/sprites/fire_04_atlas.png'),
};

/**
 * ItemWorldScene ì§„ì… ??lazy prefetch. ??ì£¼ë? ?¤í”„?¼ì´??
 */
const ITEM_WORLD_ASSETS: Record<string, string> = {
  skeleton_atlas: assetPath('assets/characters/skeleton_01_atlas.png'),
  boss_01_atlas: assetPath('assets/characters/boss_01_atlas.png'),
  slime: assetPath('assets/characters/slime_01_atlas.png'),
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
 * ë²ˆë“¤??idempotent ë¡?prefetch. ??ë²ˆì§¸ ?¸ì¶œë¶€?°ëŠ” ì²??¸ì¶œ Promise ë¥? * ê·¸ë?ë¡?ë°˜í™˜??ì¤‘ë³µ IO ê°€ ë°œìƒ?˜ì? ?ŠëŠ”??
 *
 * ?¤íŒ¨?´ë„ throw ?˜ì? ?ŠëŠ”?????ì‚° ?„ë½?€ entity ì¸?Assets.load ?œì ?? * ê°œë³„ catch ë¡??´ë? ì²˜ë¦¬?˜ë©°, ë¶€???¨ê³„?ì„œ throw ?˜ë©´ ?„ì²´ ê²Œì„??ì¤‘ë‹¨?˜ê¸°
 * ?Œë¬¸. ì½˜ì†” ê²½ê³ ë§??¨ê¸´??
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

/**
 * Phase 1.A ??GPU texture prewarm. ëª¨ë“  ?±ë¡ bundle ??Texture ë¥?invisible
 * Sprite ë¡?ë¬¶ì–´ `renderer.prepare.upload()` ë¡???ë²ˆì— GPU ?…ë¡œ?œí•œ??
 *
 * ?¨ê³¼: ê²Œì„ ì¤?ì²?sprite ?±ì¥ ??ë°œìƒ?˜ëŠ” `renderer.worldRT` spike (?˜ì‹­~100ms+)
 *      ë¥?ë¶€???œì ?¼ë¡œ ?´ë™ ??ê²Œì„?Œë ˆ??ì¤?spike 0 ëª©í‘œ.
 *
 * ë¹„ìš©: ë¶€???œê°„ +?˜ë°± ms (??ë²?. ?´í›„ frame ëª¨ë‘ hot GPU ìºì‹œ.
 *
 * ?„ì œ: `import 'pixi.js/prepare'` ê°€ main.ts ?ì„œ ??ë²?import ?˜ì–´ ?ˆì–´????
 */
export async function prewarmAllBundleTextures(renderer: Renderer): Promise<{ count: number; ms: number }> {
  const start = performance.now();
  const tmp = new Container();
  let count = 0;
  for (const name of Object.keys(BUNDLES) as BundleName[]) {
    const bundle = BUNDLES[name];
    for (const url of Object.values(bundle)) {
      const tex = Assets.get(url);
      if (tex instanceof Texture) {
        const sp = new Sprite(tex);
        sp.alpha = 0;
        tmp.addChild(sp);
        count++;
      }
    }
  }
  if (count === 0) {
    tmp.destroy();
    return { count: 0, ms: 0 };
  }
  const prep = (renderer as unknown as { prepare?: { upload: (t: Container) => Promise<void> } }).prepare;
  if (!prep) {
    destroyDisplayObject(tmp, { children: true });
    console.warn('[assetBundles] renderer.prepare unavailable ??pixi.js/prepare not imported?');
    return { count: 0, ms: 0 };
  }
  // PIXI v8: prepare.upload() returns Promise (callback ?¸ì ?„ë‹˜).
  // ?ˆì „ë§? 5ì´?timeout ??texture source ê°€ ë¯¸ë¡œ???íƒœ?´ë©´ prepare ê°€ hang ?????ˆë‹¤.
  const uploadP = prep.upload(tmp).catch((e) => {
    console.warn('[prewarm] upload error:', e);
  });
  await raceWithTimeout(
    uploadP,
    5000,
    () => {
      console.warn('[prewarm] 5s timeout reached ??proceeding without full prewarm.');
    },
  );  destroyDisplayObject(tmp, { children: true });
  return { count, ms: performance.now() - start };
}
