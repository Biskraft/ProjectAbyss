import { Container } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../Game';
import type { Player } from '@entities/Player';
import { PORTAL_COLOR } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import { EchoPlayer } from '@effects/EchoPlayer';
import { PortalRingEffect } from '@effects/PortalRingEffect';
import { RealityPeelingEffect } from '@effects/RealityPeelingEffect';
import { TransitionOverlay } from '@effects/TransitionOverlay';
import { BgmController } from '@audio/BgmController';
import { clampEffect01 } from './EffectNumeric';

export type ItemWorldTransitionState =
  | 'idle'
  | 'activate'
  | 'reality_peeling'
  | 'echo_spawn'
  | 'echo_walk'
  | 'signal_cut'
  | 'fade_out_hold'
  | 'load_item_world'
  | 'complete';

interface ItemWorldTransitionLayers {
  realityGroups: Array<Array<Container | null | undefined>>;
  fxLayer: Container;
  overlayLayer: Container;
}

interface ItemWorldTransitionDeps {
  game: Game;
  player: Player;
  layers: ItemWorldTransitionLayers;
  onComplete: () => void;
}

export interface ItemWorldTransitionTarget {
  x: number;
  y: number;
  rarity: Rarity;
  container?: Container | null;
}

const ACTIVATE_END = 250;
const PEEL_END = 1450;
const ECHO_SPAWN_END = 2350;
const ECHO_WALK_END = 3750;
const SIGNAL_CUT_END = 4750;
/** 진입 직전 추가 black hold 500ms — IW scene 활성화 전 시각적 buffer. */
const FADE_OUT_HOLD_END = 5250;

export class ItemWorldTransitionController {
  state: ItemWorldTransitionState = 'idle';
  elapsed = 0;
  private target: ItemWorldTransitionTarget | null = null;
  private reality: RealityPeelingEffect | null = null;
  private echo: EchoPlayer | null = null;
  private ring: PortalRingEffect | null = null;
  private overlay: TransitionOverlay | null = null;
  private completed = false;
  private readonly originalPlayerAlpha: number;
  private isolatedEntities: Array<{ child: Container; alpha: number; visible: boolean }> = [];

  constructor(private readonly deps: ItemWorldTransitionDeps) {
    this.originalPlayerAlpha = deps.player.container.alpha;
  }

  start(target: ItemWorldTransitionTarget): void {
    if (this.state !== 'idle') return;
    this.target = target;
    this.elapsed = 0;
    this.completed = false;
    this.state = 'activate';
    this.deps.game.input.inputLocked = true;
    this.deps.player.vx = 0;
    this.deps.player.vy = 0;

    this.reality = new RealityPeelingEffect(this.deps.layers.realityGroups);
    this.reality.start();

    this.echo = new EchoPlayer();
    this.deps.layers.fxLayer.addChild(this.echo.container);

    this.ring = new PortalRingEffect(
      target.x,
      target.y,
      PORTAL_COLOR[target.rarity],
      target.container ?? null,
    );
    this.deps.layers.fxLayer.addChild(this.ring.container);

    this.overlay = new TransitionOverlay();
    this.deps.layers.overlayLayer.addChild(this.overlay.container);

    this.deps.game.hitstopFrames += 4;
    this.deps.game.camera.shake(2);

    // "낮은 기계음만 유지" — World BGM 을 0.25 까지 빠르게 dim. ItemWorldScene.enter
    // 가 outro fade 로 마무리하므로 dim 은 transition 기간 한정.
    BgmController.setVolumeFactor(0.25, 400);
  }

  update(deltaMS: number): void {
    if (this.state === 'idle' || this.state === 'complete') return;
    if (!this.target) return;

    this.elapsed += deltaMS;
    this.deps.player.vx = 0;
    this.deps.player.vy = 0;
    this.deps.player.savePrevPosition();

    if (this.elapsed < ACTIVATE_END) {
      this.state = 'activate';
      this.ring?.update(deltaMS, this.elapsed / ACTIVATE_END);
      this.overlay?.setDarkness(0);
      return;
    }

    if (this.elapsed < PEEL_END) {
      this.state = 'reality_peeling';
      const t = (this.elapsed - ACTIVATE_END) / (PEEL_END - ACTIVATE_END);
      this.reality?.update(t);
      this.ring?.update(deltaMS, 0.7 + t * 0.3);
      this.overlay?.setDarkness(0);
      return;
    }

    if (this.elapsed < ECHO_SPAWN_END) {
      this.state = 'echo_spawn';
      if (this.echo && !this.echo.container.visible) {
        this.echo.spawnFrom(
          this.deps.player,
          this.deps.game.generateTexture(this.deps.player.container),
          this.deps.player.getEchoWalkFrames(),
        );
        this.isolatePlayerAndTarget();
      }
      const t = (this.elapsed - PEEL_END) / (ECHO_SPAWN_END - PEEL_END);
      this.echo?.separateFromPlayer(t);
      this.deps.player.container.alpha = this.originalPlayerAlpha * (1 - t * 0.55);
      this.ring?.update(deltaMS, 1);
      this.overlay?.setDarkness(0);
      return;
    }

    if (this.elapsed < ECHO_WALK_END) {
      this.state = 'echo_walk';
      const t = (this.elapsed - ECHO_SPAWN_END) / (ECHO_WALK_END - ECHO_SPAWN_END);
      this.echo?.walkIntoPortal(this.target.x, this.target.y, t);
      this.ring?.update(deltaMS, 1);
      this.overlay?.setDarkness(0);
      return;
    }

    if (this.elapsed < SIGNAL_CUT_END) {
      this.state = 'signal_cut';
      const t = (this.elapsed - ECHO_WALK_END) / (SIGNAL_CUT_END - ECHO_WALK_END);
      this.echo?.hide();
      this.fadeIsolatedTarget(t);
      this.ring?.update(deltaMS, 1 - t * 0.15);
      const screenX = this.target.x - this.deps.game.camera.renderX + GAME_WIDTH / 2;
      const screenY = this.target.y - this.deps.game.camera.renderY + GAME_HEIGHT / 2;
      this.overlay?.updateSignalCut(t, screenX, screenY, PORTAL_COLOR[this.target.rarity]);
      return;
    }

    if (this.elapsed < FADE_OUT_HOLD_END) {
      // 진입 fade-out hold — 화면 완전 검은색 유지. scanline/noise/ring 모두 비워
      // 시각 정보를 0 으로 만들고 IW scene 활성화 직전 buffer.
      this.state = 'fade_out_hold';
      this.echo?.hide();
      this.fadeIsolatedTarget(1);
      this.overlay?.holdBlack();
      return;
    }

    this.state = 'load_item_world';
    this.complete();
  }

  complete(): void {
    if (this.completed) return;
    this.completed = true;
    this.state = 'complete';
    this.deps.player.container.alpha = this.originalPlayerAlpha;
    this.deps.game.input.inputLocked = false;
    this.deps.onComplete();
  }

  destroy(): void {
    this.deps.player.container.alpha = this.originalPlayerAlpha;
    this.deps.game.input.inputLocked = false;
    this.restoreIsolatedEntities();
    this.reality?.reset();
    this.echo?.destroy();
    this.ring?.destroy();
    this.overlay?.destroy();
    this.reality = null;
    this.echo = null;
    this.ring = null;
    this.overlay = null;
    this.target = null;
    this.state = 'complete';
    // BGM dim 복귀 — 정상 종료 직후엔 ItemWorldScene.enter 가 stop 하므로 무해.
    // 취소(abort) 경로에서는 World BGM 이 살아있으니 즉시 풀 볼륨 복귀.
    BgmController.setVolumeFactor(1, 200);
  }

  private isolatePlayerAndTarget(): void {
    this.restoreIsolatedEntities();
    const keep = new Set<Container>([
      this.deps.player.container,
      ...(this.target?.container ? [this.target.container] : []),
      ...(this.echo ? [this.echo.container] : []),
      ...(this.ring ? [this.ring.container] : []),
    ]);
    for (const child of this.deps.layers.fxLayer.children) {
      if (!(child instanceof Container)) continue;
      if (keep.has(child)) continue;
      this.isolatedEntities.push({ child, alpha: child.alpha, visible: child.visible });
      child.alpha = 0;
    }
  }

  private fadeIsolatedTarget(t: number): void {
    const alphaT = clampEffect01(t);
    if (this.target?.container) {
      this.target.container.alpha = 1 - alphaT;
    }
    this.deps.player.container.alpha = this.originalPlayerAlpha * (1 - alphaT);
  }

  private restoreIsolatedEntities(): void {
    for (const entry of this.isolatedEntities) {
      entry.child.alpha = entry.alpha;
      entry.child.visible = entry.visible;
    }
    this.isolatedEntities = [];
  }
}
