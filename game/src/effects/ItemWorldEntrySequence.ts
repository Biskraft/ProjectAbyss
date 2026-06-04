import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import type { Player } from '@entities/Player';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { WallGate } from '@entities/WallGate';
import { aabbOverlap, type AABB } from '@core/Physics';
import { BgmController } from '@audio/BgmController';
import type { ItemInstance } from '@items/ItemInstance';
import type {
  ItemDeploymentStreamWorldOptions,
  ItemDeploymentTunnelOpenOptions,
} from '@effects/ItemDeploymentTypes';

type GrowthDeployState =
  | 'Idle'
  | 'Anticipation'
  | 'GrowingWorld'
  | 'PlatformReady'
  | 'Deployed'
  | 'EnteringWorld';

const TUNNEL_OFFSET = 128;
const TUNNEL_W_MIN = 32;
const TUNNEL_H = 320;
const TUNNEL_Y_RAISE = 0;

const GROWTH_ANTICIPATION_MS = 500;
// 무기로 들어가는 연출 길이 2배(1500→3000) — 아이템으로 빨려드는 느낌을 길게.
const GROWTH_PLAYER_READY_MS = 3000;
const GROWTH_PLATFORM_READY_MS = GROWTH_PLAYER_READY_MS;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function growthScaleCurve(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Official anvil -> Item World entry sequence.
 *
 * This owns only the state machine. LDtk stream geometry/collision/rendering is
 * supplied by LdtkWorldScene through callbacks until those systems are further
 * split out.
 */
export class ItemWorldEntrySequence {
  private state: GrowthDeployState = 'Idle';
  private elapsed = 0;
  private fadeOverlay: Graphics | null = null;
  private fadeElapsed = 0;
  private wallGate: WallGate | null = null;
  private tunnelOpened = false;
  private itemAbsorbed = false;
  private anvilX = 0;
  private anvilY = 0;
  private tunnelLeft = 0;
  private tunnelTop = 0;
  private tunnelWidth = 0;
  private tunnelBottom = 0;
  private playerStartX = 0;
  private playerStartY = 0;
  private playerTargetX = 0;
  private playerTargetY = 0;

  get isBlocking(): boolean {
    return this.state === 'EnteringWorld';
  }

  get isActive(): boolean {
    return this.state !== 'Idle';
  }

  get isGrowing(): boolean {
    return this.state === 'Anticipation'
      || this.state === 'GrowingWorld'
      || this.state === 'PlatformReady';
  }

  releaseItemBirthPieces(): void {
    // The official growth sequence has no laser-broken floating shard phase.
  }

  constructor(
    private readonly game: Game,
    private readonly player: Player,
    private readonly entityLayer: Container,
    private readonly onPushScene: () => void,
    private readonly builder: GiantBuilder | null = null,
    private readonly onStrikeEffect: ((x: number, y: number) => void) | null = null,
    private readonly onOpenTunnel: ((x: number, y: number, w: number, h: number, options?: ItemDeploymentTunnelOpenOptions) => void) | null = null,
    private readonly tunnelRightEdge: number | null = null,
    private readonly getLaserOrigin: (() => { x: number; y: number } | null) | null = null,
    private readonly laserLayer: Container | null = null,
    private readonly onLaserDesaturation: ((active: boolean) => void) | null = null,
    private readonly getItemFocus: (() => { x: number; y: number } | null) | null = null,
    private readonly onItemPunchStart: (() => void) | null = null,
    private readonly onItemMoveToLaser: ((targetX: number, targetY: number) => void) | null = null,
    private readonly onItemAbsorbed: (() => void) | null = null,
    private readonly onDeploymentReady: (() => void) | null = null,
    private readonly onPrepareStreamWorld: ((options: ItemDeploymentStreamWorldOptions) => { x: number; y: number } | null) | null = null,
    private readonly onLoadStreamWorld: ((options: ItemDeploymentStreamWorldOptions) => { x: number; y: number } | null) | null = null,
    private readonly getEntranceAABB: (() => AABB | null) | null = null,
    private readonly getPlatformStart: (() => { x: number; y: number } | null) | null = null,
    private readonly getPlatformVisualStart: (() => { x: number; y: number } | null) | null = null,
    private readonly getBirthItem: (() => ItemInstance | null) | null = null,
    private readonly itemBirthLayer: Container | null = null,
  ) {
    void this.entityLayer;
    void this.onStrikeEffect;
    void this.getLaserOrigin;
    void this.laserLayer;
    void this.onLaserDesaturation;
    void this.onItemPunchStart;
    void this.onItemMoveToLaser;
    void this.getBirthItem;
    void this.itemBirthLayer;
  }

  start(anvilX: number, anvilY: number): void {
    this.elapsed = 0;
    this.fadeElapsed = 0;
    this.tunnelOpened = false;
    this.itemAbsorbed = false;
    this.anvilX = anvilX;
    this.anvilY = anvilY;
    this.game.input.inputLocked = true;
    this.game.camera.target = this.player;
    this.game.camera.zoomTo(1.0, 0.025);

    this.tunnelLeft = anvilX + TUNNEL_OFFSET;
    this.tunnelBottom = anvilY - TUNNEL_Y_RAISE;
    this.tunnelTop = this.tunnelBottom - TUNNEL_H;

    const builderRight = this.builder ? this.builder.container.x + this.builder.widthPx : null;
    const rightEdge = Math.max(
      this.tunnelLeft + TUNNEL_W_MIN,
      this.tunnelRightEdge ?? builderRight ?? this.tunnelLeft + TUNNEL_W_MIN,
    );
    this.tunnelWidth = rightEdge - this.tunnelLeft;

    this.enterState('Anticipation');
  }

  update(dt: number): void {
    if (this.state === 'Idle') return;

    if (this.state !== 'Deployed' && this.state !== 'EnteringWorld') {
      this.elapsed += dt;
    }

    if (this.state === 'GrowingWorld' || this.state === 'PlatformReady') {
      this.updatePlayerMoveToStreamStart();
    }

    switch (this.state) {
      case 'Anticipation':
        if (this.elapsed >= GROWTH_ANTICIPATION_MS) {
          this.enterState('GrowingWorld');
        }
        break;

      case 'GrowingWorld':
        if (this.elapsed >= GROWTH_PLAYER_READY_MS) {
          this.enterState('PlatformReady');
          if (this.elapsed >= GROWTH_PLATFORM_READY_MS) this.enterState('Deployed');
        }
        break;

      case 'PlatformReady':
        if (this.elapsed >= GROWTH_PLATFORM_READY_MS) this.enterState('Deployed');
        break;

      case 'Deployed':
        this.checkEntrance();
        break;

      case 'EnteringWorld':
        this.fadeElapsed += dt;
        if (this.fadeOverlay) {
          this.fadeOverlay.alpha = Math.min(1, this.fadeElapsed / 240);
        }
        if (this.fadeElapsed >= 240) {
          this.player.container.alpha = 1;
          this.cleanupVisuals();
          this.state = 'Idle';
          this.game.input.inputLocked = false;
          this.onPushScene();
        }
        break;
    }
  }

  destroy(): void {
    this.cleanupVisuals();
    BgmController.setVolumeFactor(1.0, 200);
    this.game.camera.target = this.player;
    this.game.camera.unlockZoom();
    this.player.container.alpha = 1;
    this.game.input.inputLocked = false;
    this.state = 'Idle';
  }

  private enterState(next: GrowthDeployState): void {
    this.state = next;
    switch (next) {
      case 'Anticipation':
        this.elapsed = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.savePrevPosition();
        this.game.camera.shake(5);
        break;

      case 'GrowingWorld':
        this.elapsed = 0;
        this.startReferenceWorldGrowth();
        break;

      case 'PlatformReady':
        this.finishItemAsPlatform();
        break;

      case 'Deployed':
        this.player.container.alpha = 1;
        this.player.vx = 0;
        this.player.vy = 0;
        this.game.input.inputLocked = false;
        this.player.forceMovementControlReady();
        this.player.savePrevPosition();
        this.game.camera.target = this.player;
        BgmController.setVolumeFactor(1.0, 500);
        this.onDeploymentReady?.();
        break;

      case 'EnteringWorld':
        this.player.vx = 0;
        this.game.input.inputLocked = true;
        this.fadeElapsed = 0;
        this.fadeOverlay = new Graphics();
        this.fadeOverlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
        this.fadeOverlay.alpha = 0;
        this.game.legacyUIContainer.addChild(this.fadeOverlay);
        break;
    }
  }

  private startReferenceWorldGrowth(): void {
    if (this.tunnelOpened) return;
    this.tunnelOpened = true;
    this.game.camera.zoomTo(1.0, 0.025);
    const origin = this.getItemGrowthOrigin();
    // 줌(성장) pivot = 무기(item focus) 위치 — 월드가 무기 지점으로 수렴하며
    // "무기 속으로 들어가는" 느낌. 무기 image(itemSprite)가 origin 에 배치되므로
    // pivot 을 origin 에 맞춰야 무기가 고정 초점으로 남는다.
    // (pivot 은 scale-birth + 성장 스냅샷 양쪽의 확대 중심.)
    const pivotX = origin.x;
    const pivotY = origin.y;
    this.onOpenTunnel?.(this.tunnelLeft, this.tunnelTop, this.tunnelWidth, TUNNEL_H, {
      scheduleGhost: false,
      triggerDirectionalTrail: false,
      ghostBirth: {
        originX: origin.x,
        originY: origin.y,
        pivotX,
        pivotY,
        durationMs: GROWTH_PLAYER_READY_MS,
        // 바닥을 미리 조립하지 않는다 — 플레이어가 움직이며 proximity 로 조립.
        revealAll: false,
        entranceAtEnd: true,
      },
    });
    const previewStart = this.onPrepareStreamWorld?.({
      tunnelX: this.tunnelLeft,
      tunnelY: this.tunnelTop,
      tunnelW: this.tunnelWidth,
      tunnelH: TUNNEL_H,
      originX: origin.x,
      originY: origin.y,
    }) ?? this.getPlatformStart?.();
    this.playerStartX = this.player.x;
    this.playerStartY = this.player.y;
    this.playerTargetX = Math.round(previewStart?.x ?? origin.x - this.player.width / 2);
    this.playerTargetY = Math.round(previewStart?.y ?? origin.y - this.player.height / 2);
    this.itemAbsorbed = true;
    this.onItemAbsorbed?.();
    BgmController.setVolumeFactor(0.65, 300);
  }

  private finishItemAsPlatform(): void {
    if (!this.itemAbsorbed) {
      this.itemAbsorbed = true;
      this.onItemAbsorbed?.();
    }
    const origin = this.getItemGrowthOrigin();
    const platformStart = this.onLoadStreamWorld?.({
      tunnelX: this.tunnelLeft,
      tunnelY: this.tunnelTop,
      tunnelW: this.tunnelWidth,
      tunnelH: TUNNEL_H,
      originX: origin.x,
      originY: origin.y,
    }) ?? this.getPlatformStart?.();
    this.playerTargetX = Math.round(platformStart?.x ?? origin.x - this.player.width / 2);
    this.playerTargetY = Math.round(platformStart?.y ?? origin.y - this.player.height / 2);
    this.player.x = this.playerTargetX;
    this.player.y = this.playerTargetY;
    this.player.container.alpha = 1;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.savePrevPosition();
    this.game.camera.shake(3);
  }

  private getItemGrowthOrigin(): { x: number; y: number } {
    return this.getItemFocus?.() ?? { x: this.anvilX, y: this.anvilY - 47 };
  }

  private updatePlayerMoveToStreamStart(): void {
    const t = clamp01(this.elapsed / GROWTH_PLAYER_READY_MS);
    const moveT = growthScaleCurve(t);
    const visualTarget = this.getPlatformVisualStart?.();
    const targetX = visualTarget?.x ?? this.playerTargetX;
    const targetY = visualTarget?.y ?? this.playerTargetY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.x = lerp(this.playerStartX, targetX, moveT);
    this.player.y = lerp(this.playerStartY, targetY, moveT);
    this.player.container.alpha = 1;
    this.player.savePrevPosition();
  }

  private checkEntrance(): void {
    const entrance = this.getEntranceAABB ? this.getEntranceAABB() : this.wallGate?.getEntranceAABB();
    if (!entrance) return;
    const p = this.player;
    if (aabbOverlap(
      { x: p.x, y: p.y, width: p.width, height: p.height },
      entrance,
    )) {
      this.enterState('EnteringWorld');
    }
  }

  private cleanupVisuals(): void {
    if (this.fadeOverlay?.parent) {
      this.fadeOverlay.parent.removeChild(this.fadeOverlay);
      this.fadeOverlay.destroy();
      this.fadeOverlay = null;
    }
    this.wallGate?.destroy();
    this.wallGate = null;
  }
}
