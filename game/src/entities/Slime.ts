/**
 * Slime.ts
 *
 * Small passive enemy that wanders nearby. Half the size of a Skeleton (8×12).
 * Does not attack first — only has idle and wander behavior.
 * Hops randomly on a short timer when grounded.
 */

import { Assets, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { assetPath } from '@core/AssetLoader';

const HOP_VY = -180;
const WANDER_SPEED = 30;
const HOP_TIMER_MIN = 1500;
const HOP_TIMER_MAX = 3000;
const WANDER_RANGE = 4 * 16; // 4 tiles

const SLIME_SPRITE_PATH = 'assets/characters/slime_01.png';

export class Slime extends Enemy {
  private hopTimer: number;
  private wanderDir = 1;
  private spawnX = 0;
  /** PNG sprite (16×16 정적) — placeholder Graphics 를 가린다. 사용자 결정 2026-05-04. */
  private slimeSprite: Sprite | null = null;

  constructor(level = 1, statsKey: 'Slime' | 'WeakSlime' = 'Slime') {
    super({
      // 사용자 결정 (2026-05-04): 16 → 24px (이미지 사이즈 확장에 맞춤).
      width: 24,
      height: 24,
      color: statsKey === 'WeakSlime' ? 0x88dd88 : 0x44cc44,
      hp: 1, atk: 1, def: 0,          // placeholder — overwritten by applyStats
      detectRange: 0, attackRange: 0,
      moveSpeed: WANDER_SPEED,
      attackCooldown: 0,
    });
    this.applyStats(statsKey, level);

    this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
    if (Math.random() < 0.5) this.wanderDir = -1;
    void this.loadSlimeSprite();
  }

  /**
   * slime_01.png (16×16 정적) 비동기 로드. 로드 실패 시 base Graphics
   * placeholder (녹색 사각형) 가 그대로 보임 (안전 fallback).
   */
  private async loadSlimeSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(SLIME_SPRITE_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      const s = new Sprite(tex);
      // 발 중앙 기준 — 24×24 sprite 가 24×24 collision 박스와 일치.
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      this.container.addChildAt(s, 0);
      this.slimeSprite = s;
      this.mainSprite = s; // Enemy.render 의 hit flash 가 알파 채널 모양 따라 발광
      this.sprite.visible = false;
    } catch {
      // 로드 실패 → placeholder 유지.
    }
  }

  /**
   * Base Enemy.update 의 sprite flip 은 Graphics anchor (0,0) 기반이라 Sprite 에
   * 부적절. wanderDir 기반으로 facing 결정 후 별도 flip.
   */
  override update(dt: number): void {
    super.update(dt);
    // Slime 은 detectRange=0 이라 base 의 target 기반 facing 가 항상 같은 방향.
    // wanderDir 기반으로 강제 갱신.
    this.facingRight = this.wanderDir > 0;
    if (this.slimeSprite) {
      this.slimeSprite.scale.x = this.facingRight ? 1 : -1;
    }
  }

  protected setupStates(): void {
    this.spawnX = this.x;

    this.fsm.addState({
      name: 'idle',
      update: (dt) => {
        // Lazy init spawnX (x is set after constructor)
        if (this.spawnX === 0) this.spawnX = this.x;

        this.vx = this.wanderDir * WANDER_SPEED;

        // Reverse direction at wander boundary
        if (this.x > this.spawnX + WANDER_RANGE) this.wanderDir = -1;
        else if (this.x < this.spawnX - WANDER_RANGE) this.wanderDir = 1;

        this.hopTimer -= dt;
        if (this.hopTimer <= 0 && this.grounded) {
          this.vy = HOP_VY;
          this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
          if (Math.random() < 0.3) this.wanderDir *= -1;
        }
      },
    });

    this.fsm.addState({
      name: 'chase',
      update: () => { this.fsm.transition('idle'); },
    });

    this.fsm.addState({
      name: 'hit',
      update: (dt) => this.stateHitUpdate(dt),
    });

    this.fsm.addState({
      name: 'death',
      update: () => {},
    });

    this.fsm.addState({ name: 'attack',   update: () => {} });
    this.fsm.addState({ name: 'cooldown', update: () => {} });
  }

  isAttackActive(): boolean {
    return false;
  }
}
