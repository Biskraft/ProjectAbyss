/**
 * ProximityRouter — Pattern D (proximity-interaction) 의 입력 라우터.
 *
 * 세이브 포인트, 앤빌, 제단 등 "플레이어가 근접해서 C(ATTACK) 로 상호작용"하는
 * 월드 오브젝트를 한 곳에서 관리한다. `UI_Interaction_Patterns.md § Pattern D`
 * 의 규약을 코드 레벨에서 강제하기 위한 헬퍼.
 *
 * 사용 순서 (Scene.update 안):
 *   1) scene.update(dt) 시작 직후
 *   2) proximityRouter.tryInteract(input) 호출
 *   3) 반환값이 true 면 early-return (player.update 전에 공격 입력 소비됨)
 *
 * 설계 규칙:
 *  - 확인 키는 C(ATTACK) 로 고정. 화살표·Z·X 금지.
 *  - 매칭 시 반드시 consumeJustPressed(ATTACK) 를 호출해 같은 프레임 헛스윙 방지.
 *  - 여러 오브젝트가 겹치면 priority 높은 쪽이 이긴다 (Altar 30 > Anvil 20 > Save 10).
 *  - 핸들러는 scene 생성 시 한 번만 register. 상태는 closure 로 `this.*` 참조.
 */
import { GameAction, InputManager } from './InputManager';

export interface ProximityInteraction {
  /** 디버그/로깅용 라벨. */
  readonly label: string;
  /** 높을수록 우선. 표준값: Altar 30, Anvil 20, Save 10. */
  readonly priority: number;
  /**
   * 이 프레임에 상호작용이 가능한 상태인가?
   * - proximity 판정 (AABB/거리)
   * - 외부 게이트 (UI 오픈 여부, 사용 완료 여부 등)
   * 모두 여기서 검사한다.
   */
  canInteract(): boolean;
  /** 상호작용 발동 시 호출. player.update() 전 단계라는 점을 전제로 작성. */
  onInteract(): void;
}

export class ProximityRouter {
  private handlers: ProximityInteraction[] = [];

  register(h: ProximityInteraction): void {
    this.handlers.push(h);
    this.handlers.sort((a, b) => b.priority - a.priority);
  }

  unregister(h: ProximityInteraction): void {
    const i = this.handlers.indexOf(h);
    if (i >= 0) this.handlers.splice(i, 1);
  }

  clear(): void {
    this.handlers.length = 0;
  }

  /**
   * C(ATTACK) 입력 시 첫 매칭 핸들러를 실행하고 입력을 소비한다.
   * 호출자는 player.update() 전에 이 메서드를 쓰고, true 반환 시 early-return.
   */
  tryInteract(input: InputManager): boolean {
    if (!input.isJustPressed(GameAction.ATTACK)) return false;
    for (const h of this.handlers) {
      if (h.canInteract()) {
        input.consumeJustPressed(GameAction.ATTACK);
        h.onInteract();
        return true;
      }
    }
    return false;
  }
}
