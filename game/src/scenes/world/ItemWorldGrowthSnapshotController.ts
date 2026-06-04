import { Assets, BlurFilter, ColorMatrixFilter, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../../Game';
import {
  ITEM_WORLD_ENTRY_SNAPSHOT_END_SCALE,
  type ItemWorldGrowthProjection,
} from './ItemWorldEntryStreamRuntime';

export interface ItemWorldGrowthSnapshotOptions {
  originX: number;
  originY: number;
  pivotX?: number;
  pivotY?: number;
  durationMs: number;
}

interface SnapshotState {
  container: Container;
  backgroundTexture: RenderTexture;
  worldTexture: RenderTexture;
  itemSprite: Sprite | null;
  blurFilter: BlurFilter;
  colorFilter: ColorMatrixFilter;
  vignette: Sprite;
  vignetteTexture: Texture;
  elapsedMs: number;
  durationMs: number;
}

// 아이템(무기)으로 빨려드는 느낌 — 성장이 진행될수록(시간 t) 효과가 강해진다.
// nearest-scale 로 64배 확대되어 보이는 큰 픽셀을 부드럽게 가린다.
const SNAPSHOT_MAX_BLUR = 28;
const SNAPSHOT_MAX_CONTRAST = 0.5;   // contrast 0.5 (시간 비례)
const SNAPSHOT_MAX_VIGNETTE = 0.9;   // 비네트 최대 alpha

// 캐릭터 주변 비네트 없는 반경(clear hole) — anchor 0.5 로 캐릭터에 고정한다.
const VIGNETTE_CLEAR_RADIUS = 130;
const VIGNETTE_DARK_RADIUS = 360;

/**
 * 중심 투명(clear hole) → 가장자리 검정 radial 비네트 텍스처.
 * 화면 2배 크기 — anchor 0.5 로 캐릭터에 붙여 어디에 있든 화면 전체를 덮고,
 * 캐릭터 주변(clear hole)은 항상 비네트가 없어 캐릭터가 어두워지지 않는다.
 */
function buildVignetteTexture(coreW: number, coreH: number): Texture {
  const width = coreW * 2;
  const height = coreH * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, VIGNETTE_CLEAR_RADIUS, cx, cy, VIGNETTE_DARK_RADIUS);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  return Texture.from(canvas);
}

interface HiddenTargetState {
  target: Container;
  visible: boolean;
}

export interface ItemWorldGrowthSnapshotControllerDeps {
  game: Game;
  sceneContainer: Container;
  getEntityLayer: () => Container;
  getPlayer: () => Player;
  getItem: () => ItemInstance | null;
  getHiddenTargets: () => Array<Container | null | undefined>;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function growthScaleCurve(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export class ItemWorldGrowthSnapshotController {
  private snapshot: SnapshotState | null = null;
  private readonly hiddenTargets: HiddenTargetState[] = [];

  constructor(private readonly deps: ItemWorldGrowthSnapshotControllerDeps) {}

  start(options: ItemWorldGrowthSnapshotOptions): void {
    this.destroy(true);

    const { game, sceneContainer } = this.deps;
    const entityLayer = this.deps.getEntityLayer();
    const backgroundTexture = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    backgroundTexture.source.scaleMode = 'nearest';
    game.renderer.render({
      container: game.backgroundContainer,
      target: backgroundTexture,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });

    const worldTexture = this.captureWorldTexture();
    const root = new Container();
    root.eventMode = 'none';

    const bg = new Sprite(backgroundTexture);
    bg.texture.source.scaleMode = 'nearest';
    root.addChild(bg);

    const world = new Sprite(worldTexture);
    world.texture.source.scaleMode = 'nearest';
    root.addChild(world);

    const originScreenX = Math.round(options.originX - game.camera.renderX + GAME_WIDTH / 2);
    const originScreenY = Math.round(options.originY - game.camera.renderY + GAME_HEIGHT / 2);
    const pivotWorldX = options.pivotX ?? options.originX;
    const pivotWorldY = options.pivotY ?? options.originY;
    const pivotScreenX = Math.round(pivotWorldX - game.camera.renderX + GAME_WIDTH / 2);
    const pivotScreenY = Math.round(pivotWorldY - game.camera.renderY + GAME_HEIGHT / 2);
    root.pivot.set(pivotScreenX, pivotScreenY);
    root.position.set(pivotWorldX, pivotWorldY);
    root.scale.set(1);

    const blurFilter = new BlurFilter({ strength: 0, quality: 4 });
    blurFilter.padding = SNAPSHOT_MAX_BLUR;
    // 채도 저하(그레이스케일) + 대비 — 현실에서 아이템 내부로 넘어가는 전환감.
    const colorFilter = new ColorMatrixFilter();
    root.filters = [colorFilter, blurFilter];

    const entityIndex = sceneContainer.getChildIndex(entityLayer);
    sceneContainer.addChildAt(root, Math.max(0, entityIndex));

    // 비네트 — 스크린 고정(스냅샷 스케일과 무관). legacyUIContainer(화면 공간)에 부착.
    const vignetteTexture = buildVignetteTexture(GAME_WIDTH, GAME_HEIGHT);
    const vignette = new Sprite(vignetteTexture);
    vignette.eventMode = 'none';
    vignette.alpha = 0;
    // clear hole 를 캐릭터에 고정 — anchor 중심, 위치는 update 에서 캐릭터 화면 좌표로.
    vignette.anchor.set(0.5);
    game.legacyUIContainer.addChild(vignette);

    this.snapshot = {
      container: root,
      backgroundTexture,
      worldTexture,
      itemSprite: null,
      blurFilter,
      colorFilter,
      vignette,
      vignetteTexture,
      elapsedMs: 0,
      durationMs: Math.max(1, options.durationMs),
    };
    this.addItemSprite(originScreenX, originScreenY);
    this.hideSourceVisuals();
  }

  update(dt: number): void {
    const snapshot = this.snapshot;
    if (!snapshot) return;
    snapshot.elapsedMs = Math.min(snapshot.durationMs, snapshot.elapsedMs + dt);
    const t = clamp01(snapshot.elapsedMs / snapshot.durationMs);
    const scale = 1 + growthScaleCurve(t) * (ITEM_WORLD_ENTRY_SNAPSHOT_END_SCALE - 1);
    snapshot.container.scale.set(scale);
    // 시간이 갈수록 효과 강화 — 아이템으로 빨려드는 전환감.
    const k = growthScaleCurve(t);
    snapshot.blurFilter.strength = k * SNAPSHOT_MAX_BLUR;
    // 채도 0 → 완전 그레이스케일, 대비 0 → 0.5 (시간 비례).
    snapshot.colorFilter.reset();
    snapshot.colorFilter.saturate(-k, false);
    snapshot.colorFilter.contrast(k * SNAPSHOT_MAX_CONTRAST, true);
    snapshot.vignette.alpha = k * SNAPSHOT_MAX_VIGNETTE;
    // 비네트 clear hole 을 캐릭터 화면 좌표에 고정 — 캐릭터 주변은 항상 비네트 없음.
    const player = this.deps.getPlayer();
    const cam = this.deps.game.camera;
    snapshot.vignette.position.set(
      Math.round(player.x + player.width / 2 - cam.renderX + GAME_WIDTH / 2),
      Math.round(player.y + player.height / 2 - cam.renderY + GAME_HEIGHT / 2),
    );
  }

  destroy(restoreSources: boolean): void {
    const snapshot = this.snapshot;
    if (snapshot) {
      snapshot.vignette.parent?.removeChild(snapshot.vignette);
      snapshot.vignette.destroy();
      snapshot.vignetteTexture.destroy(true);
      snapshot.container.parent?.removeChild(snapshot.container);
      snapshot.container.destroy({ children: true });
      snapshot.backgroundTexture.destroy(true);
      snapshot.worldTexture.destroy(true);
      this.snapshot = null;
    }
    if (restoreSources) {
      for (let i = this.hiddenTargets.length - 1; i >= 0; i--) {
        const state = this.hiddenTargets[i];
        if (!state.target.destroyed) state.target.visible = state.visible;
      }
    }
    this.hiddenTargets.length = 0;
  }

  getProjection(): ItemWorldGrowthProjection | null {
    const snapshot = this.snapshot;
    if (!snapshot) return null;
    return {
      elapsedMs: snapshot.elapsedMs,
      durationMs: snapshot.durationMs,
      pivotX: snapshot.container.x,
      pivotY: snapshot.container.y,
    };
  }

  private captureWorldTexture(): RenderTexture {
    const game = this.deps.game;
    const player = this.deps.getPlayer();
    const rt = RenderTexture.create({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      resolution: 1,
      antialias: false,
    });
    rt.source.scaleMode = 'nearest';

    const playerWasVisible = player.container.visible;
    const gc = game.gameContainer;
    const prev = { x: gc.x, y: gc.y, sx: gc.scale.x, sy: gc.scale.y };
    try {
      player.container.visible = false;
      gc.scale.set(1);
      gc.x = Math.round(-game.camera.renderX + GAME_WIDTH / 2);
      gc.y = Math.round(-game.camera.renderY + GAME_HEIGHT / 2);
      game.renderer.render({
        container: gc,
        target: rt,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });
    } finally {
      player.container.visible = playerWasVisible;
      gc.x = prev.x;
      gc.y = prev.y;
      gc.scale.set(prev.sx, prev.sy);
    }
    return rt;
  }

  private addItemSprite(originScreenX: number, originScreenY: number): void {
    const snapshot = this.snapshot;
    const item = this.deps.getItem();
    if (!snapshot || !item) return;

    const attach = (texture: Texture) => {
      if (this.snapshot !== snapshot || snapshot.container.destroyed) return;
      texture.source.scaleMode = 'nearest';
      snapshot.itemSprite?.destroy();
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = originScreenX;
      sprite.y = originScreenY;
      snapshot.itemSprite = sprite;
      snapshot.container.addChild(sprite);
    };

    const url = assetPath(`assets/items/${item.def.id}.png`);
    const cached = Assets.get(url);
    if (cached instanceof Texture) {
      attach(cached);
      return;
    }
    void Assets.load<Texture>(url).then(attach).catch(() => {
      // Missing item art should not break the world-growth snapshot.
    });
  }

  private hideSourceVisuals(): void {
    const hide = (target?: Container | null) => {
      if (!target || this.hiddenTargets.some(state => state.target === target)) return;
      this.hiddenTargets.push({ target, visible: target.visible });
      target.visible = false;
    };

    hide(this.deps.game.backgroundContainer);
    for (const target of this.deps.getHiddenTargets()) {
      hide(target);
    }

    const entityLayer = this.deps.getEntityLayer();
    const player = this.deps.getPlayer();
    for (const child of entityLayer.children) {
      if (child === player.container) continue;
      hide(child as Container);
    }
  }
}
