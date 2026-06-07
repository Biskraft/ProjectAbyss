import { Container, Graphics, Texture } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import type { LdtkEntity, LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import type { LdtkRenderer } from '@level/LdtkRenderer';
import { t } from '@i18n';
import { getProgress01 } from '@scenes/shared/NumericHelpers';
import { destroyNullableDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { applyDefaultWorldAreaRetags } from '@level/LdtkAreaRetagHelpers';
import { filterWorldWallTilesForCollision } from './WorldLdtkTileFilterHelpers';
import { WorldTerrainPaletteRuntime } from './WorldTerrainPaletteRuntime';
import { WorldCommonSpriteRuntime } from './WorldCommonSpriteRuntime';

const PROLOGUE_END_LEVEL = 'ItemStratum_Prologue_04';
const CINEMA_LEVEL = 'Prologue_Cinema_01';
const START_LEVEL = 'Start_Room_01';
const CHAPTER_SCENE = 'chapter_01';
const ENTRY_DELAY_MS = 1500;
const WHITE_HOLD_MS = 2000;
const WHITE_IN_MS = 2500;
const CINEMA_ZOOM_MS = 10000;
const WAKE_UP_MS = 900;
const WAKE_UP_MOVE_UNLOCK_DELAY_MS = 1000;
// Fallback: even with no movement input, the character stands up on its own
// after this hold so the prologue can never get stuck lying down.
const AUTO_WAKE_DELAY_MS = 1200;
const CINEMA_START_ZOOM = 0.1;
const CINEMA_END_ZOOM = 1;
const CINEMA_FADE_START_PROGRESS = 0.68;

interface WorldPrologueEndRuntimeDeps {
  game: Game;
  getLevel: (levelId: string) => LdtkLevel | undefined;
  createRenderer: () => LdtkRenderer;
  getAtlases: () => Texture | Record<string, Texture>;
  getOverlayParent: () => Container;
  getAreaPaletteIds: (levelId: string) => { bgAreaId: string; wallAreaId: string };
  enterChapter1FromPrologue: () => void;
  holdWakeUpPose: () => void;
  playWakeUp: () => void;
  isWakeMovementPressed: () => boolean;
  setCinematicUiVisible: (visible: boolean) => void;
  unlockInput: () => void;
  showToast: (message: string, color: number) => void;
  isPrologueScene: () => boolean;
}

type Phase = 'idle' | 'arm' | 'whiteHold' | 'cinemaFade' | 'awaitWakeInput' | 'wakeUp';

export class WorldPrologueEndRuntime {
  private phase: Phase = 'idle';
  private timer = 0;
  private didHandoff = false;
  private overlayRoot: Container | null = null;
  private whiteOverlay: Graphics | null = null;
  private cinemaRenderer: LdtkRenderer | null = null;
  private startOverlayRenderer: LdtkRenderer | null = null;
  private readonly overlayPaletteRuntime = new WorldTerrainPaletteRuntime();
  private readonly overlayStartPaletteRuntime = new WorldTerrainPaletteRuntime();
  private readonly overlayCommonSpriteRuntime = new WorldCommonSpriteRuntime();
  private readonly overlayStartCommonSpriteRuntime = new WorldCommonSpriteRuntime();

  constructor(private readonly deps: WorldPrologueEndRuntimeDeps) {}

  loadLevel(level: LdtkLevel): void {
    if (this.phase !== 'idle') return;
    if (this.deps.isPrologueScene() && level.identifier === PROLOGUE_END_LEVEL) {
      this.phase = 'arm';
      this.timer = 0;
    }
  }

  startFromItemWorldHandoff(): void {
    this.clear();
    this.beginCinemaOverlay();
  }

  get isPlayerLocked(): boolean {
    return this.phase === 'awaitWakeInput' || this.phase === 'wakeUp';
  }

  get shouldTickWakeUpAnimation(): boolean {
    return this.phase === 'wakeUp' && this.timer < WAKE_UP_MS;
  }

  get shouldHoldWakeUpPose(): boolean {
    return this.phase === 'awaitWakeInput';
  }

  update(dt: number): boolean {
    if (this.phase === 'idle') return false;
    this.timer += dt;

    if (this.phase === 'arm') {
      if (this.timer >= ENTRY_DELAY_MS) this.beginCinemaOverlay();
      return false;
    }

    if (this.phase === 'whiteHold') {
      this.deps.game.camera.setZoom(CINEMA_START_ZOOM);
      this.deps.game.camera.update(dt);
      if (this.whiteOverlay) this.whiteOverlay.alpha = 1;
      this.deps.holdWakeUpPose();
      if (this.timer >= WHITE_HOLD_MS) {
        this.phase = 'cinemaFade';
        this.timer = 0;
      }
      return true;
    }

    if (this.phase === 'cinemaFade') {
      const progress = getProgress01(this.timer, CINEMA_ZOOM_MS);
      const whiteT = getProgress01(this.timer, WHITE_IN_MS);
      const t = this.easeInOut(progress);
      const fadeT = this.easeInOut(getProgress01(progress - CINEMA_FADE_START_PROGRESS, 1 - CINEMA_FADE_START_PROGRESS));
      const zoom = this.lerp(CINEMA_START_ZOOM, CINEMA_END_ZOOM, t);
      this.deps.game.camera.setZoom(zoom);
      this.deps.game.camera.update(dt);
      if (this.whiteOverlay) this.whiteOverlay.alpha = 1 - this.easeInOut(whiteT);
      if (this.overlayRoot) this.overlayRoot.alpha = 1 - fadeT;
      this.overlayCommonSpriteRuntime.update(dt);
      this.overlayStartCommonSpriteRuntime.update(dt);
      this.deps.holdWakeUpPose();
      if (this.timer >= CINEMA_ZOOM_MS) {
        this.destroyWhiteOverlay();
        this.destroyCinemaOverlay();
        this.phase = 'awaitWakeInput';
        this.timer = 0;
      }
      return true;
    }

    if (this.phase === 'awaitWakeInput') {
      this.deps.holdWakeUpPose();
      this.deps.game.camera.update(dt);
      if (this.deps.isWakeMovementPressed() || this.timer >= AUTO_WAKE_DELAY_MS) {
        this.deps.playWakeUp();
        this.phase = 'wakeUp';
        this.timer = 0;
      }
      return false;
    }

    if (this.phase === 'wakeUp') {
      this.deps.game.camera.update(dt);
      if (this.timer >= WAKE_UP_MS + WAKE_UP_MOVE_UNLOCK_DELAY_MS) {
        this.deps.setCinematicUiVisible(true);
        // Release the global input lock held since the item-world handoff so the
        // player can actually move once standing (wake gate used a raw-key bypass).
        this.deps.unlockInput();
        this.deps.showToast(t('ui.prologue.backup_restored'), 0xaaccff);
        this.clear();
      }
      return false;
    }

    return true;
  }

  clear(): void {
    this.phase = 'idle';
    this.timer = 0;
    this.didHandoff = false;
    this.destroyWhiteOverlay();
    this.destroyCinemaOverlay();
  }

  private beginCinemaOverlay(): void {
    if (this.didHandoff) return;
    this.didHandoff = true;
    if (this.deps.game.transitionDirector.isActive) {
      this.runChapter1HandoffUnderCover();
      return;
    }
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      durationOutMs: 0,
      durationInMs: 0,
      holdFrames: 1,
      onSwap: () => this.runChapter1HandoffUnderCover(),
    });
    if (!started) this.runChapter1HandoffUnderCover();
  }

  private runChapter1HandoffUnderCover(): void {
    this.deps.enterChapter1FromPrologue();
    this.deps.setCinematicUiVisible(false);
    this.deps.holdWakeUpPose();
    this.createCinemaOverlay();
    this.createWhiteOverlay();
    this.deps.game.camera.setZoom(CINEMA_START_ZOOM);
    this.phase = 'whiteHold';
    this.timer = 0;
  }

  private createWhiteOverlay(): void {
    this.destroyWhiteOverlay();
    const g = new Graphics();
    g.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0xffffff);
    g.alpha = 1;
    this.whiteOverlay = g;
    this.deps.game.transitionLayer.addChild(g);
  }

  private destroyWhiteOverlay(): void {
    this.whiteOverlay = destroyNullableDisplayObject(this.whiteOverlay);
  }

  private createCinemaOverlay(): void {
    const cinemaLevel = this.deps.getLevel(CINEMA_LEVEL);
    if (!cinemaLevel) return;
    const startLevel = this.deps.getLevel(START_LEVEL);
    const alignmentOffset = startLevel ? this.getCinemaToStartOffset(cinemaLevel, startLevel) : null;
    const rawCinemaWalls = filterWorldWallTilesForCollision({
      wallTiles: cinemaLevel.wallTiles,
      collisionGrid: cinemaLevel.collisionGrid,
    });
    const cinemaInterior = cinemaLevel.interiorTiles.concat(Object.values(cinemaLevel.extraTileLayers).flat());
    const backgroundTiles = this.cloneCinemaTilesOutsideStartBounds(cinemaLevel.backgroundTiles, startLevel, alignmentOffset);
    const wallTiles = this.cloneCinemaTilesOutsideStartBounds(rawCinemaWalls, startLevel, alignmentOffset);
    const shadowTiles = this.cloneCinemaTilesOutsideStartBounds(cinemaLevel.shadowTiles, startLevel, alignmentOffset);
    const interiorTiles = this.cloneCinemaTilesOutsideStartBounds(cinemaInterior, startLevel, alignmentOffset);
    const { bgAreaId, wallAreaId } = this.deps.getAreaPaletteIds(START_LEVEL);
    applyDefaultWorldAreaRetags({
      bgAreaId,
      wallAreaId,
      bgTiles: backgroundTiles,
      wallTiles,
      shadowTiles,
    });

    const renderer = this.deps.createRenderer();
    renderer.renderLevel(
      backgroundTiles,
      wallTiles,
      shadowTiles,
      this.deps.getAtlases(),
      undefined,
      cinemaLevel.collisionGrid,
      interiorTiles,
    );
    this.overlayPaletteRuntime.initializeRenderer(renderer);
    this.overlayPaletteRuntime.applyAreaPalette(bgAreaId, wallAreaId);
    this.overlayPaletteRuntime.applyFilterAreas(cinemaLevel.pxWid, cinemaLevel.pxHei, [
      renderer.bgLayer,
      renderer.wallLayer,
      renderer.interiorLayer,
      renderer.shadowLayer,
    ]);
    this.overlayCommonSpriteRuntime.spawnForLevel(cinemaLevel, renderer.interiorLayer);
    const root = new Container();
    root.addChild(renderer.container);
    if (alignmentOffset) root.position.set(alignmentOffset.x, alignmentOffset.y);
    root.alpha = 1;
    this.overlayRoot = root;
    this.cinemaRenderer = renderer;
    const parent = this.deps.getOverlayParent();
    parent.addChild(root);
    parent.setChildIndex(root, parent.children.length - 1);
  }

  private createStartRoomToneOverlay(startLevel: LdtkLevel, offset: { x: number; y: number }): LdtkRenderer {
    const { bgAreaId, wallAreaId } = this.deps.getAreaPaletteIds(START_LEVEL);
    const backgroundTiles = startLevel.backgroundTiles.map((tile) => ({ ...tile }));
    const wallTiles = filterWorldWallTilesForCollision({
      wallTiles: startLevel.wallTiles,
      collisionGrid: startLevel.collisionGrid,
    }).map((tile) => ({ ...tile }));
    const shadowTiles = startLevel.shadowTiles.map((tile) => ({ ...tile }));
    const interiorTiles = startLevel.interiorTiles
      .concat(Object.values(startLevel.extraTileLayers).flat())
      .map((tile) => ({ ...tile }));

    applyDefaultWorldAreaRetags({
      bgAreaId,
      wallAreaId,
      bgTiles: backgroundTiles,
      wallTiles,
      shadowTiles,
    });

    const renderer = this.deps.createRenderer();
    renderer.renderLevel(
      backgroundTiles,
      wallTiles,
      shadowTiles,
      this.deps.getAtlases(),
      undefined,
      startLevel.collisionGrid,
      interiorTiles,
    );
    this.overlayStartPaletteRuntime.initializeRenderer(renderer);
    this.overlayStartPaletteRuntime.applyAreaPalette(bgAreaId, wallAreaId);
    this.overlayStartPaletteRuntime.applyFilterAreas(startLevel.pxWid, startLevel.pxHei, [
      renderer.bgLayer,
      renderer.wallLayer,
      renderer.interiorLayer,
      renderer.shadowLayer,
    ]);
    this.overlayStartCommonSpriteRuntime.spawnForLevel(startLevel, renderer.interiorLayer);
    renderer.container.position.set(-offset.x, -offset.y);
    return renderer;
  }

  private cloneCinemaTilesOutsideStartBounds(
    tiles: readonly LdtkTile[],
    startLevel: LdtkLevel | undefined,
    offset: { x: number; y: number } | null,
  ): LdtkTile[] {
    return tiles
      .filter((tile) => {
        if (!startLevel || !offset) return true;
        const worldX = tile.px[0] + offset.x;
        const worldY = tile.px[1] + offset.y;
        return worldX < 0 || worldY < 0 || worldX >= startLevel.pxWid || worldY >= startLevel.pxHei;
      })
      .map((tile) => ({ ...tile }));
  }

  private getCinemaToStartOffset(cinemaLevel: LdtkLevel, startLevel: LdtkLevel): { x: number; y: number } | null {
    const cinemaPivot = this.findPlayerPivot(cinemaLevel, CHAPTER_SCENE) ?? this.findPlayerPivot(cinemaLevel);
    const startPivot = this.findPlayerPivot(startLevel, CHAPTER_SCENE) ?? this.findPlayerPivot(startLevel);
    if (!cinemaPivot || !startPivot) return null;

    return {
      x: startPivot.x - cinemaPivot.x,
      y: startPivot.y - cinemaPivot.y,
    };
  }

  private spawnCinemaCommonSprites(
    cinemaLevel: LdtkLevel,
    startLevel: LdtkLevel | undefined,
    offset: { x: number; y: number } | null,
    parent: Container,
  ): void {
    const entities = [...cinemaLevel.entities];
    if (startLevel && offset) {
      for (const entity of startLevel.entities) {
        if (entity.type !== 'CommonSprite' && entity.type !== 'commonSprite') continue;
        entities.push(this.remapStartEntityToCinemaLocal(entity, offset));
      }
    }
    this.overlayCommonSpriteRuntime.spawnForLevel({ ...cinemaLevel, entities }, parent);
  }

  private remapStartEntityToCinemaLocal(entity: LdtkEntity, offset: { x: number; y: number }): LdtkEntity {
    return {
      ...entity,
      px: [entity.px[0] - offset.x, entity.px[1] - offset.y],
      grid: [entity.grid[0] - Math.round(offset.x / 16), entity.grid[1] - Math.round(offset.y / 16)],
    };
  }

  private replaceAlignedTiles(cinemaTiles: readonly LdtkTile[], startTiles: readonly LdtkTile[], offset: { x: number; y: number }): LdtkTile[] {
    if (startTiles.length === 0) return [...cinemaTiles];

    const startByWorldPx = new Map<string, LdtkTile>();
    for (const tile of startTiles) {
      startByWorldPx.set(this.tileKey(tile.px[0], tile.px[1]), tile);
    }

    return cinemaTiles.map((tile) => {
      const replacement = startByWorldPx.get(this.tileKey(tile.px[0] + offset.x, tile.px[1] + offset.y));
      if (!replacement) return tile;
      return {
        ...replacement,
        px: [tile.px[0], tile.px[1]] as [number, number],
      };
    });
  }

  private tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private findPlayerPivot(level: LdtkLevel, scene?: string): { x: number; y: number } | null {
    for (const entity of level.entities) {
      if (entity.type !== 'Player') continue;
      if (scene && entity.fields.Scene !== scene) continue;
      return { x: entity.px[0], y: entity.px[1] };
    }
    return null;
  }

  private destroyCinemaOverlay(): void {
    this.overlayCommonSpriteRuntime.clear();
    this.overlayStartCommonSpriteRuntime.clear();
    this.overlayRoot = destroyNullableDisplayObject(this.overlayRoot);
    this.cinemaRenderer = null;
    this.startOverlayRenderer = null;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }
}
