import { Container, RenderTexture, Sprite } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../Game';
import { WorldPullIn, type WorldPullInCapture } from './WorldPullIn';
import { detachDisplayObject, destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

interface PullTarget {
  container: Container;
  x: number;
  y: number;
  height: number;
}

interface LayerDeps {
  tilemapContainer: Container;
  fullMapContainer: Container | null;
  bgAggregate: Container | null;
  buildingLayer: Container;
  residentsLayer: Container;
  fluidLayer: Container;
  aboveFluidLayer: Container;
  entityLayer: Container;
  playerContainer: Container;
  trapdoor: PullTarget | null;
}

interface PromotedTrapdoorState {
  parent: Container | null;
  x: number;
  y: number;
  sx: number;
  sy: number;
  visible: boolean;
}

const WORLD_PULL_COLS = 16;
const WORLD_PULL_ROWS = 9;
const WORLD_PULL_INTGRID_START_MS = 0;
const WORLD_PULL_BACKGROUND_START_MS = 1600;
const WORLD_PULL_CHARACTER_START_MS = 3600;
const WORLD_PULL_INTGRID_DURATION_MS = 4600;

export class WorldPullInTransitionController {
  private worldPullIn: WorldPullIn | null = null;
  private hiddenSources: Array<{ target: Container; visible: boolean }> = [];
  private promotedTrapdoorState: PromotedTrapdoorState | null = null;
  private characterOverlay: Sprite | null = null;
  private characterOverlayTexture: RenderTexture | null = null;
  private elapsedMs = 0;

  constructor(
    private readonly game: Game,
    private readonly deps: LayerDeps,
  ) {}

  get hasPromotedTrapdoor(): boolean {
    return !!this.promotedTrapdoorState;
  }

  start(): boolean {
    this.elapsedMs = 0;
    this.cleanup(true);

    const captures = this.createCaptures();
    if (captures.length === 0) return false;

    const sink = this.getSink();
    this.hideIntgridSources();
    this.worldPullIn = new WorldPullIn(captures, sink.x, sink.y);
    this.game.feedbackOverlayContainer.addChild(this.worldPullIn.container);
    this.showCharacterOverlay();
    this.promoteTrapdoor(sink);
    return true;
  }

  update(dt: number): boolean {
    this.elapsedMs += dt;
    if (this.elapsedMs >= WORLD_PULL_BACKGROUND_START_MS) {
      this.hideBackgroundSources();
    }
    if (this.elapsedMs >= WORLD_PULL_CHARACTER_START_MS) {
      this.destroyCharacterOverlay();
      this.hideTarget(this.deps.entityLayer);
    }
    return !this.worldPullIn || this.worldPullIn.update(dt);
  }

  cleanup(restoreSources: boolean): void {
    if (restoreSources) {
      this.destroyCharacterOverlay();
      this.restoreTrapdoor();
      for (const state of this.hiddenSources) state.target.visible = state.visible;
      this.hiddenSources.length = 0;
    }
    if (this.worldPullIn) {
      this.worldPullIn.destroy();
      this.worldPullIn = null;
    }
  }

  private createCaptures(): WorldPullInCapture[] {
    const captures: WorldPullInCapture[] = [];
    const cols = WORLD_PULL_COLS;
    const rows = WORLD_PULL_ROWS;

    const world = this.captureGameLayerGroup(this.getWorldLayers(), () => {
      if (this.deps.bgAggregate) this.deps.bgAggregate.visible = false;
      if (this.deps.trapdoor) this.deps.trapdoor.container.visible = false;
    });
    if (world) captures.push({ name: 'intgrid', texture: world, startMs: WORLD_PULL_INTGRID_START_MS, durationMs: WORLD_PULL_INTGRID_DURATION_MS, cols, rows });

    const parallax = this.captureParallaxLayer();
    if (parallax) captures.push({ name: 'background', texture: parallax, startMs: WORLD_PULL_BACKGROUND_START_MS, durationMs: 3000, cols, rows });

    const character = this.captureGameLayerGroup([this.deps.entityLayer], () => {
      for (const child of this.deps.entityLayer.children) child.visible = child === this.deps.playerContainer;
    });
    if (character) captures.push({ name: 'character', texture: character, startMs: WORLD_PULL_CHARACTER_START_MS, durationMs: 3000, cols, rows });
    return captures;
  }

  private getSink(): { x: number; y: number } {
    const target = this.deps.trapdoor;
    if (!target) return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
    const worldX = target.x;
    const worldY = target.y - target.height / 2;
    const zoom = this.game.camera.zoom;
    return {
      x: Math.round((worldX - this.game.camera.renderX) * zoom + GAME_WIDTH / 2),
      y: Math.round((worldY - this.game.camera.renderY) * zoom + GAME_HEIGHT / 2),
    };
  }

  private promoteTrapdoor(sink: { x: number; y: number }): void {
    const target = this.deps.trapdoor;
    if (!target || this.promotedTrapdoorState) return;

    const c = target.container;
    this.promotedTrapdoorState = {
      parent: c.parent,
      x: c.x,
      y: c.y,
      sx: c.scale.x,
      sy: c.scale.y,
      visible: c.visible,
    };

    const zoom = this.game.camera.zoom;
    c.visible = true;
    c.scale.set(this.promotedTrapdoorState.sx * zoom, this.promotedTrapdoorState.sy * zoom);
    c.x = sink.x;
    c.y = sink.y + (target.height / 2) * c.scale.y;
    this.game.feedbackOverlayContainer.addChild(c);
  }

  private restoreTrapdoor(): void {
    const state = this.promotedTrapdoorState;
    const target = this.deps.trapdoor;
    if (!state || !target) {
      this.promotedTrapdoorState = null;
      return;
    }

    const c = target.container;
    c.x = state.x;
    c.y = state.y;
    c.scale.set(state.sx, state.sy);
    c.visible = state.visible;
    if (state.parent) state.parent.addChild(c);
    else detachDisplayObject(c);
    this.promotedTrapdoorState = null;
  }

  private showCharacterOverlay(): void {
    if (this.characterOverlay) return;
    const texture = this.captureGameLayerGroup([this.deps.entityLayer], () => {
      for (const child of this.deps.entityLayer.children) child.visible = child === this.deps.playerContainer;
    });
    if (!texture) return;

    const sprite = new Sprite(texture);
    sprite.x = 0;
    sprite.y = 0;
    this.characterOverlayTexture = texture;
    this.characterOverlay = sprite;
    this.game.feedbackOverlayContainer.addChild(sprite);
  }

  private destroyCharacterOverlay(): void {
    if (this.characterOverlay) {
      destroyDisplayObject(this.characterOverlay);
      this.characterOverlay = null;
    }
    if (this.characterOverlayTexture) {
      this.characterOverlayTexture.destroy(true);
      this.characterOverlayTexture = null;
    }
  }

  private captureParallaxLayer(): RenderTexture | null {
    if (!this.game.backgroundContainer.visible) return null;
    const rt = RenderTexture.create({ width: GAME_WIDTH, height: GAME_HEIGHT, resolution: 1, antialias: false });
    rt.source.scaleMode = 'nearest';
    this.game.renderer.render({
      container: this.game.backgroundContainer,
      target: rt,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });

    if (this.deps.bgAggregate?.visible) {
      this.renderBgAggregateTo(rt);
    }
    return rt;
  }

  private renderBgAggregateTo(rt: RenderTexture): void {
    if (!this.deps.fullMapContainer || !this.deps.bgAggregate) return;

    const allLayers = this.getAllGameLayers();
    const layerState = allLayers.map(target => ({ target, visible: target.visible }));
    const fullMapChildState = this.deps.fullMapContainer.children.map(target => ({ target, visible: target.visible }));
    const gc = this.game.gameContainer;
    const prev = { x: gc.x, y: gc.y, sx: gc.scale.x, sy: gc.scale.y };

    try {
      for (const layer of allLayers) layer.visible = layer === this.deps.fullMapContainer;
      for (const child of this.deps.fullMapContainer.children) child.visible = child === this.deps.bgAggregate;

      const zoom = this.game.camera.zoom;
      gc.scale.set(zoom);
      gc.x = Math.round(-this.game.camera.renderX * zoom + GAME_WIDTH / 2);
      gc.y = Math.round(-this.game.camera.renderY * zoom + GAME_HEIGHT / 2);

      this.game.renderer.render({
        container: gc,
        target: rt,
        clear: false,
      });
    } finally {
      gc.x = prev.x;
      gc.y = prev.y;
      gc.scale.set(prev.sx, prev.sy);
      for (const state of layerState) state.target.visible = state.visible;
      for (const state of fullMapChildState) state.target.visible = state.visible;
    }
  }

  private captureGameLayerGroup(visibleLayers: Container[], configure?: () => void): RenderTexture | null {
    if (visibleLayers.length === 0) return null;
    const allLayers = this.getAllGameLayers();
    const layerState = allLayers.map(target => ({ target, visible: target.visible }));
    const childState = this.deps.entityLayer.children.map(target => ({ target, visible: target.visible }));
    const fullMapChildState = this.deps.fullMapContainer?.children.map(target => ({ target, visible: target.visible })) ?? [];
    const gc = this.game.gameContainer;
    const prev = { x: gc.x, y: gc.y, sx: gc.scale.x, sy: gc.scale.y };

    try {
      for (const layer of allLayers) layer.visible = visibleLayers.includes(layer);
      for (const child of this.deps.entityLayer.children) child.visible = true;
      configure?.();

      const zoom = this.game.camera.zoom;
      gc.scale.set(zoom);
      gc.x = Math.round(-this.game.camera.renderX * zoom + GAME_WIDTH / 2);
      gc.y = Math.round(-this.game.camera.renderY * zoom + GAME_HEIGHT / 2);

      const rt = RenderTexture.create({ width: GAME_WIDTH, height: GAME_HEIGHT, resolution: 1, antialias: false });
      rt.source.scaleMode = 'nearest';
      this.game.renderer.render({
        container: gc,
        target: rt,
        clear: true,
        clearColor: [0, 0, 0, 0],
      });
      return rt;
    } finally {
      gc.x = prev.x;
      gc.y = prev.y;
      gc.scale.set(prev.sx, prev.sy);
      for (const state of layerState) state.target.visible = state.visible;
      for (const state of childState) state.target.visible = state.visible;
      for (const state of fullMapChildState) state.target.visible = state.visible;
    }
  }

  private getWorldLayers(): Container[] {
    return [
      this.deps.tilemapContainer,
      this.deps.fullMapContainer,
      this.deps.buildingLayer,
      this.deps.residentsLayer,
      this.deps.fluidLayer,
      this.deps.aboveFluidLayer,
    ].filter((layer): layer is Container => !!layer);
  }

  private getAllGameLayers(): Container[] {
    const layers = this.getWorldLayers();
    if (!layers.includes(this.deps.entityLayer)) layers.push(this.deps.entityLayer);
    return layers;
  }

  private hideIntgridSources(): void {
    this.hideTarget(this.deps.tilemapContainer);
    this.hideTarget(this.deps.buildingLayer);
    this.hideTarget(this.deps.residentsLayer);
    this.hideTarget(this.deps.fluidLayer);
    this.hideTarget(this.deps.aboveFluidLayer);
    if (this.deps.fullMapContainer) {
      for (const child of this.deps.fullMapContainer.children) {
        if (child !== this.deps.bgAggregate) this.hideTarget(child as Container);
      }
    }
  }

  private hideBackgroundSources(): void {
    for (const child of this.game.backgroundContainer.children) {
      this.hideTarget(child as Container);
    }
    if (this.deps.bgAggregate) this.hideTarget(this.deps.bgAggregate);
  }

  private hideTarget(target: Container): void {
    if (this.hiddenSources.some(state => state.target === target)) return;
    this.hiddenSources.push({ target, visible: target.visible });
    target.visible = false;
  }
}
