/**
 * LockedDoor.ts — A barrier that blocks passage until unlocked.
 *
 * Unlock conditions:
 *  - 'event':  unlocked externally via unlockDoors(eventName)
 *  - 'switch': player attacks the door to unlock it
 *  - 'stat':   player attacks the door AND meets a stat threshold (e.g. ATK >= 40)
 *
 * Renders as a solid colored rect matching the entity size.
 * Injects collision tiles into the grid on spawn, removes them on unlock.
 */

import { Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

const TILE_SIZE = 16;

// ── Door atlas — Aseprite 9-slice. ──
const DOOR_ATLAS_PATH = 'assets/sprites/door_01_atlas.png';
const DOOR_ATLAS_JSON_PATH = 'assets/sprites/door_01_atlas.json';
const DOOR_SLICE_NAME = 'door_01';
/** How long the middle slides down (ms) before vanishing. */
const DOOR_SLIDE_MS = 380;

interface DoorSliceMeta {
  bounds: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number; w: number; h: number };
}

interface DoorArt {
  texture: Texture;
  slice: DoorSliceMeta;
}

let doorArtCache: DoorArt | null = null;
let doorArtPromise: Promise<DoorArt> | null = null;

async function getDoorArt(): Promise<DoorArt> {
  if (doorArtCache) return doorArtCache;
  if (!doorArtPromise) {
    doorArtPromise = (async () => {
      const [tex, json] = await Promise.all([
        Assets.load<Texture>(assetPath(DOOR_ATLAS_PATH)),
        fetch(assetPath(DOOR_ATLAS_JSON_PATH)).then(r => r.json() as Promise<{
          meta?: {
            slices?: Array<{
              name: string;
              keys: Array<{
                bounds: DoorSliceMeta['bounds'];
                center?: DoorSliceMeta['center'];
              }>;
            }>;
          };
        }>),
      ]);
      tex.source.scaleMode = 'nearest';
      const slice = json.meta?.slices?.find(s => s.name === DOOR_SLICE_NAME);
      const key = slice?.keys?.[0];
      if (!key?.bounds || !key.center) {
        throw new Error(`[LockedDoor] missing 9-slice "${DOOR_SLICE_NAME}" in ${DOOR_ATLAS_JSON_PATH}`);
      }
      doorArtCache = { texture: tex, slice: { bounds: key.bounds, center: key.center } };
      return doorArtCache;
    })();
  }
  return doorArtPromise;
}

export type UnlockCondition = 'event' | 'switch' | 'stat';

export class LockedDoor {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;

  /** LDtk entity instance ID — used by Switch entity references. */
  iid: string;
  /** For 'event' condition: the event name that unlocks this door. */
  unlockEvent: string;
  /** What kind of condition unlocks this door. */
  unlockCondition: UnlockCondition;
  /** For 'stat' condition: which stat to check (e.g. 'atk'). */
  statType: string;
  /** For 'stat' condition: minimum stat value required. */
  statThreshold: number;

  locked = true;

  /** Fallback Graphics — visible only until the 9-slice texture lands, or
   *  permanently if the load fails. */
  private gfx: Graphics;
  /** 9-slice rows. The middle row slides down on unlock; top/bottom remain. */
  private topSlice: Container | null = null;
  private midSlice: Container | null = null;
  private botSlice: Container | null = null;
  /** Mask for the mid strip — clips to the gap between caps so the slide
   *  visually retracts into the bottom cap instead of bleeding past it. */
  private midMask: Graphics | null = null;
  private topDispH = 0;
  private botDispH = 0;
  /** Display height of the middle 9-slice row. Cached for the slide animation. */
  private midDispH = 0;

  private label: Text | null = null;
  /** Red X shown on rejected attack (stat insufficient). */
  private rejectCross: Graphics | null = null;
  /** Collision grid cells this door occupies — stored for removal on unlock. */
  private gridCells: { col: number; row: number }[] = [];

  /** Reject animation timer (ms remaining). */
  private rejectTimer = 0;
  private rejectShakeOffset = 0;
  /** Slide-down animation state — non-zero while the mid strip is retracting. */
  private slideTimer = 0;
  private sliding = false;

  constructor(
    x: number, y: number,
    width: number, height: number,
    iid: string,
    unlockCondition: UnlockCondition,
    unlockEvent: string,
    statType: string,
    statThreshold: number,
  ) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - height;
    this.width = width;
    this.height = height;
    this.iid = iid;
    this.unlockCondition = unlockCondition;
    this.unlockEvent = unlockEvent;
    this.statType = statType;
    this.statThreshold = statThreshold;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawDoor();
    this.container.addChild(this.gfx);

    void this.loadNineSlice();

    // Show stat threshold label for 'stat' condition doors
    if (unlockCondition === 'stat' && statThreshold > 0) {
      // Label 은 gate 위쪽으로 크게 띄워서 가독성 확보 (fontSize 8 → 16, 어두운 외곽선 추가).
      const style = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fill: 0xff5555,
        align: 'center',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      });
      this.label = new Text({ text: `${statType.toUpperCase()} ${statThreshold}`, style });
      this.label.anchor.set(0.5, 1); // anchor 하단 → label.y 는 label bottom 위치
      this.label.x = width / 2;
      this.label.y = -4; // gate 상단에서 4px 위에 label bottom
      this.container.addChild(this.label);

      // Reject-state cross (hidden by default, flashed on failed attack)
      // Label 위치와 겹치도록 label 중심에 맞춤.
      this.rejectCross = new Graphics();
      this.rejectCross.moveTo(-7, -7).lineTo(7, 7).stroke({ color: 0xff2222, width: 3 });
      this.rejectCross.moveTo(7, -7).lineTo(-7, 7).stroke({ color: 0xff2222, width: 3 });
      this.rejectCross.x = width / 2;
      this.rejectCross.y = -4 - 8; // label 중앙 부근
      this.rejectCross.visible = false;
      this.container.addChild(this.rejectCross);
    }
  }

  private async loadNineSlice(): Promise<void> {
    try {
      const { texture: tex, slice } = await getDoorArt();
      if (this.container.destroyed) return;
      const source = tex.source;

      const b = slice.bounds;
      const c = slice.center;
      const leftW = c.x;
      const midW = c.w;
      const rightW = Math.max(0, b.w - c.x - c.w);
      const topH = c.y;
      const midH = c.h;
      const botH = Math.max(0, b.h - c.y - c.h);

      const dstLeftW = Math.min(leftW, Math.floor(this.width / 2));
      const dstRightW = Math.min(rightW, Math.max(0, this.width - dstLeftW));
      const dstMidW = Math.max(0, this.width - dstLeftW - dstRightW);
      this.topDispH = Math.min(topH, Math.floor(this.height / 2));
      this.botDispH = Math.min(botH, Math.max(0, this.height - this.topDispH));
      this.midDispH = Math.max(0, this.height - this.topDispH - this.botDispH);

      const makeTex = (x: number, y: number, w: number, h: number): Texture =>
        new Texture({ source, frame: new Rectangle(b.x + x, b.y + y, w, h) });

      const makePiece = (x: number, y: number, texW: number, texH: number, dstX: number, dstY: number, dstW: number, dstH: number): Sprite | null => {
        if (texW <= 0 || texH <= 0 || dstW <= 0 || dstH <= 0) return null;
        const s = new Sprite(makeTex(x, y, texW, texH));
        s.x = dstX;
        s.y = dstY;
        s.width = dstW;
        s.height = dstH;
        return s;
      };

      const buildRow = (srcY: number, srcH: number, dstY: number, dstH: number): Container => {
        const row = new Container();
        const pieces = [
          makePiece(0, srcY, leftW, srcH, 0, 0, dstLeftW, dstH),
          makePiece(c.x, srcY, midW, srcH, dstLeftW, 0, dstMidW, dstH),
          makePiece(c.x + c.w, srcY, rightW, srcH, dstLeftW + dstMidW, 0, dstRightW, dstH),
        ];
        for (const p of pieces) if (p) row.addChild(p);
        row.y = dstY;
        return row;
      };

      this.topSlice = buildRow(0, topH, 0, this.topDispH);
      this.midSlice = buildRow(c.y, midH, this.topDispH, this.midDispH);
      this.botSlice = buildRow(c.y + c.h, botH, this.height - this.botDispH, this.botDispH);

      // Mid mask — fixed window between the two cap rows. As midSlice.y
      // animates downward past the mask's bottom edge, the middle 9-slice row
      // visually retracts while the top/bottom rows remain visible.
      const mask = new Graphics();
      mask.rect(0, this.topDispH, this.width, this.midDispH).fill(0xffffff);
      this.midSlice.mask = mask;
      this.midMask = mask;

      // Stack under any label/cross already in the container.
      this.container.addChildAt(mask, 0);
      this.container.addChildAt(this.topSlice, 1);
      this.container.addChildAt(this.midSlice, 2);
      this.container.addChildAt(this.botSlice, 3);

      // Race: door already unlocked before texture arrived → present open state.
      if (!this.locked) this.midSlice.visible = false;

      this.gfx.visible = false;
    } catch {
      // Atlas missing — leave the Graphics fallback visible.
    }
  }

  private drawDoor(): void {
    this.gfx.clear();
    const color = this.unlockCondition === 'stat' ? 0x994422 : 0x8b4513;
    this.gfx.rect(0, 0, this.width, this.height).fill({ color, alpha: 0.9 });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: 0x5a2d0c, width: 1 });
    this.gfx.rect(2, 2, this.width - 4, this.height - 4).stroke({ color: 0xa0522d, width: 1 });

    // Stat doors get crack lines to hint at destructibility
    if (this.unlockCondition === 'stat' || this.unlockCondition === 'switch') {
      this.gfx.moveTo(4, this.height * 0.3)
        .lineTo(this.width * 0.4, this.height * 0.5)
        .lineTo(6, this.height * 0.7)
        .stroke({ color: 0x332211, width: 1 });
      this.gfx.moveTo(this.width - 4, this.height * 0.25)
        .lineTo(this.width * 0.6, this.height * 0.45)
        .lineTo(this.width - 6, this.height * 0.65)
        .stroke({ color: 0x332211, width: 1 });
    }
  }

  /** Inject solid collision tiles into the grid. */
  injectCollision(grid: number[][]): void {
    const startCol = Math.floor(this.x / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const cols = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gr = startRow + r;
        const gc = startCol + c;
        if (gr >= 0 && gr < grid.length && gc >= 0 && gc < (grid[0]?.length ?? 0)) {
          grid[gr][gc] = 1; // solid
          this.gridCells.push({ col: gc, row: gr });
        }
      }
    }
  }

  /**
   * Try to unlock via player attack. Returns result:
   *  - 'unlocked': door opens
   *  - 'rejected': stat too low, plays reject animation
   *  - 'ignored':  this door doesn't respond to attacks (event-type)
   */
  tryAttackUnlock(playerStats: Record<string, number>, grid: number[][]): 'unlocked' | 'rejected' | 'ignored' {
    if (!this.locked) return 'ignored';

    // 'event' and 'switch' doors don't respond to direct attacks.
    // 'switch' doors are unlocked by hitting a linked Switch entity.
    if (this.unlockCondition === 'event' || this.unlockCondition === 'switch') return 'ignored';

    if (this.unlockCondition === 'stat') {
      const val = playerStats[this.statType] ?? 0;
      if (val >= this.statThreshold) {
        this.unlock(grid);
        return 'unlocked';
      }
      this.reject();
      return 'rejected';
    }

    return 'ignored';
  }

  /** Remove collision, hide stat label artifacts, and start the mid-slide
   *  open animation. Top/bottom caps stay visible permanently. */
  unlock(grid: number[][]): void {
    if (!this.locked) return;
    this.locked = false;

    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0; // open
      }
    }
    this.gridCells = [];

    // Stat-gate UI is solved — fade it out instantly with the open.
    if (this.label) this.label.visible = false;
    if (this.rejectCross) this.rejectCross.visible = false;

    if (this.midSlice) {
      // Animated retract — top/bottom caps remain. update() drives the slide.
      this.sliding = true;
      this.slideTimer = 0;
    } else {
      // Texture never loaded → only the Graphics fallback exists. Hide the
      // whole container as before — caps don't exist to keep visible.
      this.container.visible = false;
    }
  }

  /** Play reject animation — shake + red flash. */
  private reject(): void {
    this.rejectTimer = 400; // ms
  }

  /** Call every frame with dt in ms. */
  update(dt: number): void {
    if (this.rejectTimer > 0) {
      this.rejectTimer -= dt;
      // Shake horizontally
      this.rejectShakeOffset = Math.sin(this.rejectTimer * 0.05) * 3;
      this.container.x = this.x + this.rejectShakeOffset;

      // Flash red tint + show cross over the stat requirement
      const flash = Math.sin(this.rejectTimer * 0.02) > 0;
      if (this.label) this.label.style.fill = flash ? 0xff0000 : 0xff5555;
      if (this.rejectCross) this.rejectCross.visible = flash;

      if (this.rejectTimer <= 0) {
        this.rejectTimer = 0;
        this.container.x = this.x;
        if (this.label) this.label.style.fill = 0xff5555;
        if (this.rejectCross) this.rejectCross.visible = false;
      }
    }

    // Slide-down open animation — mid strip retracts inside its mask, so the
    // bottom cap looks like a pocket the door slides into.
    if (this.sliding && this.midSlice) {
      this.slideTimer += dt;
      const t = Math.min(1, this.slideTimer / DOOR_SLIDE_MS);
      // Ease-out cubic: snappy start, soft settle.
      const ease = 1 - Math.pow(1 - t, 3);
      this.midSlice.y = this.topDispH + this.midDispH * ease;
      if (t >= 1) {
        this.sliding = false;
        this.midSlice.visible = false;
      }
    }
  }

  /** Get the door's AABB for hit detection. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
