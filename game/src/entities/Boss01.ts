/**
 * Boss01.ts — 24-frame atlas 기반 보스. Guardian 의 FSM 전체 포팅 + atlas anim 매핑.
 *
 * 설계 의도 (사용자 피드백 2026-05-05):
 *   "빠릿빠릿하고 위협적이고 효과적" 인 Guardian 의 어택 패턴을 보존하면서, 시각만
 *   24-frame atlas 로 교체. Telegraph 점멸 + 거리 기반 패턴 픽 + HP 50% 격노 + slam
 *   3-phase + swipe knockback 모두 그대로.
 *
 * Atlas: game/public/assets/characters/boss_01_atlas.png (1536×64 = 24 × 64×64)
 * JSON:  game/public/assets/characters/boss_01_atlas.json (모든 프레임 100ms)
 *
 * State → Anim 매핑:
 *   idle / detect / chase / cooldown / hit / telegraph    → 'idle'    (0–3 loop)
 *   charge                                                → 'charge'  (16–23 loop)
 *   slam_rise / slam_fall / slam_land                     → 'jump'    (10–15, slam 시퀀스 동안 한 번)
 *   swipe / attack                                        → 'attack1' (4–9 once)
 *
 * Telegraph 점멸은 bossSprite.alpha 토글로 유지 (Guardian 의 this.sprite.alpha 패턴).
 *
 * "기본 이동 없음" 은 chase state 의 moveSpeed=0 으로 처리 — chase FSM 은 살아있어
 * cooldown→chase→telegraph 전이를 그대로 따르되 vx 만 0 으로 잠금. Telegraph / 거리
 * 기반 픽 / 격노 페이즈 모두 보존.
 */

import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { assetPath } from '@core/AssetLoader';

// ── Atlas 사양 (boss_01_atlas.json 과 1:1) ─────────────────────────
const BOSS01_ATLAS_PATH = 'assets/characters/boss_01_atlas.png';
const BOSS01_FRAME_W = 64;
const BOSS01_FRAME_H = 64;
const BOSS01_FRAME_COUNT = 24;
const BOSS01_ANIM_FRAME_MS = 100;

// ── 프레임 범위 (시각 추정 — 첫 플레이 후 조정) ─────────────────────
//   from / to inclusive. loop=true 인 anim 은 영구 사이클, false 는 1회 후
//   마지막 프레임에서 freeze (animFinished 로 FSM 이 다음 state 결정).
//   frameMs?: 프레임별 개별 duration (ms). 길이는 (to-from+1). undefined 시
//   BOSS01_ANIM_FRAME_MS (100) 사용.
type Boss01Anim = 'idle' | 'attack1' | 'jump' | 'charge_prep' | 'charge'
  | 'slam_prep' | 'slam_rising' | 'slam_apex' | 'slam_fall' | 'slam_land';

interface AnimDef {
  from: number;
  to: number;
  loop: boolean;
  frameMs?: number[];
}

// 인덱스 컨벤션: 코드 = 0-indexed (array 위치, JSON 'boss_01 N.ase' N 과 동일).
// User spec 은 Aseprite UI 의 1-indexed 였으므로 모든 spec 값에서 -1 적용됨.
//   user "frame 11" = 코드 from: 10 = bossFrames[10].
// 미사용 인덱스: 9, 21 (24f 중 22f 사용). 트랜지션 자산 후보.
const BOSS01_ANIM_RANGES: Record<Boss01Anim, AnimDef> = {
  // 4f 호흡 (user 1-4). 프레임당 200ms — 기본 100ms 의 2배 (사용자 피드백 2026-05-05).
  idle:        { from: 0,  to: 3,  loop: true,  frameMs: [200, 200, 200, 200] },
  // attack1 (사용자 spec 2026-05-05): user "8" (array 7) = 타격 long hold,
  // user "9, 10" (array 8, 9) = recovery. 8(400ms hit window) → 9(100) → 10(100). 총 600ms.
  attack1:     { from: 7,  to: 9,  loop: false, frameMs: [400, 100, 100] },
  // 'jump' = legacy 단일 anim. 현재는 slam_* 4분할로 대체. fallback 보존.
  jump:        { from: 9,  to: 14, loop: false },

  // Charge telegraph: user "19→20→21" → array 18→19→20. 20 freeze (telegraph 종료).
  charge_prep: { from: 18, to: 20, loop: false },
  // Charge active: user "23" → array 22 단일 프레임.
  charge:      { from: 22, to: 22, loop: false },

  // Slam telegraph (pendingAttack='slam'): user "11" → array 10. telegraph 끝까지 hold.
  slam_prep:   { from: 10, to: 10, loop: false },
  // Slam rise — 상승: user "12" → array 11.
  slam_rising: { from: 11, to: 11, loop: false },
  // Slam rise — apex: user "13" → array 12.
  slam_apex:   { from: 12, to: 12, loop: false },
  // Slam fall (낙하 — slam_fall state, grounded 까지): user "14" → array 13.
  slam_fall:   { from: 13, to: 13, loop: false },
  // Slam land: user "15→16→17→18" → array 14→15→16→17. 각 프레임 100ms 균등.
  //  500ms hold 제거 (사용자 피드백 — freeze 느낌). 총 400ms 로 단축.
  slam_land:   { from: 14, to: 17, loop: false, frameMs: [100, 100, 100, 100] },
};

/**
 * Slam rise 상승→apex 분기 임계값 (px/s).
 * vy 가 -SLAM_APEX_VY_THRESHOLD 보다 크면 (= 정점 근접) apex 프레임 13 으로.
 * -100 = 정점 직전 ~100ms 동안 13 노출 (gravity 980 px/s² 기준).
 */
const SLAM_APEX_VY_THRESHOLD = 100;

// ── Guardian FSM 파라미터 (1:1 포팅) ───────────────────────────────
const TELEGRAPH_DURATION = 500;        // ms — 0.5s warning
const CHARGE_SPEED = 350;              // px/s
const CHARGE_SPEED_ENRAGED = 480;
const CHARGE_DURATION = 600;           // ms
const SLAM_RISE_SPEED = -520;          // px/s (upward)
// SLAM_RISE 는 vy >= 0 (apex) 도달 시 자동 종료 — 고정 timer 미사용.
// 참고치: SLAM_RISE_SPEED -520 / gravity 980 → apex 도달 약 530ms.
const SLAM_RISE_DURATION = 500;        // ms — legacy (max safety timer 재도입 시 활용)
const SLAM_FALL_SPEED = 750;           // px/s (downward)
const SLAM_LAND_DURATION = 400;        // ms — anim 14→15→16→17 (각 100ms) 와 동기. hold 제거
// SLAM_FALL_MIN_MS: slam_fall 진입 후 최소 표시 시간. grounded=true 여도 이 시간
// 동안은 slam_land 로 전이 금지. frame 14 (낙하 포즈) 가 시각적으로 충분히
// 인지되도록 보장. 천장 bump 케이스에서 보스가 일찍 floor 도달 시 ~300ms 정도
// floor 위에서 frame 14 잔류 (의도된 trade-off — frame 14 미표시보다 자연스러움).
const SLAM_FALL_MIN_MS = 300;
const SWIPE_TELEGRAPH = 250;           // ms — shorter telegraph
const SWIPE_DURATION = 600;            // ms — anim attack1 (400+100+100) 와 동기. 8 hold 길게.
const SWIPE_KNOCKBACK = 200;           // px/s — lunge forward
const COOLDOWN_NORMAL = 1200;          // ms
const COOLDOWN_ENRAGED = 700;          // ms

// ── Dust effect (사용자 피드백 2026-05-05) ────────────────────────
//  1) Charge 중 발 밑 큰 먼지 트레일
//  2) Slam 착지 직후 큰 먼지 폭발
// Puff 는 boss.container.parent (= entity layer) 에 부착해 world-space 유지.
const BOSS_DUST_COLOR = 0xc8b48a;       // sandy warm — LandingDust 와 동일 톤
const CHARGE_DUST_INTERVAL_MS = 60;     // ms — charge 중 spawn 주기
const CHARGE_DUST_PER_BURST = 4;        // 매 spawn 마다 puff 수
const SLAM_DUST_PUFF_COUNT = 14;        // 측면 부채꼴
const SLAM_DUST_PLUME_COUNT = 5;        // 중앙 상승 plume

interface BossPuff {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// Collider — Guardian 과 동일 (atlas 64×64 안의 본체).
const BOSS01_COLLIDER_W = 32;
const BOSS01_COLLIDER_H = 48;

export type Boss01State = 'idle' | 'detect' | 'chase' | 'telegraph' | 'charge'
  | 'slam_rise' | 'slam_fall' | 'slam_land' | 'swipe' | 'attack' | 'cooldown' | 'hit' | 'death';

export class Boss01 extends Enemy<Boss01State> {
  /** HUD 의 보스 HP 바 라우팅. */
  readonly _isBoss = true;

  // FSM 보조 (Guardian 1:1)
  private attackTimer = 0;
  private attackActive = false;
  private telegraphTimer = 0;
  private pendingAttack: 'charge' | 'slam' | 'swipe' = 'charge';
  private chargeDir = 1;
  private slamTargetX = 0;
  private enraged = false;
  private telegraphFlashTimer = 0;

  // Dust effects (charge trail + slam burst)
  private dustPuffs: BossPuff[] = [];
  private dustChargeTimer = 0;

  /** When true, 50% HP enrage is suppressed (first Normal entry special). */
  noEnrage = false;
  /** When true, only use charge pattern (first Normal entry special). */
  chargeOnly = false;

  // Atlas anim
  private bossSprite: Sprite | null = null;
  private bossFrames: Texture[] = [];
  private currentAnim: Boss01Anim = 'idle';
  private animFrameIndex = 0;
  private animTimer = 0;
  private animFinished = false;

  constructor(level = 1) {
    super({
      width: BOSS01_COLLIDER_W,
      height: BOSS01_COLLIDER_H,
      color: 0x882222,                 // placeholder Graphics — sprite 로드 전 적색
      hp: 1, atk: 1, def: 0,
      detectRange: 300, attackRange: 200,
      // **기본 이동 없음** — chase state 가 moveTowardTarget(0) 호출 시 vx=0 잠김.
      // FSM 자체 (cooldown→chase→telegraph) 는 그대로 유지 — telegraph 픽 보존.
      moveSpeed: 0,
      attackCooldown: COOLDOWN_NORMAL,
    });
    this.applyStats('Guardian', level); // CSV 'Guardian' 행 재사용 (HP 720 / ATK 21 Lv1)
    this.superArmor = true;             // 플레이어 공격에 hitstun 안 걸림 (Guardian 동일)
    void this.loadBossSprite();
  }

  // ─── Atlas / Anim ────────────────────────────────────────────────────────

  private async loadBossSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(BOSS01_ATLAS_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';

      this.bossFrames = [];
      for (let i = 0; i < BOSS01_FRAME_COUNT; i++) {
        this.bossFrames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * BOSS01_FRAME_W, 0, BOSS01_FRAME_W, BOSS01_FRAME_H),
        }));
      }

      const s = new Sprite(this.bossFrames[0]);
      s.anchor.set(0.5, 1);              // 발 중앙 — collider bottom-center 와 정합
      s.x = this.width / 2;
      s.y = this.height;
      this.container.addChildAt(s, 0);
      this.bossSprite = s;
      this.mainSprite = s;               // hit flash 알파 채널 모양 따라 발광
      this.sprite.visible = false;       // placeholder Graphics 숨김
    } catch {
      // 로드 실패 → placeholder 유지
    }
  }

  /** 현재 fsm state → Boss01Anim 매핑. */
  private decideAnim(): Boss01Anim {
    // Telegraph 중 attack 종류별 분기 — charge / slam 은 전용 prep anim, swipe 는 idle.
    if (this.fsm.currentState === 'telegraph') {
      if (this.pendingAttack === 'charge') return 'charge_prep';
      if (this.pendingAttack === 'slam')   return 'slam_prep';
      return 'idle'; // swipe → 점멸만 alpha 처리
    }
    switch (this.fsm.currentState) {
      case 'charge':                   return 'charge';
      case 'slam_rise':
        // vy 가 임계값보다 작으면 (음수 큰 값) 상승 12, 임계값 이상이면 apex 13.
        return this.vy < -SLAM_APEX_VY_THRESHOLD ? 'slam_rising' : 'slam_apex';
      case 'slam_fall':                return 'slam_fall';
      case 'slam_land':                return 'slam_land';
      case 'swipe':
      case 'attack':                   return 'attack1';
      default:                         return 'idle'; // idle / detect / chase / cooldown / hit / death
    }
  }

  private setAnim(next: Boss01Anim): void {
    if (this.currentAnim === next) return;
    this.currentAnim = next;
    this.animFrameIndex = 0;
    this.animTimer = 0;
    this.animFinished = false;
  }

  private updateBossAnim(dt: number): void {
    if (!this.bossSprite || this.bossFrames.length === 0) return;
    this.setAnim(this.decideAnim());

    const range = BOSS01_ANIM_RANGES[this.currentAnim];
    const span = range.to - range.from + 1;

    if (!this.animFinished) {
      this.animTimer += dt;
      // 현재 프레임의 개별 duration. frameMs 미지정 시 기본 100ms.
      // While 루프로 큰 dt 도 흡수 (HMR / 일시정지 후 재개 등).
      while (true) {
        const curMs = range.frameMs?.[this.animFrameIndex] ?? BOSS01_ANIM_FRAME_MS;
        if (this.animTimer < curMs) break;
        this.animTimer -= curMs;
        if (range.loop) {
          this.animFrameIndex = (this.animFrameIndex + 1) % span;
        } else if (this.animFrameIndex < span - 1) {
          this.animFrameIndex++;
        } else {
          this.animFinished = true;
          break;
        }
      }
    }

    const tex = this.bossFrames[range.from + this.animFrameIndex];
    if (tex) this.bossSprite.texture = tex;
    this.bossSprite.scale.x = this.facingRight ? 1 : -1;
  }

  /** Telegraph 점멸용 — bossSprite alpha 토글. 미로드 시 placeholder Graphics 토글. */
  private setSpriteAlpha(a: number): void {
    if (this.bossSprite) this.bossSprite.alpha = a;
    else this.sprite.alpha = a;
  }

  override update(dt: number): void {
    super.update(dt);
    // Charge 중 facing 잠금 — base Enemy.update 가 매 프레임 facingRight 를
    // (target.x > x) 로 갱신하므로 플레이어를 지나치는 순간 sprite 가 뒤집힌다.
    // chargeDir 로 방향 고정 (사용자 피드백 2026-05-05).
    if (this.fsm.currentState === 'charge') {
      this.facingRight = this.chargeDir > 0;
      // 발 밑 큰 먼지 트레일.
      this.dustChargeTimer -= dt;
      if (this.dustChargeTimer <= 0) {
        this.spawnChargeDust();
        this.dustChargeTimer = CHARGE_DUST_INTERVAL_MS;
      }
    } else {
      this.dustChargeTimer = 0;
    }
    this.updateDust(dt);
    this.updateBossAnim(dt);
  }

  // ─── Dust ──────────────────────────────────────────────────────────────

  private getDustParent(): Container | null {
    return this.container.parent ?? null;
  }

  /** Charge 중 발 밑 트레일 dust. 매 CHARGE_DUST_INTERVAL_MS 마다 호출. */
  private spawnChargeDust(): void {
    const parent = this.getDustParent();
    if (!parent) return;
    const footX = this.x + this.width / 2;
    const footY = this.y + this.height;
    const trailDir = -this.chargeDir; // 보스 진행 반대 방향으로 puff 가 트레일
    for (let i = 0; i < CHARGE_DUST_PER_BURST; i++) {
      const radius = 5 + Math.random() * 4;
      const offsetX = trailDir * (4 + Math.random() * 14);
      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: BOSS_DUST_COLOR, alpha: 0.85 });
      gfx.x = footX + offsetX;
      gfx.y = footY - 1 + (Math.random() - 0.5) * 4;
      parent.addChild(gfx);
      this.dustPuffs.push({
        gfx,
        vx: trailDir * (40 + Math.random() * 50),
        vy: -25 - Math.random() * 35,
        life: 480 + Math.random() * 160,
        maxLife: 640,
      });
    }
  }

  /** Slam land 진입 시 큰 먼지 폭발 + 중앙 상승 plume. */
  private spawnSlamLandDust(): void {
    const parent = this.getDustParent();
    if (!parent) return;
    const footX = this.x + this.width / 2;
    const footY = this.y + this.height;
    // 좌우 부채꼴 burst
    for (let i = 0; i < SLAM_DUST_PUFF_COUNT; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const t = Math.floor(i / 2) + 1;
      const offsetX = side * (4 + t * 4 + Math.random() * 4);
      const radius = 6 + Math.random() * 5;
      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: BOSS_DUST_COLOR, alpha: 0.9 });
      gfx.x = footX + offsetX;
      gfx.y = footY - 1 + (Math.random() - 0.5) * 3;
      parent.addChild(gfx);
      this.dustPuffs.push({
        gfx,
        vx: side * (90 + Math.random() * 100),
        vy: -50 - Math.random() * 70,
        life: 600 + Math.random() * 250,
        maxLife: 850,
      });
    }
    // 중앙 상승 plume
    for (let i = 0; i < SLAM_DUST_PLUME_COUNT; i++) {
      const radius = 7 + Math.random() * 5;
      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: BOSS_DUST_COLOR, alpha: 0.75 });
      gfx.x = footX + (Math.random() - 0.5) * 10;
      gfx.y = footY - 4;
      parent.addChild(gfx);
      this.dustPuffs.push({
        gfx,
        vx: (Math.random() - 0.5) * 40,
        vy: -90 - Math.random() * 50,
        life: 700 + Math.random() * 200,
        maxLife: 900,
      });
    }
  }

  private updateDust(dt: number): void {
    if (this.dustPuffs.length === 0) return;
    const dtSec = dt / 1000;
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const p = this.dustPuffs[i];
      p.life -= dt;
      p.gfx.x += p.vx * dtSec;
      p.gfx.y += p.vy * dtSec;
      p.vx *= 0.90;
      p.vy = p.vy * 0.94 + 40 * dtSec; // gentle settle
      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.85;
      p.gfx.scale.set(1 + (1 - t) * 0.6);
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        p.gfx.destroy();
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  // ─── FSM (Guardian 1:1 포팅) ─────────────────────────────────────────────

  protected setupStates(): void {
    // --- IDLE ---
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
        }
      },
    });

    // --- DETECT (brief pause before chase) ---
    let detectTimer = 0;
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; detectTimer = 2000; },
      update: (dt: number) => {
        detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('idle');
          return;
        }
        if (detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // --- CHASE (보스 = moveSpeed 0, 사실상 정지) ---
    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.horizontalDistToTarget();
        if (dist > this.detectRange * 2) {
          this.fsm.transition('idle');
          return;
        }
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('telegraph');
          return;
        }
        // moveTowardTarget(0) — vx=0 잠김. FSM 만 통과시키고 시각상 정지 유지.
        this.moveTowardTarget(this.moveSpeed);
      },
    });

    // --- TELEGRAPH (점멸 + 거리 기반 패턴 픽) ---
    this.fsm.addState({
      name: 'telegraph',
      enter: () => {
        this.telegraphFlashTimer = 0;
        this.vx = 0;

        if (this.chargeOnly || !this.target) {
          this.pendingAttack = 'charge';
        } else {
          const dist = this.horizontalDistToTarget();
          if (dist < 40) {
            const r = Math.random();
            this.pendingAttack = r < 0.6 ? 'swipe' : 'slam';
          } else if (dist < 80) {
            const r = Math.random();
            this.pendingAttack = r < 0.3 ? 'swipe' : r < 0.7 ? 'slam' : 'charge';
          } else {
            this.pendingAttack = Math.random() < 0.6 ? 'charge' : 'slam';
          }
        }

        this.telegraphTimer = this.pendingAttack === 'swipe' ? SWIPE_TELEGRAPH : TELEGRAPH_DURATION;

        if (this.target) {
          this.chargeDir = this.target.x > this.x ? 1 : -1;
          this.slamTargetX = this.target.x;
        }
      },
      update: (dt) => {
        this.telegraphTimer -= dt;
        this.telegraphFlashTimer += dt;
        const flashOn = Math.sin(this.telegraphFlashTimer * 0.02) > 0;
        this.setSpriteAlpha(flashOn ? 0.5 : 1.0);

        if (this.telegraphTimer <= 0) {
          this.setSpriteAlpha(1.0);
          if (this.pendingAttack === 'charge') {
            this.fsm.transition('charge');
          } else if (this.pendingAttack === 'swipe') {
            this.fsm.transition('swipe');
          } else {
            this.fsm.transition('slam_rise');
          }
        }
      },
      exit: () => { this.setSpriteAlpha(1.0); },
    });

    // --- CHARGE ---
    this.fsm.addState({
      name: 'charge',
      enter: () => {
        const speed = this.enraged ? CHARGE_SPEED_ENRAGED : CHARGE_SPEED;
        this.vx = this.chargeDir * speed;
        this.attackTimer = CHARGE_DURATION;
        this.attackActive = true;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED : COOLDOWN_NORMAL;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
        this.vx = 0;
      },
    });

    // --- SLAM: RISE ---
    // 물리 기반 apex 종료 (사용자 피드백 2026-05-05): 고정 500ms timer 는 천장
    // bump 케이스에서 slam_rise 가 falling 도중에도 끝나지 않아 frame 13 (apex
    // pose) 이 낙하 동안 노출되는 버그가 있었음. vy >= 0 조건으로 바꿔 자연
    // 종료 — 천장 bump 시 vy 가 0 으로 클램프되면 즉시 slam_fall 로 전이.
    this.fsm.addState({
      name: 'slam_rise',
      enter: () => {
        this.vy = SLAM_RISE_SPEED;
        if (this.target) this.slamTargetX = this.target.x;
      },
      update: () => {
        const dx = this.slamTargetX - this.x;
        this.vx = Math.sign(dx) * Math.min(Math.abs(dx) / 0.3, 400);
        // Apex 도달 (vy 가 0 이상) 또는 천장 bump (vy 클램프 0) 시 종료.
        if (this.vy >= 0) {
          this.fsm.transition('slam_fall');
        }
      },
      exit: () => { this.vx = 0; },
    });

    // --- SLAM: FALL ---
    let slamFallTimer = 0;
    this.fsm.addState({
      name: 'slam_fall',
      enter: () => {
        this.vy = SLAM_FALL_SPEED;
        this.attackActive = true;
        this.grounded = false;
        slamFallTimer = 0;
      },
      update: (dt: number) => {
        slamFallTimer += dt;
        if (this.grounded && slamFallTimer >= SLAM_FALL_MIN_MS) {
          this.fsm.transition('slam_land');
        }
      },
      exit: () => { this.attackActive = false; },
    });

    // --- SLAM: LAND ---
    this.fsm.addState({
      name: 'slam_land',
      enter: () => {
        this.attackTimer = SLAM_LAND_DURATION;
        this.vx = 0;
        this.vy = 0;
        this.attackActive = true;
        setTimeout(() => { this.attackActive = false; }, 100);
        this.spawnSlamLandDust();
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED : COOLDOWN_NORMAL;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });

    // --- SWIPE (close-range melee) ---
    this.fsm.addState({
      name: 'swipe',
      enter: () => {
        this.attackTimer = SWIPE_DURATION;
        this.attackActive = true;
        const dir = this.target ? (this.target.x > this.x ? 1 : -1) : (this.facingRight ? 1 : -1);
        this.vx = dir * SWIPE_KNOCKBACK;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx *= 0.92;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED * 0.7 : COOLDOWN_NORMAL * 0.6;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
        this.vx = 0;
      },
    });

    // --- ATTACK (unused, but required by base) ---
    this.fsm.addState({
      name: 'attack',
      update: () => { this.fsm.transition('cooldown'); },
    });

    // --- COOLDOWN ---
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // --- HIT ---
    this.fsm.addState({
      name: 'hit',
      update: (dt) => {
        this.stateHitUpdate(dt);
        // HP 50% 격노 — Guardian 동일.
        if (!this.noEnrage && !this.enraged && this.hp <= this.maxHp * 0.5) {
          this.enraged = true;
        }
      },
    });

    // --- DEATH ---
    this.fsm.addState({
      name: 'death',
      update: () => {},
    });
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }
}
