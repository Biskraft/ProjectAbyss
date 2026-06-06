import { Container, Graphics } from 'pixi.js';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { getProgress01 } from '@scenes/shared/NumericHelpers';

/**
 * ItemWorldPrologueEndRuntime — Ch.0 프롤로그 종료 시퀀스(P2.1~P5).
 *
 * 발동: scene='prologue' 의 4지층(`ItemStratum_Prologue_04`)에 배치된 LDtk
 * `Trigger` 엔티티(TriggerName="prologue_end") 존을 플레이어가 터치하면 1회.
 *
 * 시퀀스(블로킹 — 조작 잠금):
 *   malsoja   : 말소자 등장(P2.1). 흰색 언캐니 인간형 호러가 솟아오른다(비교전).
 *   threat    : 위상 찢김(P3 The Sin). 화면 암전·흔들림·플래시. 말소자가 위상을 찢는다.
 *   cinematic : 줌인/완전 암전(P4~P5 Cascade). 검은 화면으로 빨려든다.
 *   → onDone(): 씬이 아이템계를 빠져나가 Ch.1(Start_Room_01, 백업 복원)로 전환.
 *
 * 말소자 비주얼은 placeholder(Graphics) — 정식 스프라이트/와이드 컷신 아트 미정
 * (Design_Art_Direction §14.4 / Plan_Ch0 §7 잔여 작업).
 *
 * update() 가 시퀀스 중 true 를 반환 → 호출부가 early-return 하여 게임플레이를
 * 멈춘다(WorldEndingRuntime 와 동일 블로킹 패턴).
 */

interface ItemWorldPrologueEndRuntimeDeps {
  getPlayer: () => Player;
  /** 씬의 풀스크린 페이드 오버레이(검정). alpha 직접 제어. */
  getFadeOverlay: () => Graphics;
  /** 월드 좌표 레이어 — 말소자 placeholder 부착. */
  getEntityLayer: () => Container;
  /** scene === 'prologue' 일 때만 발동. */
  isPrologue: () => boolean;
  shake: (intensity: number) => void;
  flash: () => void;
  /** 시퀀스 종료 → Ch.1 전환. */
  onDone: () => void;
}

type Phase = 'idle' | 'malsoja' | 'threat' | 'cinematic' | 'done';

const MALSOJA_MS = 1800;
const THREAT_MS = 2200;
const CINEMATIC_MS = 1600;
const THREAT_MAX_ALPHA = 0.55;

export class ItemWorldPrologueEndRuntime {
  private trigger: { x: number; y: number; w: number; h: number } | null = null;
  private phase: Phase = 'idle';
  private timer = 0;
  private malsoja: Container | null = null;
  private malsojaJitter = 0;
  private flashTimer = 0;

  constructor(private readonly deps: ItemWorldPrologueEndRuntimeDeps) {}

  /** LDtk Trigger(TriggerName="prologue_end") 존을 월드 AABB 로 등록. pivot [0,1]=좌하단. */
  register(entity: LdtkEntity, offX: number, offY: number): void {
    this.trigger = {
      x: offX + entity.px[0],
      y: offY + entity.px[1] - entity.height,
      w: entity.width,
      h: entity.height,
    };
  }

  clear(): void {
    if (this.malsoja) detachDisplayObject(this.malsoja);
    this.malsoja = null;
    this.trigger = null;
    this.phase = 'idle';
    this.timer = 0;
  }

  /** 시퀀스 진행 중이면 true (게임플레이 블록). */
  update(dt: number): boolean {
    if (this.phase === 'idle') {
      if (!this.trigger || !this.deps.isPrologue()) return false;
      const p = this.deps.getPlayer();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      const t = this.trigger;
      const inside = cx >= t.x && cx < t.x + t.w && cy >= t.y && cy < t.y + t.h;
      if (!inside) return false;
      this.startSequence();
      return true;
    }
    if (this.phase === 'done') return true;

    this.timer += dt;
    const fade = this.deps.getFadeOverlay();

    if (this.phase === 'malsoja') {
      const k = getProgress01(this.timer, MALSOJA_MS);
      if (this.malsoja) {
        this.malsoja.alpha = k;
        // 천천히 솟아오르며 미세 진동(언캐니).
        this.malsojaJitter += dt;
        this.malsoja.x = this.malsojaBaseX + Math.sin(this.malsojaJitter * 0.013) * 1.5;
      }
      if (this.timer >= MALSOJA_MS) {
        this.phase = 'threat';
        this.timer = 0;
      }
      return true;
    }

    if (this.phase === 'threat') {
      const k = getProgress01(this.timer, THREAT_MS);
      fade.alpha = THREAT_MAX_ALPHA * k;
      // 위상 찢김 — 흔들림 + 간헐 플래시 + 말소자 격한 진동.
      this.deps.shake(2 + k * 4);
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 260 - k * 140;
        this.deps.flash();
      }
      if (this.malsoja) {
        this.malsojaJitter += dt;
        const amp = 1.5 + k * 6;
        this.malsoja.x = this.malsojaBaseX + (Math.random() - 0.5) * amp;
        this.malsoja.y = this.malsojaBaseY + (Math.random() - 0.5) * amp;
      }
      if (this.timer >= THREAT_MS) {
        this.phase = 'cinematic';
        this.timer = 0;
      }
      return true;
    }

    // cinematic — 완전 암전으로 빨려든다.
    const k = getProgress01(this.timer, CINEMATIC_MS);
    fade.alpha = THREAT_MAX_ALPHA + (1 - THREAT_MAX_ALPHA) * k;
    if (this.malsoja) this.malsoja.alpha = 1 - k;
    if (this.timer >= CINEMATIC_MS) {
      this.phase = 'done';
      fade.alpha = 1;
      this.deps.onDone();
    }
    return true;
  }

  private malsojaBaseX = 0;
  private malsojaBaseY = 0;

  private startSequence(): void {
    this.phase = 'malsoja';
    this.timer = 0;
    const p = this.deps.getPlayer();
    // 플레이어 앞쪽(바라보는 방향)에 등장 — 화면 안에 들어오도록.
    const dir = p.facingRight ? 1 : -1;
    this.malsojaBaseX = p.x + p.width / 2 + dir * 56;
    this.malsojaBaseY = p.y + p.height;
    this.malsoja = this.buildMalsojaPlaceholder();
    this.malsoja.x = this.malsojaBaseX;
    this.malsoja.y = this.malsojaBaseY;
    this.malsoja.alpha = 0;
    this.deps.getEntityLayer().addChild(this.malsoja);
  }

  /**
   * 말소자 placeholder — 흰색 언캐니 인간형 실루엣(32px 폭). 길게 늘어난 몸,
   * 형체를 다 드러내지 않는 공허(불가지·고독 원칙). 정식 아트 교체 예정.
   */
  private buildMalsojaPlaceholder(): Container {
    const c = new Container();
    const g = new Graphics();
    // 발치 그림자.
    g.ellipse(0, 0, 16, 5).fill({ color: 0x000000, alpha: 0.35 });
    // 길게 늘어난 흰 몸통(pivot=발치, 위로 솟음).
    g.moveTo(-10, -2);
    g.bezierCurveTo(-13, -34, -7, -64, 0, -76);
    g.bezierCurveTo(7, -64, 13, -34, 10, -2);
    g.closePath();
    g.fill({ color: 0xf4f4f8, alpha: 0.92 });
    // 머리(형체 불명확) — 살짝 기운 타원.
    g.ellipse(0, -80, 8, 11).fill({ color: 0xfafaff, alpha: 0.95 });
    // 공허(얼굴 자리) — 이해 불가능성.
    g.ellipse(1, -80, 3.5, 6).fill({ color: 0x05060a, alpha: 0.9 });
    c.addChild(g);
    return c;
  }
}
