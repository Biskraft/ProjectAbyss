/**
 * GoldPickup.ts — Collectible gold currency.
 *
 * Once collected, saved permanently and never respawns.
 *
 * Denomination tiers (1 / 5 / 10 / 50 / 100) — sprite scaled per tier
 * (coin_01_atlas, 4-frame ping-pong) so a burst of mixed coins reads like
 * cash spilling out. Use `spawnBurst(x, y, totalAmount)` for confetti drops.
 *
 * LDtk entity: GoldPickup (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - Amount (Int): gold amount (default 10)
 */

import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { isSolid } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';

const GRAVITY = 720;        // px/s^2 — confetti fall rate
const AIR_FRICTION = 0.965; // per ~16ms tick
const BOB_AMPLITUDE = 2;
const TILE_SIZE = 16;
const SETTLE_VY = 55;       // |vy| below this on a bounce → consider stopping
const SETTLE_VX = 18;       // |vx| below this with floor contact → settle

// ── Coin atlas — 4 frames @ 16×16, horizontal strip (64×16). ──
const COIN_ATLAS_PATH = 'assets/sprites/coin_01_atlas.png';
const COIN_FRAME_W = 16;
const COIN_FRAME_H = 16;
const COIN_FRAME_COUNT = 4;
/** JSON `duration: 100`. */
const COIN_FRAME_MS = 100;
/** Ping-pong index sequence over the 4 frames: 0→1→2→3→2→1, repeat.
 *  Aseprite-style "ping-pong" — endpoints not held, period = 6. */
const COIN_BOUNCE_SEQ: ReadonlyArray<number> = [0, 1, 2, 3, 2, 1];

/** Master visual scale. 1.0 = sprite renders at native 16×16 (≈ tier diameter
 *  matches the old Graphics circles). Bumped to 2.0 by user request — both
 *  sprite scale *and* the collision radius used for floor/wall settling
 *  follow this so the coin still rests visually on terrain. */
const COIN_VISUAL_SCALE = 2.0;

/** Shared frame textures (single decode across every spawned coin). */
let coinFramesCache: Texture[] | null = null;
let coinFramesPromise: Promise<Texture[]> | null = null;

async function getCoinFrames(): Promise<Texture[]> {
  if (coinFramesCache) return coinFramesCache;
  if (!coinFramesPromise) {
    coinFramesPromise = (async () => {
      const tex = await Assets.load<Texture>(assetPath(COIN_ATLAS_PATH));
      tex.source.scaleMode = 'nearest';
      const frames: Texture[] = [];
      for (let i = 0; i < COIN_FRAME_COUNT; i++) {
        frames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * COIN_FRAME_W, 0, COIN_FRAME_W, COIN_FRAME_H),
        }));
      }
      coinFramesCache = frames;
      return frames;
    })();
  }
  return coinFramesPromise;
}

/** Visual radius per denomination (px). Drives both collision snap and sprite scale. */
const TIER_SIZES: ReadonlyArray<readonly [number, number]> = [
  [100, 7],
  [50,  6],
  [10,  5],
  [5,   4],
  [1,   3],
];

function tierSizeFor(amount: number): number {
  for (const [threshold, size] of TIER_SIZES) {
    if (amount >= threshold) return size;
  }
  return TIER_SIZES[TIER_SIZES.length - 1][1];
}

const DENOMS = [100, 50, 10, 5, 1] as const;
/** Max total coins per burst — overflow folds smaller denoms into larger ones. */
const MAX_BURST_COINS = 22;

/** Greedy split largest-first, then upconvert if over MAX_BURST_COINS. */
function splitDenominations(amount: number): Array<[number, number]> {
  const counts = new Map<number, number>();
  let remain = amount;
  for (const d of DENOMS) {
    if (remain <= 0) break;
    const n = Math.floor(remain / d);
    if (n > 0) {
      counts.set(d, n);
      remain -= n * d;
    }
  }
  let total = 0;
  for (const c of counts.values()) total += c;
  while (total > MAX_BURST_COINS) {
    let merged = false;
    for (let i = DENOMS.length - 1; i > 0; i--) {
      const small = DENOMS[i];
      const big = DENOMS[i - 1];
      const ratio = big / small;
      const cnt = counts.get(small) ?? 0;
      if (cnt >= ratio) {
        const groups = Math.floor(cnt / ratio);
        counts.set(small, cnt - groups * ratio);
        counts.set(big, (counts.get(big) ?? 0) + groups);
        total = total - groups * ratio + groups;
        merged = true;
        break;
      }
    }
    if (!merged) break;
  }
  const out: Array<[number, number]> = [];
  for (const d of DENOMS) {
    const c = counts.get(d) ?? 0;
    if (c > 0) out.push([d, c]);
  }
  return out;
}

export class GoldPickup {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  amount: number;
  /** Bob center Y. World-space for normal pickups, builder-local for pickups
   *  reparented under GiantBuilder. */
  baseY: number;
  collected = false;

  // Confetti physics — non-zero physicsTimer puts update() in ballistic mode.
  // Settle happens when the coin lands on a solid tile (via roomData), not
  // when the timer expires — otherwise airborne coins freeze mid-air.
  vx = 0;
  vy = 0;
  physicsTimer = 0;
  /** Solid grid for floor + side-wall collision during burst flight. */
  roomData: number[][] | null = null;
  /** True when the coin has come to rest on a tile via burst physics.
   *  Floored coins skip the bob animation (idle hover is for fixed pickups). */
  private floored = false;

  /** Fallback shape — visible only until the atlas texture finishes loading,
   *  or permanently if the load fails. */
  private gfx: Graphics;
  private sprite: Sprite | null = null;
  /** Position in COIN_BOUNCE_SEQ — drives the ping-pong frame pick.
   *  Constructor seeds this to a random 0..3 so spawned coins start on a
   *  random frame (1..4 1-indexed) and a confetti burst looks de-synced. */
  private animSeqIdx = 0;
  /** Accumulated ms since the current frame started. */
  private animTimer = 0;
  private timer = 0;
  private tierSize: number;

  constructor(x: number, y: number, amount: number) {
    this.x = x;
    this.y = y - this.height;
    this.baseY = this.y;
    this.amount = amount;
    this.tierSize = tierSizeFor(amount);
    // Random start frame (1..4 1-indexed → 0..3 in COIN_BOUNCE_SEQ ascending half).
    this.animSeqIdx = Math.floor(Math.random() * COIN_FRAME_COUNT);

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawFallback();
    this.container.addChild(this.gfx);

    void this.loadSprite();
  }

  /** Plain disc placeholder so a still-loading coin doesn't render as a void.
   *  Hidden as soon as the sprite is attached. */
  private drawFallback(): void {
    this.gfx.clear();
    this.gfx.x = this.width / 2;
    this.gfx.y = this.height / 2;
    const r = this.tierSize * COIN_VISUAL_SCALE;
    this.gfx.circle(0, 0, r).fill({ color: 0xFFD700, alpha: 0.9 });
    this.gfx.circle(0, 0, r).stroke({ color: 0xCC9900, width: 1 });
  }

  private async loadSprite(): Promise<void> {
    try {
      const frames = await getCoinFrames();
      if (this.collected || this.container.destroyed) return;
      // Initial texture matches the randomized animSeqIdx — avoids a one-tick
      // flash of frame 0 before update() swaps to the chosen start frame.
      const s = new Sprite(frames[COIN_BOUNCE_SEQ[this.animSeqIdx]]);
      s.anchor.set(0.5, 0.5);
      s.x = this.width / 2;
      s.y = this.height / 2;
      // Sprite is 16×16; tier radius/8 maps the visible diameter to the old
      // Graphics circles (size*2). COIN_VISUAL_SCALE multiplies on top.
      s.scale.set((this.tierSize / 8) * COIN_VISUAL_SCALE);
      this.container.addChild(s);
      this.sprite = s;
      this.gfx.visible = false;
    } catch {
      // Atlas missing — leave the placeholder disc visible.
    }
  }

  /** Bounce-loop driver: advance animTimer, walk COIN_BOUNCE_SEQ, push frame. */
  private updateCoinAnim(dt: number): void {
    if (!this.sprite || !coinFramesCache) return;
    this.animTimer += dt;
    while (this.animTimer >= COIN_FRAME_MS) {
      this.animTimer -= COIN_FRAME_MS;
      this.animSeqIdx = (this.animSeqIdx + 1) % COIN_BOUNCE_SEQ.length;
    }
    const frame = coinFramesCache[COIN_BOUNCE_SEQ[this.animSeqIdx]];
    if (frame) this.sprite.texture = frame;
  }

  update(dt: number): void {
    if (this.collected) return;
    // Bounce-loop runs unconditionally — burst flight, floored, idle bob alike.
    this.updateCoinAnim(dt);
    if (this.physicsTimer > 0) {
      const sec = dt / 1000;
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const r = this.tierSize * COIN_VISUAL_SCALE;  // visual radius — used so coins rest *on* the tile

      this.vy += GRAVITY * sec;
      this.vx *= Math.pow(AIR_FRICTION, dt / 16);
      this.physicsTimer -= dt;

      // ---- X axis: move + side-wall collision (split-axis avoids tunneling). ----
      this.x += this.vx * sec;
      if (this.roomData) {
        const cyMid = Math.floor((this.y + halfH) / TILE_SIZE);
        if (this.vx > 0) {
          const rightX = this.x + halfW + r;
          const cxR = Math.floor(rightX / TILE_SIZE);
          if (isSolid(this.roomData[cyMid]?.[cxR] ?? 0)) {
            this.x = cxR * TILE_SIZE - r - halfW;
            this.vx = -this.vx * 0.45;
          }
        } else if (this.vx < 0) {
          const leftX = this.x + halfW - r;
          const cxL = Math.floor(leftX / TILE_SIZE);
          if (isSolid(this.roomData[cyMid]?.[cxL] ?? 0)) {
            this.x = (cxL + 1) * TILE_SIZE + r - halfW;
            this.vx = -this.vx * 0.45;
          }
        }
      }

      // ---- Y axis: move + floor collision using the visual bottom (center+r). ----
      this.y += this.vy * sec;
      if (this.roomData && this.vy > 0) {
        const cxMid = Math.floor((this.x + halfW) / TILE_SIZE);
        const visualBottom = this.y + halfH + r;
        const cyB = Math.floor(visualBottom / TILE_SIZE);
        if (isSolid(this.roomData[cyB]?.[cxMid] ?? 0)) {
          // Snap so the visual bottom sits exactly on the tile top.
          this.y = cyB * TILE_SIZE - halfH - r;
          this.vy = -this.vy * 0.42;
          this.vx *= 0.78;
          if (Math.abs(this.vy) < SETTLE_VY && Math.abs(this.vx) < SETTLE_VX) {
            this.physicsTimer = 0;
            this.floored = true;
          }
        }
      }

      // Burst window expired without contact — settle in place (no warp).
      if (this.physicsTimer <= 0) {
        this.physicsTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.baseY = this.y;
        this.timer = 0;
      }

      this.container.x = this.x;
      this.container.y = this.y;
      return;
    }
    // Floored burst coins stay perfectly still (no idle bob).
    if (this.floored) {
      this.container.x = this.x;
      this.container.y = this.y;
      return;
    }
    this.timer += dt;
    this.container.y = this.baseY + Math.sin(this.timer * 0.003) * BOB_AMPLITUDE;
  }

  collect(): void {
    this.collected = true;
    this.container.visible = false;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  /**
   * Splits `totalAmount` into 1/5/10/50/100 denomination coins and returns
   * them with random upward burst velocities (confetti style). Each coin's
   * visual matches its denomination tier. Caller adds them to the scene's
   * gold list and entity layer.
   */
  static spawnBurst(x: number, y: number, totalAmount: number): GoldPickup[] {
    if (totalAmount <= 0) return [];
    const breakdown = splitDenominations(totalAmount);
    const coins: GoldPickup[] = [];
    for (const [denom, count] of breakdown) {
      for (let i = 0; i < count; i++) {
        const coin = new GoldPickup(x, y, denom);
        // Upward cone: -Math.PI/2 ± ~85°, biased upward.
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
        const speed = 160 + Math.random() * 160;
        coin.vx = Math.cos(angle) * speed;
        coin.vy = Math.sin(angle) * speed;
        coin.physicsTimer = 700 + Math.random() * 350;
        coins.push(coin);
      }
    }
    return coins;
  }
}
