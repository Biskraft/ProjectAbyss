export enum GameAction {
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  LOOK_UP = 'LOOK_UP',
  LOOK_DOWN = 'LOOK_DOWN',
  JUMP = 'JUMP',
  DASH = 'DASH',
  ATTACK = 'ATTACK',
  INVENTORY = 'INVENTORY',
  MENU = 'MENU',
}

const DEFAULT_BINDINGS: Record<GameAction, string[]> = {
  [GameAction.MOVE_LEFT]: ['ArrowLeft'],
  [GameAction.MOVE_RIGHT]: ['ArrowRight'],
  [GameAction.LOOK_UP]: ['ArrowUp'],
  [GameAction.LOOK_DOWN]: ['ArrowDown'],
  [GameAction.JUMP]: ['KeyX'],
  [GameAction.DASH]: ['KeyC'],
  [GameAction.ATTACK]: ['KeyZ'],
  [GameAction.INVENTORY]: ['KeyI'],
  [GameAction.MENU]: ['Escape'],
};

const GAME_KEYS = new Set(
  Object.values(DEFAULT_BINDINGS).flat()
);

export class InputManager {
  private keyState = new Map<string, boolean>();
  private prevKeyState = new Map<string, boolean>();
  private consumed = new Set<string>();
  private bindings: Record<GameAction, string[]>;

  constructor() {
    this.bindings = { ...DEFAULT_BINDINGS };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetAll();
    });
    window.addEventListener('blur', () => this.resetAll());
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
    this.keyState.set(e.code, true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
    this.keyState.set(e.code, false);
  }

  private resetAll(): void {
    this.keyState.clear();
    this.prevKeyState.clear();
  }

  update(): void {
    this.prevKeyState = new Map(this.keyState);
    this.consumed.clear();
  }

  isDown(action: GameAction): boolean {
    const keys = this.bindings[action];
    return keys.some((k) => this.keyState.get(k) === true);
  }

  isJustPressed(action: GameAction): boolean {
    const keys = this.bindings[action];
    return keys.some(
      (k) => this.keyState.get(k) === true && this.prevKeyState.get(k) !== true
        && !this.consumed.has(k)
    );
  }

  /** Mark a key as consumed so isJustPressed returns false for the rest of this frame */
  consumeJustPressed(action: GameAction): void {
    const keys = this.bindings[action];
    for (const k of keys) {
      if (this.keyState.get(k) === true && this.prevKeyState.get(k) !== true) {
        this.consumed.add(k);
      }
    }
  }

  isJustReleased(action: GameAction): boolean {
    const keys = this.bindings[action];
    return keys.some(
      (k) => this.keyState.get(k) !== true && this.prevKeyState.get(k) === true
    );
  }
}
