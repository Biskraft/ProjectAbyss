/**
 * ItemDisplay.ts — ItemWorld 전용 데코 entity.
 *
 * 현재 진입한 ItemWorld 의 *해당 아이템* sprite 를 N 배 확대해서 보여주는 의례적
 * 표식. "이 아이템 안에 들어와 있다" 메타포를 시각적으로 강화한다. 충돌·인터랙트
 * 없음, 순수 visual.
 *
 * 연출 레이어 (모두 sin 위상 동기, 한 박동에 같은 호흡):
 *   1) Scale pulse           — base × (1 ± 10%)         호흡감
 *   2) Alpha peak boost      — 정점에서 +15%             "기운이 강해진다"
 *   3) Inner glow (rarity)   — Diablo 색 등급 후광       (저강도, radius 작음)
 *   4) Outer glow (temperament) — 5색 기질 외광          (저강도, radius 큼)
 *   5) Vertical bob          — ±4px 위아래 부유          공중 부유 유물 톤
 *   6) Slow rotation         — 매우 느린 자전 (옵션)     의례적 회전
 *   7) Temperament sparkles  — 5색 기질 입자가 떠다님     "이 아이템의 결"
 *
 * 색 매핑:
 *   - Rarity → inner glow (Normal=흰 / Magic=청 / Rare=황 / Legendary=주황 / Ancient=초록)
 *   - Temperament → outer glow + sparkle (Forge=주황 / Iron=청록 / Rust=회색 / Spark=옅은 노랑 / Shadow=자주)
 *   - temperament 미정 아이템은 sparkle/outer glow 생략.
 *
 * LDtk Entity 계약:
 *   - Identifier: ItemDisplay
 *   - Pivot:      (0.5, 0.5)
 *   - Fields:
 *       - Size (Float, default 4.0)         — sprite 확대 배율
 *       - Rotate (Bool, default false, opt) — true 면 느린 자전 활성
 */

import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { RARITY_COLOR } from '@items/ItemInstance';
import { assetPath } from '@core/AssetLoader';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import { GlowFilter } from '@effects/GlowFilter';

// 호흡 펄스 — 주기/진폭
const PULSE_PERIOD_MS = 1600;
const PULSE_AMPLITUDE = 0.10;

// Alpha peak boost
const ALPHA_BASE = 0.85;
const ALPHA_PEAK = 0.15;

// Glow — 절제된 톤 (사용자 결정 2026-05-23: 평균 0.5 ±0.2).
const INNER_GLOW_RADIUS_PER_SCALE = 2.0;
const INNER_GLOW_INTENSITY_BASE = 0.5;
const INNER_GLOW_INTENSITY_AMP = 0.2;
const INNER_GLOW_CORE_BOOST = 0.4;

const OUTER_GLOW_RADIUS_PER_SCALE = 4.0;
const OUTER_GLOW_INTENSITY_BASE = 0.4;
const OUTER_GLOW_INTENSITY_AMP = 0.2;
const OUTER_GLOW_CORE_BOOST = 0.0;

// Vertical bob
const BOB_AMPLITUDE_PX = 4;
const BOB_PERIOD_MS = PULSE_PERIOD_MS * 2;

// Slow rotation
const ROTATION_SPEED = 0.00015;

// Sparkle — 5색 기질 입자
const SPARKLE_SPAWN_INTERVAL_MS = 320;
const SPARKLE_LIFE_MS = 2000;
const SPARKLE_RISE_SPEED_PX_PER_S = 14;
const SPARKLE_DRIFT_AMPLITUDE_PX = 6;

type Temperament = 'forge' | 'iron' | 'rust' | 'spark' | 'shadow';

/** 기질별 색 — itemWorldDistricts.ts BRANCH_BY_TEMPERAMENT 와 동일 SSoT. */
// 기질↔색 1:1 (2026-05-31). 테마 그라디언트 dominant 와 정렬:
// forge=magma주황 / iron=water·ice청록 / rust=acid산성녹 / spark=thunder일렉트릭블루 / shadow=oil자주.
const TEMPERAMENT_COLOR: Record<Temperament, number> = {
  forge: 0xff8a3c,
  iron: 0x4cd6c1,
  rust: 0x88cc44,
  spark: 0x6aa0e8,
  shadow: 0x6b3a8a,
};

interface Sparkle {
  gfx: Graphics;
  startX: number;
  baseDriftPhase: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
}

export class ItemDisplay {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  readonly scaleFactor: number;
  readonly rotate: boolean;
  private sprite: Sprite | null = null;
  private innerGlow: GlowFilter | null = null;
  private outerGlow: GlowFilter | null = null;
  private rarityColor: number;
  private temperamentColor: number | null;
  private destroyed = false;
  private elapsedMs = 0;
  private sparkles: Sparkle[] = [];
  private sparkleSpawnTimer = 0;
  private sparkleLayer: Container;

  constructor(x: number, y: number, scaleFactor: number, item: ItemInstance, rotate = false) {
    this.x = x;
    this.y = y;
    this.scaleFactor = scaleFactor;
    this.rotate = rotate;
    this.rarityColor = RARITY_COLOR[item.def.rarity] ?? 0xffffff;
    const t = item.def.temperamentPrimary as Temperament | undefined;
    this.temperamentColor = t ? TEMPERAMENT_COLOR[t] ?? null : null;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Sparkle layer — sprite 뒤에 두어 입자가 아이템 윤곽선을 살짝 감싸도록.
    this.sparkleLayer = new Container();
    this.container.addChild(this.sparkleLayer);

    const iconPath = assetPath(`assets/items/${item.def.id}.png`);
    Assets.load<Texture>(iconPath).then(tex => {
      if (this.destroyed) return;
      tex.source.scaleMode = 'nearest';
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.5);
      s.scale.set(scaleFactor);
      s.alpha = ALPHA_BASE;

      // Dual glow: inner = rarity 시그널, outer = temperament 외광.
      // Filter stack 순서대로 적용되어 자연스러운 색 그라데이션.
      const filters: GlowFilter[] = [];

      this.innerGlow = new GlowFilter({
        color: this.rarityColor,
        radius: Math.max(6, scaleFactor * INNER_GLOW_RADIUS_PER_SCALE),
        intensity: INNER_GLOW_INTENSITY_BASE,
        coreBoost: INNER_GLOW_CORE_BOOST,
      });
      filters.push(this.innerGlow);

      if (this.temperamentColor !== null) {
        this.outerGlow = new GlowFilter({
          color: this.temperamentColor,
          radius: Math.max(10, scaleFactor * OUTER_GLOW_RADIUS_PER_SCALE),
          intensity: OUTER_GLOW_INTENSITY_BASE,
          coreBoost: OUTER_GLOW_CORE_BOOST,
        });
        filters.push(this.outerGlow);
      }

      s.filters = filters;
      this.sprite = s;
      this.container.addChild(s);
    }).catch(() => { /* no icon available — silently skip */ });
  }

  update(dt: number): void {
    if (this.destroyed) return;
    this.elapsedMs += dt;

    const phase = (this.elapsedMs / PULSE_PERIOD_MS) * Math.PI * 2;
    const wave = Math.sin(phase);
    const peakPositive = Math.max(0, wave);

    if (this.sprite) {
      // 1) Scale pulse
      this.sprite.scale.set(this.scaleFactor * (1 + wave * PULSE_AMPLITUDE));
      // 2) Alpha peak boost
      this.sprite.alpha = ALPHA_BASE + peakPositive * ALPHA_PEAK;
      // 5) Slow rotation
      if (this.rotate) {
        this.sprite.rotation += dt * ROTATION_SPEED;
      }
    }
    // 3-4) Glow intensity pulse
    if (this.innerGlow) {
      this.innerGlow.setIntensity(INNER_GLOW_INTENSITY_BASE + wave * INNER_GLOW_INTENSITY_AMP);
    }
    if (this.outerGlow) {
      this.outerGlow.setIntensity(OUTER_GLOW_INTENSITY_BASE + wave * OUTER_GLOW_INTENSITY_AMP);
    }
    // 6) Vertical bob
    const bobPhase = (this.elapsedMs / BOB_PERIOD_MS) * Math.PI * 2;
    this.container.y = this.y + Math.sin(bobPhase) * BOB_AMPLITUDE_PX;

    // 7) Temperament sparkles — temperament 가 있을 때만 생성.
    if (this.temperamentColor !== null && this.sprite) {
      this.sparkleSpawnTimer += dt;
      if (this.sparkleSpawnTimer >= SPARKLE_SPAWN_INTERVAL_MS) {
        this.sparkleSpawnTimer -= SPARKLE_SPAWN_INTERVAL_MS;
        this.spawnSparkle();
      }
    }
    this.updateSparkles(dt);
  }

  private spawnSparkle(): void {
    if (!this.sprite || this.temperamentColor === null) return;
    const halfW = (this.sprite.texture.width * this.scaleFactor) / 2;
    const halfH = (this.sprite.texture.height * this.scaleFactor) / 2;
    // 시작 위치: sprite 영역 안 random.
    const startX = (Math.random() * 2 - 1) * halfW * 0.8;
    const startY = halfH * (0.3 + Math.random() * 0.6); // 아래쪽에서 떠오름
    const radius = 1 + Math.random() * 1.5;
    const gfx = new Graphics();
    gfx.circle(0, 0, radius).fill({ color: this.temperamentColor, alpha: 1 });
    gfx.x = startX;
    gfx.y = startY;
    // 옅은 후광 — temperament 색
    gfx.filters = [new GlowFilter({
      color: this.temperamentColor,
      radius: 4,
      intensity: 0.6,
      coreBoost: 0.2,
    })];
    this.sparkleLayer.addChild(gfx);
    this.sparkles.push({
      gfx,
      startX,
      baseDriftPhase: Math.random() * Math.PI * 2,
      vy: -(SPARKLE_RISE_SPEED_PX_PER_S * (0.7 + Math.random() * 0.6)),
      ageMs: 0,
      lifeMs: SPARKLE_LIFE_MS * (0.8 + Math.random() * 0.4),
    });
  }

  private updateSparkles(dt: number): void {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.ageMs += dt;
      if (sp.ageMs >= sp.lifeMs) {
        destroyDisplayObject(sp.gfx);
        this.sparkles.splice(i, 1);
        continue;
      }
      const ageSec = sp.ageMs / 1000;
      sp.gfx.y += sp.vy * (dt / 1000);
      // 좌우 드리프트 — sin 으로 부드럽게 흔들림
      const driftPhase = sp.baseDriftPhase + ageSec * 2.2;
      sp.gfx.x = sp.startX + Math.sin(driftPhase) * SPARKLE_DRIFT_AMPLITUDE_PX;
      // Fade out — 후반 40% 구간에서 알파 감소
      const t = sp.ageMs / sp.lifeMs;
      sp.gfx.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const sp of this.sparkles) destroyDisplayObject(sp.gfx);
    this.sparkles = [];
    destroyDisplayObject(this.container, { children: true });
    this.sprite = null;
    this.innerGlow = null;
    this.outerGlow = null;
  }
}
