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
  [GameAction.JUMP]: ['KeyZ'],
  [GameAction.DASH]: ['KeyC'],
  [GameAction.ATTACK]: ['KeyX'],
  [GameAction.INVENTORY]: ['KeyI'],
  [GameAction.MENU]: ['Escape'],
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

  // Debug overlay
  private debugEl: HTMLDivElement | null = null;
  private lastKeydownCode = '';
  private lastKeydownKey = '';
  private lastKeydownComposing = false;
  private keydownCount = 0;

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
    this.setupDebugOverlay();
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

    // Debug tracking
    this.lastKeydownCode = code || '(empty)';
    this.lastKeydownKey = e.key;
    this.lastKeydownComposing = e.isComposing;
    this.keydownCount++;

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

  private setupDebugOverlay(): void {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;background:rgba(0,0,0,0.8);color:#0f0;font:12px monospace;padding:6px;z-index:99999;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
    this.debugEl = el;
  }

  private updateDebugOverlay(): void {
    if (!this.debugEl) return;
    const z = this.keyState.get('KeyZ') ? 'DOWN' : 'up';
    const x = this.keyState.get('KeyX') ? 'DOWN' : 'up';
    const c = this.keyState.get('KeyC') ? 'DOWN' : 'up';
    const pz = this.prevKeyState.get('KeyZ') ? 'DOWN' : 'up';
    const px = this.prevKeyState.get('KeyX') ? 'DOWN' : 'up';
    const pc = this.prevKeyState.get('KeyC') ? 'DOWN' : 'up';
    const jp_z = this.isJustPressed(GameAction.JUMP) ? 'YES' : 'no';
    const jp_x = this.isJustPressed(GameAction.ATTACK) ? 'YES' : 'no';
    const jp_c = this.isJustPressed(GameAction.DASH) ? 'YES' : 'no';
    const focus = document.activeElement?.tagName ?? '?';
    this.debugEl.textContent =
      `[Input Debug]\n` +
      `Last keydown: code=${this.lastKeydownCode} key=${this.lastKeydownKey} composing=${this.lastKeydownComposing} #${this.keydownCount}\n` +
      `KeyZ(jump):   curr=${z} prev=${pz} justPressed=${jp_z}\n` +
      `KeyX(attack): curr=${x} prev=${px} justPressed=${jp_x}\n` +
      `KeyC(dash):   curr=${c} prev=${pc} justPressed=${jp_c}\n` +
      `Focus: ${focus} | consumed: [${[...this.consumed].join(',')}]`;
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
    this.updateDebugOverlay();
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
