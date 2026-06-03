import { Assets, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
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
  elapsedMs: number;
  durationMs: number;
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

    const entityIndex = sceneContainer.getChildIndex(entityLayer);
    sceneContainer.addChildAt(root, Math.max(0, entityIndex));

    this.snapshot = {
      container: root,
      backgroundTexture,
      worldTexture,
      itemSprite: null,
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
  }

  destroy(restoreSources: boolean): void {
    const snapshot = this.snapshot;
    if (snapshot) {
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
