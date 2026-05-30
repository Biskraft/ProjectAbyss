import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import type { Player } from '@entities/Player';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { WallGate } from '@entities/WallGate';
import { PileDriver } from '@effects/PileDriver';
import { AnvilGateLaser } from '@effects/AnvilGateLaser';
import { ItemWorldLeakageLayer } from '@effects/ItemWorldLeakageLayer';
import { ItemWorldForgeBirth } from '@effects/ItemWorldForgeBirth';
import { ExitGlow } from '@effects/ExitGlow';
import { aabbOverlap, type AABB } from '@core/Physics';
import { BgmController } from '@audio/BgmController';
import { AudioBus } from '@audio/AudioBus';
import type { ItemInstance } from '@items/ItemInstance';

type DeployState =
  | 'Idle'
  | 'ItemInserted'
  | 'Awakening'
  | 'ItemZoomIn'
  | 'ItemPunch'
  | 'CameraPullBack'
  | 'WallDeployment'
  | 'CameraReturn'
  | 'TunnelPan'
  | 'Deployed'
  | 'EnteringWorld';

// Cumulative elapsed thresholds (ms) from sequence start.
// WorldLeakage overlaps WallDeployment end — added in M4.
// ItemZoomIn/ItemPunch inserted between Awakening and CameraPullBack (M6).
const T = {
  ItemInserted:    500,
  Awakening:      1500,
  ItemZoomIn:     2300,  // zoom-in finishes before item punch starts
  ItemPunch:      4200,  // placed item grows and travels to the laser entrance
  CameraPullBack: 4700,  // zoom back out after the item reaches the laser entrance
  // Fallback only; normal WallDeployment exit is measured from the actual
  // laser burst so builder/non-builder timings both hold consistently.
  WallDeployment: 5700,
  CameraReturn:   6200,  // 이전 7200
  // TunnelPan: 카메라가 터널 끝(WallGate)으로 1.2s 슬라이드 + 0.3s hold → Deployed.
  // 진입 방향 = pan 방향 = 플레이어가 가야 할 방향. 영화적 cue.
  TunnelPan:      7700,  // 이전 8700
} as const;

// Awakening shakes: 4 pulses starting at T.ItemInserted, 250 ms apart.
const SHAKE_INTERVAL = 250;
const SHAKE_COUNT = 4;
const SHAKE_INTENSITY = 1.5;

// Deployment tunnel geometry (tiles × 16 px).
const TUNNEL_OFFSET = 128;  // tunnel entrance 8 tiles right of anvil
const TUNNEL_W_MIN  = 32;   // minimum tunnel depth if builder ref is absent
const TUNNEL_H      = 320;  // px tunnel height (20 tiles: original 8 + 8 up + 4 down)
const TUNNEL_Y_RAISE = 0;   // px: tunnel bottom flush with anvil Y
const TUNNEL_END_INSET = 8;
const LASER_DESATURATION_MS = 1000;
const LASER_FIRE_FREEZE_MS = 2000;
const SCREEN_GLASS_CRACK_MS = 980;
const ITEM_BIRTH_LASER_FRONT_OFFSET = 48;
const ITEM_MOVE_TO_LASER_DURATION = 1400;
const LASER_CAMERA_PAN_OFFSET_PX = 20 * 16;
const LASER_CAMERA_RETURN_DELAY_MS = 500;
// ExitGlow 시작 x = tunnelLeft + 이 offset. anvil + 인근 영역 회피하고 벽
// 시작점부터 dust 출현. 사용자 결정 2026-05-24: 8 cell (128px).
const EXIT_GLOW_X_OFFSET = 128;

export class ItemDeploymentController {
  private state: DeployState = 'Idle';
  private elapsed = 0;
  private wallGate: WallGate | null = null;
  private fadeOverlay: Graphics | null = null;
  private fadeElapsed = 0;
  private awakeningShakes = 0;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private pileDriver: PileDriver | null = null;
  private anvilLaser: AnvilGateLaser | null = null;
  private itemBirthFx: ItemWorldForgeBirth | null = null;
  private screenGlassCrack: Graphics | null = null;
  private screenGlassCrackMs = -1;
  private screenGlassOriginX = GAME_WIDTH * 0.5;
  private screenGlassOriginY = GAME_HEIGHT * 0.5;
  private leakageLayer: ItemWorldLeakageLayer | null = null;
  /** 터널 안쪽 면(좌측 벽)에서 *오른쪽으로* 새어 나오는 빛. 'left' dir 라
   *  glow 가 rightward bleed + dust 입자가 inward(우측)로 부유. Deployed 진입
   *  시 spawn, sequence destroy 시 정리. */
  private tunnelExitGlow: ExitGlow | null = null;
  private tunnelOpened = false;
  private laserDesaturationActive = false;
  private laserDesaturationMs = 0;
  private laserBurstElapsed = -1;
  private laserCameraTarget: { x: number; y: number } | null = null;
  private laserCameraReturnDelayMs = -1;
  private laserCameraReturned = false;
  private laserPiecesReleased = false;
  private itemBirthRevealed = false;
  // Item world coords — set in start().
  private anvilX = 0;
  private anvilY = 0;
  // Tunnel world coords — set in start(), used by WallDeployment and onOpenTunnel.
  private tunnelLeft  = 0;
  private tunnelTop   = 0;
  private tunnelWidth = 0;

  /**
   * True while the sequence is animating (all states except Idle and Deployed).
   * The scene should early-return on update and keep input locked while this is true.
   */
  get isBlocking(): boolean {
    return this.state !== 'Idle' && this.state !== 'Deployed';
  }

  get isActive(): boolean {
    return this.state !== 'Idle';
  }

  releaseItemBirthPieces(): void {
    if (this.laserPiecesReleased) return;
    this.itemBirthFx?.releaseFloatingPieces();
    this.laserPiecesReleased = true;
  }

  constructor(
    private readonly game: Game,
    private readonly player: Player,
    private readonly entityLayer: Container,
    private readonly onPushScene: () => void,
    private readonly builder: GiantBuilder | null = null,
    private readonly onStrikeEffect: ((x: number, y: number) => void) | null = null,
    private readonly onOpenTunnel: ((x: number, y: number, w: number, h: number) => void) | null = null,
    private readonly tunnelRightEdge: number | null = null,
    private readonly getLaserOrigin: (() => { x: number; y: number } | null) | null = null,
    private readonly laserLayer: Container | null = null,
    private readonly onLaserDesaturation: ((active: boolean) => void) | null = null,
    /** Called lazily at punch-state entry — texture will be cached by then. */
    private readonly getItemFocus: (() => { x: number; y: number } | null) | null = null,
    /** Starts the punch/white animation on the item icon already placed on the anvil. */
    private readonly onItemPunchStart: (() => void) | null = null,
    private readonly onItemMoveToLaser: ((targetX: number, targetY: number) => void) | null = null,
    private readonly onItemAbsorbed: (() => void) | null = null,
    private readonly onDeploymentReady: (() => void) | null = null,
    private readonly getEntranceAABB: (() => AABB | null) | null = null,
    private readonly getBirthItem: (() => ItemInstance | null) | null = null,
    private readonly itemBirthLayer: Container | null = null,
  ) {}

  start(anvilX: number, anvilY: number): void {
    this.elapsed = 0;
    this.awakeningShakes = 0;
    this.tunnelOpened = false;
    this.laserDesaturationActive = false;
    this.laserDesaturationMs = 0;
    this.laserBurstElapsed = -1;
    this.laserCameraTarget = null;
    this.laserCameraReturnDelayMs = -1;
    this.laserCameraReturned = false;
    this.laserPiecesReleased = false;
    this.itemBirthRevealed = false;
    this.anvilX = anvilX;
    this.anvilY = anvilY;
    this.game.input.inputLocked = true;

    // Tunnel entrance: TUNNEL_OFFSET px right of anvil.
    this.tunnelLeft = anvilX + TUNNEL_OFFSET;
    const tunnelBottom = anvilY - TUNNEL_Y_RAISE;
    this.tunnelTop = tunnelBottom - TUNNEL_H;

    // Extend tunnel to the right edge of the builder level.
    // Falls back to TUNNEL_W_MIN if no builder reference is available.
    const builderRight = this.builder ? this.builder.container.x + this.builder.widthPx : null;
    const rightEdge = Math.max(
      this.tunnelLeft + TUNNEL_W_MIN,
      this.tunnelRightEdge ?? builderRight ?? this.tunnelLeft + TUNNEL_W_MIN,
    );
    this.tunnelWidth = rightEdge - this.tunnelLeft;

    const exitX = this.tunnelLeft + this.tunnelWidth;
    const entranceX = Math.max(this.tunnelLeft, exitX - TUNNEL_END_INSET);

    // LeakageLayer at tunnel exit — orange glow visible from inside the tunnel.
    this.leakageLayer = new ItemWorldLeakageLayer(entranceX, tunnelBottom, 32, TUNNEL_H);
    this.entityLayer.addChild(this.leakageLayer.container);

    // WallGate: invisible AABB trigger at tunnel exit.
    this.wallGate = new WallGate(entranceX, tunnelBottom, TUNNEL_H);
    this.entityLayer.addChild(this.wallGate.container);

    this.enterState('ItemInserted');
  }

  update(dt: number): void {
    if (this.state === 'Idle') return;

    if (this.state !== 'Deployed' && this.state !== 'EnteringWorld') {
      this.elapsed += dt;
    }

    this.leakageLayer?.update(dt);
    this.itemBirthFx?.update(dt);
    this.updateScreenGlassCrack(dt);

    switch (this.state) {
      case 'ItemInserted':
        if (this.elapsed >= T.ItemInserted) this.enterState('Awakening');
        break;

      case 'Awakening': {
        // Fire shake pulses at 250 ms intervals during the awakening window.
        while (
          this.awakeningShakes < SHAKE_COUNT &&
          this.elapsed >= T.ItemInserted + this.awakeningShakes * SHAKE_INTERVAL
        ) {
          this.game.camera.shake(SHAKE_INTENSITY);
          this.awakeningShakes++;
        }
        if (this.elapsed >= T.Awakening) this.enterState('ItemZoomIn');
        break;
      }

      case 'ItemZoomIn':
        if (this.elapsed >= T.ItemZoomIn) this.enterState('ItemPunch');
        break;

      case 'ItemPunch':
        if (!this.itemBirthRevealed && this.elapsed >= T.ItemZoomIn + ITEM_MOVE_TO_LASER_DURATION) {
          this.itemBirthFx?.revealItem();
          this.itemBirthRevealed = true;
        }
        if (this.elapsed >= T.ItemPunch) this.enterState('CameraPullBack');
        break;

      case 'CameraPullBack':
        if (this.elapsed >= T.CameraPullBack) this.enterState('WallDeployment');
        break;

      case 'WallDeployment':
        this.pileDriver?.update(dt);
        this.anvilLaser?.update(dt);
        this.updateLaserCameraReturn(dt);
        {
          const shake = this.anvilLaser?.consumeShake() ?? 0;
          if (shake > 0) this.game.camera.shake(shake);
        }
        if (this.laserDesaturationActive) {
          this.laserDesaturationMs -= dt;
          if (this.laserDesaturationMs <= 0) this.setLaserDesaturation(false);
        }
        if (!this.builder && !this.tunnelOpened && this.elapsed >= T.CameraPullBack + 200) {
          this.openTunnelWithLaser();
        }
        if (this.builder && !this.tunnelOpened && this.elapsed >= T.CameraPullBack + 850) {
          this.openTunnelWithLaser();
        }
        if (this.laserBurstElapsed >= 0) {
          if (this.elapsed >= this.laserBurstElapsed + LASER_FIRE_FREEZE_MS) {
            this.enterState('CameraReturn');
          }
        } else if (this.elapsed >= T.WallDeployment) {
          this.enterState('CameraReturn');
        }
        break;

      case 'CameraReturn':
        if (this.elapsed >= T.CameraReturn) this.enterState('Deployed');
        break;

      case 'TunnelPan':
        if (this.elapsed >= T.TunnelPan) this.enterState('Deployed');
        break;

      case 'Deployed':
        this.tunnelExitGlow?.setPlayer(
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2,
        );
        this.tunnelExitGlow?.update(dt);
        this.checkEntrance();
        break;

      case 'EnteringWorld':
        this.fadeElapsed += dt;
        if (this.fadeOverlay) {
          this.fadeOverlay.alpha = Math.min(1, this.fadeElapsed / 250);
        }
        if (this.fadeElapsed >= 250) {
          // Remove overlay before pushing scene — legacyUIContainer is shared
          // across scenes, so the black rect would cover ItemWorldScene tiles.
          if (this.fadeOverlay?.parent) {
            this.fadeOverlay.parent.removeChild(this.fadeOverlay);
            this.fadeOverlay.destroy();
            this.fadeOverlay = null;
          }
          // Deployment effect 자식은 LdtkWorld 의 entityLayer 자식이라 scene 의
          // visible=false 가 전파되어야 정상인데, GlowFilter halo / dust 입자가
          // PIXI texture cache 에 잔상으로 남아 새 씬 위에 비치는 케이스가 있음.
          // 명시적 destroy 로 fragment 완전 제거 (2026-05-24).
          this.tunnelExitGlow?.destroy();
          this.tunnelExitGlow = null;
          this.leakageLayer?.destroy();
          this.leakageLayer = null;
          this.itemBirthFx?.destroy();
          this.itemBirthFx = null;
          this.destroyScreenGlassCrack();
          this.wallGate?.destroy();
          this.wallGate = null;
          this.state = 'Idle';
          this.game.camera.unlockZoom();
          this.game.input.inputLocked = false;
          this.onPushScene();
        }
        break;
    }
  }

  private enterState(next: DeployState): void {
    this.state = next;
    switch (next) {
      case 'Awakening':
        this.builder?.setAwakeningMode(true);
        BgmController.setVolumeFactor(0.4, 500);
        this.startHum();
        break;

      case 'ItemZoomIn':
        // Temporarily redirect camera to the forged item birth point so zoom-in frames correctly.
        this.game.camera.target = this.getItemBirthFocus();
        this.game.camera.zoomTo(2.5, 0.1);
        this.startItemBirthFx();
        break;

      case 'ItemPunch': {
        this.onItemPunchStart?.();
        const focus = this.getItemBirthFocus();
        this.onItemMoveToLaser?.(focus.x, focus.y);
        break;
      }

      case 'CameraPullBack':
        if (!this.itemBirthRevealed) {
          this.itemBirthFx?.revealItem();
          this.itemBirthRevealed = true;
        }
        this.onItemAbsorbed?.();
        // Restore camera follow target to player before zooming out.
        this.game.camera.target = this.player;
        this.game.camera.zoomTo(0.6, 0.06);
        break;

      case 'WallDeployment':
        {
          const origin = this.getLaserOrigin?.() ?? {
            x: this.tunnelLeft,
            y: this.tunnelTop + TUNNEL_H / 2,
          };
          const targetX = this.tunnelLeft + this.tunnelWidth;
          this.anvilLaser = new AnvilGateLaser(origin.x, origin.y, targetX);
          (this.laserLayer ?? this.entityLayer).addChild(this.anvilLaser.container);
        }
        if (this.builder) {
          // PileDriver aims at the left wall of the tunnel (entrance point).
          const targetX = this.tunnelLeft;
          const targetY = this.tunnelTop + TUNNEL_H / 2;
          this.pileDriver = new PileDriver(
            this.builder, targetX, targetY,
            (idx) => this.handleStrikeImpact(idx),
          );
          this.entityLayer.addChild(this.pileDriver.container);
        }
        break;

      case 'CameraReturn':
        this.returnLaserCameraToPlayer();
        this.pileDriver?.destroy();
        this.pileDriver = null;
        this.anvilLaser?.destroy();
        this.anvilLaser = null;
        this.setLaserDesaturation(false);
        this.game.camera.zoomTo(1.0, 0.08);
        break;

      case 'TunnelPan': {
        // 카메라를 터널 끝(WallGate 위치)으로 redirect — 플레이어에게 진입
        // 방향 영화적 cue. isBlocking=true 이라 input lock 유지.
        this.game.camera.target = this.player;
        break;
      }

      case 'Deployed':
        this.game.input.inputLocked = false;
        // 카메라 target 복귀.
        this.game.camera.target = this.player;
        this.stopHum(0.4);
        BgmController.setVolumeFactor(1.0, 500);
        this.onDeploymentReady?.();
        // 터널 dust 트레일 — anvil sprite 너머 *벽 시작점* 부터 출현.
        // gradient glow band 는 비활성(showGlow=false) — 사용자 결정 2026-05-24:
        // anvil 톤과 잘 안 어울리므로 dust 만 유지.
        // dust 도달 거리 = 터널 끝까지 (= tunnelWidth - offset). 입자 개수도 자동
        // 스케일되어 가로 전 구간 고른 밀도 확보.
        if (!this.tunnelExitGlow) {
          const startX = this.tunnelLeft + EXIT_GLOW_X_OFFSET;
          const dustReachPx = Math.max(64, this.tunnelWidth - EXIT_GLOW_X_OFFSET);
          this.tunnelExitGlow = new ExitGlow(
            'left', startX, this.tunnelTop, TUNNEL_H,
            { showGlow: false, dustReachPx, evenSpread: true },
          );
          this.entityLayer.addChild(this.tunnelExitGlow.container);
        }
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

  // ── Synth hum (placeholder until builder_awaken_hum.ogg lands) ──────────

  private startHum(): void {
    // 사용자 결정 2026-05-25: anvil 발사 시 *부우우웅* placeholder hum 제거.
    //   builder_awaken_hum.ogg 도착 시 여기서 SoundManager 호출로 교체 예정.
    //   기존 sawtooth 82Hz hum 코드는 git history 에 보존.
  }

  private stopHum(fadeSec = 0.3): void {
    if (!this.humOsc || !this.humGain) return;
    const ctx = AudioBus.getContext();
    const osc = this.humOsc;
    const gain = this.humGain;
    this.humOsc = null;
    this.humGain = null;

    if (ctx) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeSec);
    }
    window.setTimeout(() => {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* ok */ }
      try { gain.disconnect(); } catch { /* ok */ }
    }, fadeSec * 1000 + 100);
  }

  // ── Strike impact ────────────────────────────────────────────────────────

  private handleStrikeImpact(strikeIdx: number): void {
    this.game.camera.shake(strikeIdx === 2 ? 12 : 6);

    // Sparks at tunnel entrance (where PileDriver strikes).
    this.onStrikeEffect?.(this.tunnelLeft, this.tunnelTop + TUNNEL_H / 2);

    // Final strike: open the tunnel in the tilemap and begin leakage fade-in.
    if (strikeIdx === 2) {
      this.openTunnelWithLaser();
    }
  }

  private openTunnelWithLaser(): void {
    if (this.tunnelOpened) return;
    this.tunnelOpened = true;
    this.laserBurstElapsed = this.elapsed;
    this.anvilLaser?.burst();
    this.itemBirthFx?.strike();
    // this.startScreenGlassCrack();
    this.startLaserCameraPan();
    this.game.hitstopFrames = Math.max(this.game.hitstopFrames, 8);
    this.laserDesaturationMs = LASER_DESATURATION_MS;
    this.setLaserDesaturation(true);
    this.game.camera.lockZoom(1.0);
    this.game.camera.shake(14);
    this.onOpenTunnel?.(this.tunnelLeft, this.tunnelTop, this.tunnelWidth, TUNNEL_H);
    this.leakageLayer?.startFade();
  }

  private setLaserDesaturation(active: boolean): void {
    if (this.laserDesaturationActive === active) return;
    this.laserDesaturationActive = active;
    this.onLaserDesaturation?.(active);
  }

  // ── Overlap check ────────────────────────────────────────────────────────

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

  // ── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopHum(0.1);
    this.builder?.setAwakeningMode(false);
    BgmController.setVolumeFactor(1.0, 200);
    this.pileDriver?.destroy();
    this.pileDriver = null;
    this.anvilLaser?.destroy();
    this.anvilLaser = null;
    this.setLaserDesaturation(false);
    this.game.camera.unlockZoom();
    this.leakageLayer?.destroy();
    this.leakageLayer = null;
    this.itemBirthFx?.destroy();
    this.itemBirthFx = null;
    this.destroyScreenGlassCrack();
    this.tunnelExitGlow?.destroy();
    this.tunnelExitGlow = null;
    // Restore camera target if destroyed mid-zoom-in sequence.
    if (this.state === 'ItemZoomIn' || this.state === 'ItemPunch' || this.laserCameraTarget) {
      this.game.camera.target = this.player;
    }
    if (this.fadeOverlay?.parent) {
      this.fadeOverlay.parent.removeChild(this.fadeOverlay);
      this.fadeOverlay.destroy();
      this.fadeOverlay = null;
    }
    this.wallGate?.destroy();
    this.wallGate = null;
    this.state = 'Idle';
  }

  private startItemBirthFx(): void {
    if (this.itemBirthFx) return;
    const item = this.getBirthItem?.();
    if (!item) return;
    const focus = this.getItemBirthFocus();
    const targetInsetX = 64;
    const targetInsetY = 42;
    const targetWidth = Math.max(96, this.tunnelWidth - targetInsetX - 24);
    const targetHeight = Math.max(96, TUNNEL_H - targetInsetY * 2);
    this.itemBirthFx = new ItemWorldForgeBirth({
      item,
      x: focus.x,
      y: focus.y,
      targetX: this.tunnelLeft + targetInsetX,
      targetY: this.tunnelTop + targetInsetY,
      targetWidth,
      targetHeight,
    });
    (this.itemBirthLayer ?? this.entityLayer).addChild(this.itemBirthFx.container);
    this.itemBirthFx.start(false);
  }

  private startScreenGlassCrack(): void {
    this.destroyScreenGlassCrack();
    const focus = this.getItemBirthFocus();
    const zoom = this.game.camera.zoom;
    this.screenGlassOriginX = Math.round((focus.x - this.game.camera.renderX) * zoom + GAME_WIDTH / 2);
    this.screenGlassOriginY = Math.round((focus.y - this.game.camera.renderY) * zoom + GAME_HEIGHT / 2);
    this.screenGlassCrack = new Graphics();
    this.screenGlassCrack.eventMode = 'none';
    this.game.feedbackOverlayContainer.addChild(this.screenGlassCrack);
    this.screenGlassCrackMs = 0;
    this.drawScreenGlassCrack();
  }

  private getItemBirthFocus(): { x: number; y: number } {
    const laserOrigin = this.getLaserOrigin?.();
    if (laserOrigin) {
      return {
        x: laserOrigin.x + ITEM_BIRTH_LASER_FRONT_OFFSET,
        y: laserOrigin.y,
      };
    }
    return this.getItemFocus?.() ?? { x: this.anvilX, y: this.anvilY - 47 };
  }

  private getPlayerCameraCenter(): { x: number; y: number } {
    return {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
    };
  }

  private startLaserCameraPan(): void {
    this.laserCameraTarget = {
      x: this.game.camera.x + LASER_CAMERA_PAN_OFFSET_PX,
      y: this.game.camera.y,
    };
    this.laserCameraReturnDelayMs = -1;
    this.laserCameraReturned = false;
    this.game.camera.setLookAhead(0);
    this.game.camera.lookDirection = 0;
    this.game.camera.target = this.laserCameraTarget;
  }

  private updateLaserCameraReturn(dt: number): void {
    if (!this.laserCameraTarget || this.laserCameraReturned || !this.anvilLaser?.isDone) return;
    this.laserCameraReturnDelayMs = Math.max(0, this.laserCameraReturnDelayMs) + dt;
    if (this.laserCameraReturnDelayMs >= LASER_CAMERA_RETURN_DELAY_MS) {
      this.returnLaserCameraToPlayer();
    }
  }

  private returnLaserCameraToPlayer(): void {
    if (this.laserCameraReturned) return;
    this.game.camera.target = this.getPlayerCameraCenter();
    this.laserCameraTarget = null;
    this.laserCameraReturnDelayMs = -1;
    this.laserCameraReturned = true;
  }

  private updateScreenGlassCrack(dt: number): void {
    if (!this.screenGlassCrack || this.screenGlassCrackMs < 0) return;
    this.screenGlassCrackMs += dt;
    if (this.screenGlassCrackMs >= SCREEN_GLASS_CRACK_MS) {
      this.destroyScreenGlassCrack();
      return;
    }
    this.drawScreenGlassCrack();
  }

  private drawScreenGlassCrack(): void {
    if (!this.screenGlassCrack) return;
    const t = Math.min(1, this.screenGlassCrackMs / SCREEN_GLASS_CRACK_MS);
    const spread = Math.min(1, t / 0.45);
    const fade = t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.28);
    const ox = Math.max(0, Math.min(GAME_WIDTH, this.screenGlassOriginX));
    const oy = Math.max(0, Math.min(GAME_HEIGHT, this.screenGlassOriginY));
    const g = this.screenGlassCrack;
    g.clear();

    g.rect(ox, 0, Math.max(0, GAME_WIDTH - ox), GAME_HEIGHT)
      .fill({ color: 0x020307, alpha: 0.06 * fade * spread });

    for (let i = 0; i < 12; i++) {
      const k = i / 11;
      const angle = -0.84 + k * 1.68 + Math.sin(i * 8.23) * 0.07;
      const len = (GAME_WIDTH - ox + 80 + (i % 3) * 48) * spread;
      const midX = ox + len * (0.32 + (i % 4) * 0.035);
      const midY = oy + Math.sin(angle) * len * 0.22 + (i % 2 ? 10 : -10) * spread;
      const x1 = ox + Math.cos(angle) * len;
      const y1 = oy + Math.sin(angle) * len;
      g.moveTo(ox, oy)
        .lineTo(midX, midY)
        .lineTo(x1, y1)
        .stroke({ color: 0xffffff, width: 1.2 + spread * 1.1, alpha: 0.86 * fade });
      g.moveTo(ox, oy)
        .lineTo(midX, midY)
        .lineTo(x1, y1)
        .stroke({ color: 0x61d6ff, width: 5 + spread * 8, alpha: 0.12 * fade });
      if (i % 3 === 1) {
        const forkX = midX + 28 * spread;
        const forkY = midY + (i % 2 === 0 ? -34 : 34) * spread;
        g.moveTo(midX, midY)
          .lineTo(forkX, forkY)
          .stroke({ color: 0xffffff, width: 0.9 + spread, alpha: 0.55 * fade });
      }
    }

    const slitW = 18 + spread * 34;
    g.poly([
      ox + 8 * spread, oy - 10,
      GAME_WIDTH, oy - 34 * spread,
      GAME_WIDTH, oy + 34 * spread,
      ox + slitW, oy + 10,
    ]).fill({ color: 0x000000, alpha: 0.12 * fade * spread });
  }

  private destroyScreenGlassCrack(): void {
    this.screenGlassCrackMs = -1;
    if (!this.screenGlassCrack) return;
    this.screenGlassCrack.parent?.removeChild(this.screenGlassCrack);
    this.screenGlassCrack.destroy();
    this.screenGlassCrack = null;
  }
}
