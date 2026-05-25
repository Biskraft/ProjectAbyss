import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../Game';
import type { Player } from '@entities/Player';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { WallGate } from '@entities/WallGate';
import { PileDriver } from '@effects/PileDriver';
import { AnvilGateLaser } from '@effects/AnvilGateLaser';
import { ItemWorldLeakageLayer } from '@effects/ItemWorldLeakageLayer';
import { ExitGlow } from '@effects/ExitGlow';
import { aabbOverlap } from '@core/Physics';
import { BgmController } from '@audio/BgmController';
import { AudioBus } from '@audio/AudioBus';

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
  ItemPunch:      4200,  // 1000ms grow/white + ~900ms disassemble/absorb
  CameraPullBack: 4700,  // zoom back out after absorption
  // 사용자 결정 2026-05-25: WallDeployment 길이 2000→1000ms (레이저 발사 후 멈춤 1초로 단축).
  WallDeployment: 5700,  // laser fires (이전 6700)
  CameraReturn:   6200,  // 이전 7200
  // TunnelPan: 카메라가 터널 끝(WallGate)으로 1.2s 슬라이드 + 0.3s hold → Deployed.
  // 진입 방향 = pan 방향 = 플레이어가 가야 할 방향. 영화적 cue.
  TunnelPan:      7700,  // 이전 8700
} as const;

// Elapsed threshold within ItemPunch state at which suck begins.
const PUNCH_SUCK_OFFSET = 1000; // ms after entering ItemPunch

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
const LASER_DESATURATION_MS = 120;
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
  private leakageLayer: ItemWorldLeakageLayer | null = null;
  /** 터널 안쪽 면(좌측 벽)에서 *오른쪽으로* 새어 나오는 빛. 'left' dir 라
   *  glow 가 rightward bleed + dust 입자가 inward(우측)로 부유. Deployed 진입
   *  시 spawn, sequence destroy 시 정리. */
  private tunnelExitGlow: ExitGlow | null = null;
  private tunnelOpened = false;
  private laserDesaturationActive = false;
  private laserDesaturationMs = 0;
  private punchSuckTriggered = false;
  // Item world coords — set in start().
  private anvilX = 0;
  private anvilY = 0;
  // Gate pivot world coords — set in enterState('ItemPunch'), used for suck target.
  private itemPunchOriginX = 0;
  private itemPunchOriginY = 0;
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
    private readonly onItemDissolve: ((targetX: number, targetY: number) => void) | null = null,
    private readonly onItemAbsorbed: (() => void) | null = null,
    private readonly onDeploymentReady: (() => void) | null = null,
  ) {}

  start(anvilX: number, anvilY: number): void {
    this.elapsed = 0;
    this.awakeningShakes = 0;
    this.tunnelOpened = false;
    this.laserDesaturationActive = false;
    this.laserDesaturationMs = 0;
    this.punchSuckTriggered = false;
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
        if (!this.punchSuckTriggered && this.elapsed >= T.ItemZoomIn + PUNCH_SUCK_OFFSET) {
          this.punchSuckTriggered = true;
          // Suck upward into the machine body (64px above gate pivot).
          this.onItemDissolve?.(this.itemPunchOriginX, this.itemPunchOriginY - 64);
        }
        if (this.elapsed >= T.ItemPunch) this.enterState('CameraPullBack');
        break;

      case 'CameraPullBack':
        if (this.elapsed >= T.CameraPullBack) this.enterState('WallDeployment');
        break;

      case 'WallDeployment':
        this.pileDriver?.update(dt);
        this.anvilLaser?.update(dt);
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
        if (this.elapsed >= T.WallDeployment) this.enterState('CameraReturn');
        break;

      case 'CameraReturn':
        if (this.elapsed >= T.CameraReturn) this.enterState('TunnelPan');
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
          this.wallGate?.destroy();
          this.wallGate = null;
          this.state = 'Idle';
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
        // Temporarily redirect camera to the item so zoom-in frames correctly.
        this.game.camera.target = this.getItemFocus?.() ?? { x: this.anvilX, y: this.anvilY };
        this.game.camera.zoomTo(2.5, 0.1);
        break;

      case 'ItemPunch': {
        // Use gate pivot (= where the item icon sits) as the effect origin.
        const pivot = this.getItemFocus?.() ?? { x: this.anvilX, y: this.anvilY - 47 };
        this.itemPunchOriginX = pivot.x;
        this.itemPunchOriginY = pivot.y;
        this.onItemPunchStart?.();
        break;
      }

      case 'CameraPullBack':
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
        const panX = this.tunnelLeft + this.tunnelWidth - TUNNEL_END_INSET;
        const panY = this.tunnelTop + TUNNEL_H / 2;
        this.game.camera.target = { x: panX, y: panY };
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
    this.anvilLaser?.burst();
    this.laserDesaturationMs = LASER_DESATURATION_MS;
    this.setLaserDesaturation(true);
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
    if (!this.wallGate) return;
    const p = this.player;
    if (aabbOverlap(
      { x: p.x, y: p.y, width: p.width, height: p.height },
      this.wallGate.getEntranceAABB(),
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
    this.leakageLayer?.destroy();
    this.leakageLayer = null;
    this.tunnelExitGlow?.destroy();
    this.tunnelExitGlow = null;
    // Restore camera target if destroyed mid-zoom-in sequence.
    if (this.state === 'ItemZoomIn' || this.state === 'ItemPunch') {
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
}
