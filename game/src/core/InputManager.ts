export enum GameAction {
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  LOOK_UP = 'LOOK_UP',
  LOOK_DOWN = 'LOOK_DOWN',
  JUMP = 'JUMP',
  DASH = 'DASH',
  ATTACK = 'ATTACK',
  INVENTORY = 'INVENTORY',
  MAP = 'MAP',
  MENU = 'MENU',
  DEBUG_RESET = 'DEBUG_RESET',
}

const DEFAULT_BINDINGS: Record<GameAction, string[]> = {
  [GameAction.MOVE_LEFT]: ['ArrowLeft'],
  [GameAction.MOVE_RIGHT]: ['ArrowRight'],
  [GameAction.LOOK_UP]: ['ArrowUp'],
  [GameAction.LOOK_DOWN]: ['ArrowDown'],
  [GameAction.JUMP]: ['KeyZ'],
  [GameAction.DASH]: ['KeyC'],
  [GameAction.ATTACK]: ['KeyX'],
  [GameAction.INVENTORY]: ['KeyI'],
  [GameAction.MAP]: ['KeyM'],
  [GameAction.MENU]: ['Escape'],
  [GameAction.DEBUG_RESET]: ['KeyP'],
};

const GAME_KEYS = new Set(
  Object.values(DEFAULT_BINDINGS).flat()
);

// Virtual key prefix to avoid collisions with real key codes
const VIRTUAL_PREFIX = 'Virtual_';

export class InputManager {
  private keyState = new Map<string, boolean>();
  private prevKeyState = new Map<string, boolean>();
  private consumed = new Set<string>();
  private bindings: Record<GameAction, string[]>;

  constructor() {
    this.bindings = { ...DEFAULT_BINDINGS };

    // Use capture phase + highest priority to beat IME interception
    window.addEventListener('keydown', (e) => this.onKeyDown(e), true);
    window.addEventListener('keyup', (e) => this.onKeyUp(e), true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetAll();
    });
    window.addEventListener('blur', () => this.resetAll());

    // Prevent IME from stealing game keys by intercepting at the document level.
    this.setupIMEBlock();
  }

  /**
   * Prevent IME composition from interfering with game keys.
   * On Korean Windows, the OS-level IME intercepts Z/X/C before the browser
   * can fire keydown. The only reliable fix is to ensure the active element
   * is a non-text element (canvas) so IME has nothing to compose into.
   */
  private setupIMEBlock(): void {
    // Ensure canvas gets focus and keeps it
    const refocus = () => {
      const canvas = document.querySelector('canvas');
      if (canvas && document.activeElement !== canvas) {
        canvas.setAttribute('tabindex', '0');
        canvas.style.outline = 'none';
        // inputMode 'none' tells mobile browsers not to show keyboard,
        // and tells desktop IME there's no text input here
        canvas.setAttribute('inputmode', 'none');
        canvas.focus();
      }
    };

    // Initial focus
    requestAnimationFrame(refocus);
    // Re-focus when clicking on the page
    window.addEventListener('click', refocus);
    // Re-focus when window regains focus
    window.addEventListener('focus', refocus);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const code = e.code;

    // IME produces keydown with key='Process' and sometimes empty code.
    // Always use e.code (physical key) which is reliable even during IME.
    if (e.key === 'Process' || e.isComposing) {
      if (code && GAME_KEYS.has(code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.keyState.set(code, true);
      }
      return;
    }

    if (e.repeat) return;
    if (GAME_KEYS.has(code)) {
      e.preventDefault();
    }
    this.keyState.set(code, true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const code = e.code;
    if (GAME_KEYS.has(code)) {
      e.preventDefault();
    }
    this.keyState.set(code, false);
  }

  private resetAll(): void {
    this.keyState.clear();
    this.prevKeyState.clear();
  }

  /** Called by VirtualPad on touchstart */
  setVirtualAction(action: GameAction, pressed: boolean): void {
    const vKey = VIRTUAL_PREFIX + action;
    this.keyState.set(vKey, pressed);
    // Also register in bindings so isDown/isJustPressed can find it
    const keys = this.bindings[action];
    if (!keys.includes(vKey)) {
      keys.push(vKey);
    }
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

  /** True if any key was just pressed this frame (for title screen, etc.) */
  anyKeyJustPressed(): boolean {
    for (const [key, down] of this.keyState) {
      if (down && this.prevKeyState.get(key) !== true && !this.consumed.has(key)) {
        return true;
      }
    }
    return false;
  }

  isJustReleased(action: GameAction): boolean {
    const keys = this.bindings[action];
    return keys.some(
      (k) => this.keyState.get(k) !== true && this.prevKeyState.get(k) === true
    );
  }
}
