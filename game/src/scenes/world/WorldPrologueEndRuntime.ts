import type { Graphics } from 'pixi.js';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';

/**
 * WorldPrologueEndRuntime — Ch.0 프롤로그의 종료 시퀀스(P2.1~P6)를 코드로 잇는다.
 *
 * 트리거: scene='prologue' 상태로 마지막 프롤로그 지층(`ItemStratum_Prologue_04`)에
 * 진입하면 무장(레벨 진입 자체가 트리거 — 별도 LDtk 엔티티 불필요).
 *
 * 시퀀스(현재 placeholder — 말소자 스프라이트/컷신 와이드 아트는 미정):
 *   arm    : 진입 직후 잠깐 조작 유지(04 관찰).
 *   threat : 화면 암전(P2.1~P3 말소자·위상 찢김 자리). 조작 잠금.
 *   fade   : 완전 암전(P4~P5 Cascade 자리) → scene='chapter_01' + Start_Room_01 로드
 *            + "백업 복원 완료"(P6). 본격 컷신으로 교체 예정.
 *
 * update()가 sequence 중 true 를 반환 → 호출부가 early-return 하여 게임플레이를
 * 멈춘다(WorldEndingRuntime 와 동일 블로킹 패턴).
 */

const PROLOGUE_END_LEVEL = 'ItemStratum_Prologue_04';
const ENTRY_DELAY_MS = 1500;
const THREAT_MS = 2000;
const FADE_MS = 1500;
const THREAT_MAX_ALPHA = 0.6;

interface WorldPrologueEndRuntimeDeps {
  getFadeOverlay: () => Graphics;
  loadLevel: (levelId: string, enterFrom: 'left' | 'right' | 'up' | 'down') => void;
  showToast: (message: string, color: number) => void;
  isPrologueScene: () => boolean;
  setScene: (scene: string) => void;
}

type Phase = 'idle' | 'arm' | 'threat' | 'fade';

export class WorldPrologueEndRuntime {
  private phase: Phase = 'idle';
  private timer = 0;

  constructor(private readonly deps: WorldPrologueEndRuntimeDeps) {}

  loadLevel(level: LdtkLevel): void {
    this.phase = 'idle';
    this.timer = 0;
    if (this.deps.isPrologueScene() && level.identifier === PROLOGUE_END_LEVEL) {
      this.phase = 'arm';
    }
  }

  /** 시퀀스 진행 중이면 true (게임플레이 블록). */
  update(dt: number): boolean {
    if (this.phase === 'idle') return false;
    this.timer += dt;

    if (this.phase === 'arm') {
      if (this.timer >= ENTRY_DELAY_MS) {
        this.phase = 'threat';
        this.timer = 0;
      }
      return false; // 진입 딜레이 동안 조작 유지
    }

    const fade = this.deps.getFadeOverlay();

    if (this.phase === 'threat') {
      fade.alpha = Math.min(THREAT_MAX_ALPHA, (this.timer / THREAT_MS) * THREAT_MAX_ALPHA);
      if (this.timer >= THREAT_MS) {
        this.phase = 'fade';
        this.timer = 0;
      }
      return true;
    }

    // 'fade'
    fade.alpha = THREAT_MAX_ALPHA + Math.min(1 - THREAT_MAX_ALPHA, (this.timer / FADE_MS) * (1 - THREAT_MAX_ALPHA));
    if (this.timer >= FADE_MS) {
      this.phase = 'idle';
      this.timer = 0;
      // P6: 백업 복원 → Ch.1 기상. scene 전환으로 Start_Room_01 의 chapter_01 스폰 선택.
      this.deps.setScene('chapter_01');
      this.deps.loadLevel('Start_Room_01', 'down');
      this.deps.showToast(t('ui.prologue.backup_restored'), 0xaaccff);
      fade.alpha = 0;
    }
    return true;
  }

  clear(): void {
    this.phase = 'idle';
    this.timer = 0;
  }
}
