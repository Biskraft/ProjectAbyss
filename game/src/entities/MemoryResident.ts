/**
 * MemoryResident.ts
 *
 * 거대 공동 거주자 — 비-적·비-충돌·idle anim 만 가진 패시브 NPC.
 *
 * Design ref: Documents/Design/Design_ItemWorld_Town_Shadow.md (DES-IW-TOWN-01)
 *   §2.1 인터랙티브 그림자 (Gatekeeper @ Plaza/hub, Archivist @ Archive/shrine)
 *   §3   거주자 dialogue 0줄. proximity 시 검 Ego 가 대신 발화.
 *   §4.1 검은 실루엣 + 청록 #4cd6c1 외곽선 = 인터랙티브 변별 신호.
 *
 * 메타포 톤: BLAME!의 거대 공동 / 자동화 보존소. 빌더가 떠난 뒤 잔류한 신호의
 * 인간형 흔적. Archivist 는 데이터 큐브(메모리 코어) 를 양손에 든 그림자.
 *
 * 본 엔티티는 자체 발화하지 않는다. proximity 진입 시 Scene 측에서
 * EgoDialogue (EGO_GATEKEEPER_FIRST 등) 를 트리거하는 것이 책임.
 *
 * 폴리시 단계에서 placeholder Graphics 를 PixelLab 스프라이트로 교체.
 */

import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

const OUTLINE_COLOR = 0x4cd6c1; // §4.1 청록 — 인터랙티브 변별 신호
const SILHOUETTE_COLOR = 0x0a0a14; // 검은 실루엣 베이스
const CORE_GLOW_COLOR = 0x88f0e0;  // 메모리 코어 시안 광점 (BLAME 데이터 노드 톤)
const PROXIMITY_RADIUS_DEFAULT = 80; // §2.1 proximity ≈ 80px

/* ── Ambient villager sprite sheet ──
 * shadow_town_villager.png — 8 cols × 8 rows, 32×32 frames = 64 종.
 * 행 단위로 자세 분류 (서있음·앉아있음·웅크림 등) 가 모호하므로 64 전부를
 * 단일 풀로 취급. spawn 측에서 RNG 로 골라 다양성 확보.
 */
const VILLAGER_SPRITE_PATH = 'assets/sprites/shadow_town_villager.png';
const VILLAGER_FRAME_SIZE = 32;
const VILLAGER_SHEET_COLS = 8;
const VILLAGER_SHEET_ROWS = 8;
const VILLAGER_FRAME_COUNT = VILLAGER_SHEET_COLS * VILLAGER_SHEET_ROWS; // 64
let villagerFrames: Texture[] | null = null;
let villagerLoadPromise: Promise<Texture[]> | null = null;
function loadVillagerFrames(): Promise<Texture[]> {
  if (villagerLoadPromise) return villagerLoadPromise;
  villagerLoadPromise = (async () => {
    const sheet = await Assets.load<Texture>(assetPath(VILLAGER_SPRITE_PATH));
    sheet.source.scaleMode = 'nearest';
    const frames: Texture[] = [];
    for (let i = 0; i < VILLAGER_FRAME_COUNT; i++) {
      const cx = i % VILLAGER_SHEET_COLS;
      const cy = Math.floor(i / VILLAGER_SHEET_COLS);
      frames.push(new Texture({
        source: sheet.source,
        frame: new Rectangle(cx * VILLAGER_FRAME_SIZE, cy * VILLAGER_FRAME_SIZE, VILLAGER_FRAME_SIZE, VILLAGER_FRAME_SIZE),
      }));
    }
    villagerFrames = frames;
    return frames;
  })();
  return villagerLoadPromise;
}

/**
 * Resident kinds (DES-IW-TOWN-01 §2):
 *   gatekeeper / archivist — 인터랙티브 (청록 외곽선, 검 Ego trigger)
 *   ambient                — 배경 그림자 (외곽선 없음, 인터랙션 없음, 호흡만)
 */
export type ResidentType = 'gatekeeper' | 'archivist' | 'ambient';

export class MemoryResident {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  readonly type: ResidentType;

  /** 자체 idle 시간. 호흡 ±0.5px / 1Hz (§2.2). */
  private timer = 0;
  /** 배경 그림자용 호흡 phase 분산 — 다수가 동시에 숨 쉬면 부자연스럽다. */
  private breathPhase = 0;
  private silhouette: Graphics;
  private outline: Graphics;
  /** Archivist 전용 — 메모리 코어 광점 노드. pulseCore() 시 한 회 강하게 발광. */
  private coreGlow: Graphics | null = null;
  private corePulseTimer = 0;
  /** Ambient 전용 — sprite frame index (variant % 8). */
  private ambientVariant = 0;
  /** Ambient 전용 — 로드된 sprite. 비동기 attach 까지 placeholder Graphics 가 보임. */
  private ambientSprite: Sprite | null = null;

  /**
   * @param variant - ambient 타입 형태 분산용 (0..3 권장). gatekeeper/archivist 는 무시.
   */
  constructor(x: number, y: number, type: ResidentType, variant: number = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.breathPhase = (variant % 4) * 0.7; // 라디안 오프셋

    // 형태 분기.
    if (type === 'gatekeeper') {
      this.width = 20;
      this.height = 40;
    } else if (type === 'archivist') {
      this.width = 18;
      this.height = 32;
    } else {
      // ambient — sprite sheet top row 8종 중 하나. proximity radius 와
      // 호흡 위상 분산을 위해 variant 보존.
      this.ambientVariant = variant % VILLAGER_FRAME_COUNT;
      this.width = VILLAGER_FRAME_SIZE;
      this.height = VILLAGER_FRAME_SIZE;
    }

    this.container = new Container();
    // Pivot bottom-center (LDtk default — 다른 엔티티들과 정합).
    this.container.x = x;
    this.container.y = y;

    this.silhouette = new Graphics();
    this.outline = new Graphics();
    this.container.addChild(this.silhouette);
    this.container.addChild(this.outline);
    this.draw();
  }

  /** 검은 실루엣 + 청록 외곽선 placeholder. 폴리시에서 sprite 로 교체. */
  private draw(): void {
    const w = this.width;
    const h = this.height;

    if (this.type === 'gatekeeper') {
      // 정면 응시, 봉/창 든 키 큰 실루엣 (자동화 경비 톤)
      // 머리
      this.silhouette.circle(0, -h + 6, 5).fill(SILHOUETTE_COLOR);
      this.outline.circle(0, -h + 6, 5).stroke({ color: OUTLINE_COLOR, width: 1 });
      // 몸통 (어깨 넓음)
      this.silhouette.rect(-w / 2, -h + 11, w, h - 11).fill(SILHOUETTE_COLOR);
      this.outline.rect(-w / 2, -h + 11, w, h - 11).stroke({ color: OUTLINE_COLOR, width: 1 });
      // 봉 (오른쪽, 수직)
      this.silhouette.rect(w / 2 + 1, -h - 4, 2, h + 4).fill(SILHOUETTE_COLOR);
      this.outline.rect(w / 2 + 1, -h - 4, 2, h + 4).stroke({ color: OUTLINE_COLOR, width: 1 });
    } else if (this.type === 'archivist') {
      // 아카이비스트: 굽은 자세, 양손에 메모리 코어 (BLAME 데이터 보관자 톤)
      // 머리 (앞으로 숙임 — 코어를 들여다봄)
      this.silhouette.circle(-1, -h + 5, 4).fill(SILHOUETTE_COLOR);
      this.outline.circle(-1, -h + 5, 4).stroke({ color: OUTLINE_COLOR, width: 1 });
      // 몸통 (굽음 — 아래로 갈수록 넓어짐)
      this.silhouette.rect(-w / 2, -h + 9, w, h - 9).fill(SILHOUETTE_COLOR);
      this.outline.rect(-w / 2, -h + 9, w, h - 9).stroke({ color: OUTLINE_COLOR, width: 1 });
      // 메모리 코어 (작은 큐브, 가슴 앞) — 외곽 하우징
      const coreCY = -h * 0.55;
      this.silhouette.rect(-3, coreCY - 3, 6, 6).fill(SILHOUETTE_COLOR);
      this.outline.rect(-3, coreCY - 3, 6, 6).stroke({ color: OUTLINE_COLOR, width: 1 });
      // 코어 내부 광점 — 시안 단일 색 (BLAME 데이터 노드)
      this.coreGlow = new Graphics();
      this.coreGlow.rect(-1, coreCY - 1, 2, 2).fill(CORE_GLOW_COLOR);
      this.container.addChild(this.coreGlow);
    } else {
      // ambient — sprite 로드 전 placeholder. 머리/몸통 단순 실루엣.
      // sprite 가 attach 되면 silhouette.visible = false 로 숨긴다.
      this.silhouette.circle(0, -h + 6, 3).fill(SILHOUETTE_COLOR);
      this.silhouette.rect(-3, -h + 9, 6, h - 9).fill(SILHOUETTE_COLOR);
      // §2.2 — 흐릿한 잔류 신호. 외곽선 없음, alpha 0.7 (둥실 톤).
      this.container.alpha = 0.7;
      this.attachAmbientSprite();
    }
  }

  /** Ambient 전용 — sprite sheet top row 8종 중 ambientVariant 프레임을 attach. */
  private attachAmbientSprite(): void {
    const apply = (frames: Texture[]) => {
      const tex = frames[this.ambientVariant % frames.length];
      if (!tex) return;
      this.silhouette.visible = false;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 1); // bottom-center pivot — 다른 엔티티와 정합
      this.container.addChild(sp);
      this.ambientSprite = sp;
    };
    if (villagerFrames) { apply(villagerFrames); return; }
    loadVillagerFrames().then(apply).catch(() => { /* keep placeholder */ });
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // 호흡/부유. breathPhase 로 ambient 다수 동기화 회피.
    //  - gatekeeper/archivist: 1Hz, ±0.5px (§2.2)
    //  - ambient: 둥실 — 0.7Hz, ±1.6px Y + ±0.3px X 미세 좌우
    let breath: number;
    let sway = 0;
    if (this.type === 'ambient') {
      breath = Math.sin(t * Math.PI * 2 * 0.7 + this.breathPhase) * 1.0;
    } else {
      breath = Math.sin(t * Math.PI * 2 + this.breathPhase) * 0.5;
    }
    this.container.y = this.y + breath;
    this.container.x = this.x + sway;

    if (this.type !== 'ambient') {
      // 인터랙티브 외곽선 미세 발광 — 청록 alpha pulse (§4.1)
      const glow = 0.75 + Math.sin(t * 1.5) * 0.25;
      this.outline.alpha = glow;
    }

    // Archivist 메모리 코어 광점 idle — 평소 미세 떨림, pulseCore() 시 강하게.
    if (this.type === 'archivist' && this.coreGlow) {
      if (this.corePulseTimer > 0) {
        this.corePulseTimer -= dt;
        const k = Math.max(0, this.corePulseTimer / 600);
        this.coreGlow.alpha = 1.0 + k * 0.8; // 1.0~1.8 — 일시 발광
        this.coreGlow.scale.set(1 + k * 0.6);
      } else {
        this.coreGlow.alpha = 0.85 + Math.sin(t * 2.5) * 0.15;
        this.coreGlow.scale.set(1);
      }
    }
  }

  /**
   * 메모리 코어 1회 동기화 발광 (§4.3, §6.2).
   * Recalled Shard 가 슬롯에 장착될 때 외부에서 호출.
   * Gatekeeper / ambient 에서는 무시.
   */
  pulseCore(): void {
    if (this.type !== 'archivist') return;
    this.corePulseTimer = 600; // ms
  }

  /**
   * proximity ≈ 80px (§2.1). 플레이어 중심점 기준 원형 거리 검사.
   * Scene 측에서 매 프레임 호출하여 첫 진입 시 EgoDialogue 트리거.
   */
  isPlayerNear(px: number, py: number, radius: number = PROXIMITY_RADIUS_DEFAULT): boolean {
    // 거주자 중심 = (this.x, this.y - this.height / 2) — bottom-pivot 보정
    const cx = this.x;
    const cy = this.y - this.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
