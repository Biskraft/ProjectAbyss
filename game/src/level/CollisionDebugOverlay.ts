/**
 * CollisionDebugOverlay.ts — Shift+I 충돌 디버그 시각화.
 *
 * 씬의 월드 컨테이너(this.container, 카메라 변환 대상)에 얹어 충돌 그리드의
 * 모든 셀을 타일 종류별 색으로 면(반투명 fill) + 외곽선(stroke)으로 렌더한다.
 * `Debug.visible` (Shift+I) 에 연동 — 꺼져 있으면 그래픽을 비우고 숨긴다.
 *
 * 게임 로직/물리 무수정. 카메라 뷰포트 안의 셀만 컬링해서 그린다.
 *
 * 색상 규약(타일 의미 기준):
 *   solid wall  빨강   #FF3B3B   one-way     초록   #3BFF6E
 *   water       파랑   #3B6EFF   spike       핑크   #FF3BD0
 *   updraft     청록   #3BFFE0   magma       주황   #FF7A1A
 *   charged     노랑   #FFE03B   void        보라   #9B3BFF
 *   oil         갈색   #8C5A2B   acid        라임   #9BFF1A
 *   cyro        하늘   #9BD0FF   ice         흰파랑 #BFE8FF
 *   metal       회색   #9AA3B0   wood        탠     #C99A5B
 *   breakable   주홍   #FF6A3B   grass       연두   #6FCF3B
 */

import { Container, Graphics, Text } from 'pixi.js';
import { Debug } from '@core/Debug';
import type { Camera } from '@core/Camera';
import { GameRenderConst } from '@data/constData';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import {
  TILE_SIZE,
  TILE_WALL, TILE_WATER, TILE_PLATFORM, TILE_UPDRAFT, TILE_SPIKE, TILE_MAGMA,
  TILE_ICE, TILE_CHARGED, TILE_BREAKABLE, TILE_VOID, TILE_OIL, TILE_METAL,
  TILE_ACID, TILE_WOOD, TILE_GRASS, TILE_CYRO,
  collectSlopes2x1, isSolid, isOneWay,
} from '@core/Physics';

const FILL_ALPHA = 0.28;
const STROKE_ALPHA = 0.9;
/** 가상 2x1 경사면 표면색 (probe 'slope' 라벨색과 동일). */
const SLOPE_COLOR = 0x9bff1a;
/** GiantBuilder(이동 빌더) 자체 충돌 그리드 표시색 ('builder-surface' 라벨색과 동일). */
const BUILDER_COLOR = 0xff8000;

/**
 * 이동 빌더의 자체 충돌 그리드 + 월드 px 오프셋(타일 단위 origin).
 * 빌더 표면은 월드 collisionGrid 에 없어 별도로 그려야 보인다.
 */
export interface BuilderGrid {
  grid: number[][];
  originTileX: number;
  originTileY: number;
}

/**
 * 발밑 충돌 진단 입력. 씬이 매 프레임 플레이어 상태로 채워 넘긴다.
 * rect = 플레이어 충돌 AABB(월드 좌표). source = Player.groundSource.
 */
export interface GroundProbe {
  x: number; y: number; w: number; h: number;
  grounded: boolean;
  source: string;
  detail: string;
}

export interface CollisionDebugBox {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'collision' | 'hurtbox';
  owner: 'player' | 'enemy';
}

/** 타일 id → 색. air(0)/미정의 타일은 null(미렌더). */
function tileColor(tileId: number): number | null {
  switch (tileId) {
    case TILE_WALL: return 0xff3b3b;
    case TILE_PLATFORM: return 0x3bff6e;
    case TILE_WATER: return 0x3b6eff;
    case TILE_SPIKE: return 0xff3bd0;
    case TILE_UPDRAFT: return 0x3bffe0;
    case TILE_MAGMA: return 0xff7a1a;
    case TILE_CHARGED: return 0xffe03b;
    case TILE_VOID: return 0x9b3bff;
    case TILE_OIL: return 0x8c5a2b;
    case TILE_ACID: return 0x9bff1a;
    case TILE_CYRO: return 0x9bd0ff;
    case TILE_ICE: return 0xbfe8ff;
    case TILE_METAL: return 0x9aa3b0;
    case TILE_WOOD: return 0xc99a5b;
    case TILE_BREAKABLE: return 0xff6a3b;
    case TILE_GRASS: return 0x6fcf3b;
    default: return null;
  }
}

export class CollisionDebugOverlay {
  /** 월드 공간 레이어 (셀 + 플레이어 AABB). 씬의 카메라 변환 컨테이너에 추가. */
  readonly container = new Container();
  private readonly gfx = new Graphics();
  private readonly probeGfx = new Graphics();

  /** 화면 공간 진단 패널 (네이티브 해상도 — 또렷). game.uiContainer 에 추가. */
  readonly hud = new Container();
  private readonly hudBg = new Graphics();
  private readonly label: Text;
  private readonly uiScale: number;

  constructor(uiScale: number) {
    this.uiScale = uiScale;
    this.container.addChild(this.gfx);
    this.container.addChild(this.probeGfx);
    this.container.visible = false;
    this.container.eventMode = 'none';

    // 화면 공간 라벨 — 월드 RT 업스케일을 거치지 않아 또렷하다.
    // 플레이어 머리 위에 띄우므로 anchor 는 하단-중앙.
    this.label = new Text({
      text: '',
      style: {
        fill: 0xffffff, fontFamily: 'monospace',
        fontSize: 11 * uiScale, fontWeight: 'bold', align: 'center',
        stroke: { color: 0x000000, width: 3 * uiScale },
      },
    });
    this.label.anchor.set(0.5, 1);
    this.hud.addChild(this.hudBg);
    this.hud.addChild(this.label);
    this.hud.visible = false;
    this.hud.eventMode = 'none';
  }

  /** 월드 좌표 → 화면(uiContainer, 네이티브) 좌표. worldSprite 는 (0,0), zoom 1 에서 정확. */
  private worldToScreen(wx: number, wy: number, camera: Camera): { x: number; y: number } {
    const nativeW = GameRenderConst.GameWidth * this.uiScale;
    const nativeH = GameRenderConst.GameHeight * this.uiScale;
    const s = camera.zoom * this.uiScale;
    return {
      x: nativeW / 2 + (wx - camera.renderX) * s,
      y: nativeH / 2 + (wy - camera.renderY) * s,
    };
  }

  /**
   * 매 프레임 호출. Debug.visible 이 true 일 때만 뷰포트 내 충돌 셀을 그린다.
   * grid 는 row-major number[][] (셀 = TILE_SIZE px).
   * probe 를 넘기면 플레이어 발밑 충돌 소스를 월드 AABB + 화면 라벨로 진단 표시.
   */
  update(
    grid: number[][],
    camera: Camera,
    probe?: GroundProbe,
    builder?: BuilderGrid,
    boxes: CollisionDebugBox[] = [],
  ): void {
    if (!Debug.visible) {
      if (this.container.visible) {
        this.container.visible = false;
        this.hud.visible = false;
        this.gfx.clear();
        this.probeGfx.clear();
      }
      return;
    }
    this.container.visible = true;
    this.redraw(grid, camera, builder);
    this.drawProbe(probe, camera);
    this.drawDebugBoxes(boxes);
  }

  private drawDebugBoxes(boxes: CollisionDebugBox[]): void {
    const p = this.probeGfx;
    for (const box of boxes) {
      const color =
        box.kind === 'collision'
          ? (box.owner === 'player' ? 0xffffff : 0x66ccff)
          : (box.owner === 'player' ? 0xfff06a : 0xff66cc);
      const alpha = box.kind === 'collision' ? 1 : 0.95;
      const width = box.kind === 'collision' ? 1 : 2;
      p.rect(box.x, box.y, box.w, box.h).stroke({ color, alpha, width });
      if (box.kind === 'hurtbox') {
        p.rect(box.x + 1, box.y + 1, Math.max(0, box.w - 2), Math.max(0, box.h - 2))
          .stroke({ color, alpha: 0.45, width: 1 });
      }
    }
  }

  private drawProbe(probe: GroundProbe | undefined, camera: Camera): void {
    const p = this.probeGfx;
    p.clear();
    if (!probe) { this.hud.visible = false; return; }

    // 접지 소스별 색: grid=흰, slope=라임, none=회색, 그 외(scene collider)=주황.
    const color =
      probe.source === 'grid' ? 0xffffff :
      probe.source === 'slope' ? 0x9bff1a :
      probe.source === 'none' ? 0x888888 : 0xff8000;

    // 월드: 플레이어 충돌 AABB + 발밑 지지면 라인.
    p.rect(probe.x, probe.y, probe.w, probe.h).stroke({ color, alpha: 1, width: 1 });
    p.moveTo(probe.x - 2, probe.y + probe.h).lineTo(probe.x + probe.w + 2, probe.y + probe.h)
      .stroke({ color, alpha: 1, width: 1 });

    // 화면: 플레이어 머리 위에 띄우는 또렷한 진단 라벨.
    const detail = probe.detail ? `\n${probe.detail}` : '';
    this.label.text = `${probe.grounded ? 'GND' : 'AIR'}: ${probe.source}${detail}`;
    this.label.style.fill = color;

    // 머리 중앙(probe.x + w/2, probe.y) 을 화면으로 투영, 머리 위로 약간 띄움.
    const head = this.worldToScreen(probe.x + probe.w / 2, probe.y, camera);
    this.hud.x = Math.round(head.x);
    this.hud.y = Math.round(head.y - 6 * this.uiScale);
    this.hud.visible = true;

    // 배경 박스 — 라벨(anchor 0.5,1) 영역을 패딩과 함께 덮음.
    const pad = 3 * this.uiScale;
    const lw = this.label.width;
    const lh = this.label.height;
    this.hudBg.clear();
    this.hudBg.roundRect(-lw / 2 - pad, -lh - pad, lw + pad * 2, lh + pad * 2, 3 * this.uiScale)
      .fill({ color: 0x000000, alpha: 0.6 });
  }

  private redraw(grid: number[][], camera: Camera, builder?: BuilderGrid): void {
    const g = this.gfx;
    g.clear();

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return;

    // 카메라 뷰포트 → 가시 타일 범위 (+1 셀 패딩).
    const halfW = (camera.viewportW / 2) / camera.zoom;
    const halfH = (camera.viewportH / 2) / camera.zoom;
    const c0 = Math.max(0, Math.floor((camera.renderX - halfW) / TILE_SIZE) - 1);
    const r0 = Math.max(0, Math.floor((camera.renderY - halfH) / TILE_SIZE) - 1);
    const c1 = Math.min(cols - 1, Math.floor((camera.renderX + halfW) / TILE_SIZE) + 1);
    const r1 = Math.min(rows - 1, Math.floor((camera.renderY + halfH) / TILE_SIZE) + 1);

    for (let row = r0; row <= r1; row++) {
      const gridRow = grid[row];
      if (!gridRow) continue;
      for (let col = c0; col <= c1; col++) {
        const color = tileColor(gridRow[col]);
        if (color === null) continue;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        g.rect(x, y, TILE_SIZE, TILE_SIZE).fill({ color, alpha: FILL_ALPHA });
        g.rect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
          .stroke({ color, alpha: STROKE_ALPHA, width: 1 });
      }
    }

    // 가상 2x1 경사면 콜라이더 — 솔리드 타일에서 추론되는 대각선 표면선.
    // 셀 렌더에는 안 잡히므로 라임색 대각선 + 램프 채움으로 별도 표시.
    for (const s of collectSlopes2x1(grid, c0, r0, c1, r1)) {
      const lowY = Math.max(s.yLeft, s.yRight) + TILE_SIZE; // 저지대 셀 바닥.
      // 램프 채움(표면선 ~ 저지대 바닥 사이 삼각/사다리꼴).
      g.moveTo(s.x0, s.yLeft).lineTo(s.x1, s.yRight).lineTo(s.x1, lowY).lineTo(s.x0, lowY).closePath()
        .fill({ color: SLOPE_COLOR, alpha: FILL_ALPHA });
      // 표면선(플레이어가 실제로 딛는 경사 콜라이더).
      g.moveTo(s.x0, s.yLeft).lineTo(s.x1, s.yRight)
        .stroke({ color: SLOPE_COLOR, alpha: 1, width: 2 });
    }

    // 이동 빌더(GiantBuilder)의 자체 충돌 그리드 — 월드 그리드에 없는 "이동 바닥".
    // solid/one-way 셀만 주황으로 표시(= 'builder-surface' probe 색과 일치).
    if (builder) {
      const bg = builder.grid;
      const bRows = bg.length;
      const bCols = bg[0]?.length ?? 0;
      const ox = builder.originTileX;
      const oy = builder.originTileY;
      const bc0 = Math.max(0, c0 - ox);
      const br0 = Math.max(0, r0 - oy);
      const bc1 = Math.min(bCols - 1, c1 - ox);
      const br1 = Math.min(bRows - 1, r1 - oy);
      for (let br = br0; br <= br1; br++) {
        const brow = bg[br];
        if (!brow) continue;
        for (let bc = bc0; bc <= bc1; bc++) {
          const t = brow[bc];
          if (!isSolid(t) && !isOneWay(t)) continue;
          const x = (ox + bc) * TILE_SIZE;
          const y = (oy + br) * TILE_SIZE;
          g.rect(x, y, TILE_SIZE, TILE_SIZE).fill({ color: BUILDER_COLOR, alpha: FILL_ALPHA });
          g.rect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
            .stroke({ color: BUILDER_COLOR, alpha: 1, width: 1 });
        }
      }
    }
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
    destroyDisplayObject(this.hud, { children: true });
  }
}
