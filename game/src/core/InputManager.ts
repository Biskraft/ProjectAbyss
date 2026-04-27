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
  STATUS = 'STATUS',
  FLASK = 'FLASK',
  DEBUG_RESET = 'DEBUG_RESET',
  DEBUG_CHEAT = 'DEBUG_CHEAT',
  DEBUG_UI_TOGGLE = 'DEBUG_UI_TOGGLE',
}

// ── Preset definitions ────────────────────────────────────────────────────────

const PRESET_CLASSIC: Record<GameAction, string[]> = {
  [GameAction.MOVE_LEFT]: ['ArrowLeft'],
  [GameAction.MOVE_RIGHT]: ['ArrowRight'],
  [GameAction.LOOK_UP]: ['ArrowUp'],
  [GameAction.LOOK_DOWN]: ['ArrowDown'],
  [GameAction.JUMP]: ['KeyZ'],
  [GameAction.DASH]: ['KeyX'],
  [GameAction.ATTACK]: ['KeyC'],
  [GameAction.INVENTORY]: ['KeyI'],
  [GameAction.MAP]: ['KeyM'],
  [GameAction.STATUS]: ['Tab'],
  [GameAction.MENU]: ['Escape'],
  [GameAction.FLASK]: ['KeyR'],
  [GameAction.DEBUG_RESET]: ['KeyP'],
  [GameAction.DEBUG_CHEAT]: ['KeyO'],
  [GameAction.DEBUG_UI_TOGGLE]: ['KeyU'],
};

const PRESET_MODERN: Record<GameAction, string[]> = {
  ...PRESET_CLASSIC,
  [GameAction.JUMP]: ['Space'],
  [GameAction.DASH]: ['ShiftLeft', 'ShiftRight'],
  [GameAction.ATTACK]: ['KeyZ'],
};

const PRESET_WASD: Record<GameAction, string[]> = {
  ...PRESET_CLASSIC,
  [GameAction.MOVE_LEFT]: ['KeyA'],
  [GameAction.MOVE_RIGHT]: ['KeyD'],
  [GameAction.LOOK_UP]: ['KeyW'],
  [GameAction.LOOK_DOWN]: ['KeyS'],
  [GameAction.JUMP]: ['Space'],
  [GameAction.DASH]: ['ShiftLeft', 'ShiftRight'],
  [GameAction.ATTACK]: ['KeyJ'],
  [GameAction.FLASK]: ['KeyK'],
};

export const PRESETS: Record<string, Record<GameAction, string[]>> = {
  classic: PRESET_CLASSIC,
  modern: PRESET_MODERN,
  wasd: PRESET_WASD,
};

export const PRESET_NAMES = ['classic', 'modern', 'wasd'] as const;
export type PresetName = typeof PRESET_NAMES[number];

export interface PresetInfo {
  name: PresetName;
  label: string;
  move: string;
  jump: string;
  dash: string;
  attack: string;
}

export const PRESET_INFOS: PresetInfo[] = [
  { name: 'classic', label: 'CLASSIC', move: 'Arrow', jump: 'Z', dash: 'X', attack: 'C' },
  { name: 'modern', label: 'MODERN', move: 'Arrow', jump: 'Space', dash: 'Shift', attack: 'Z' },
  { name: 'wasd', label: 'WASD', move: 'WASD', jump: 'Space', dash: 'Shift', attack: 'J' },
];

const DEFAULT_BINDINGS = PRESET_CLASSIC;
const STORAGE_KEY = 'echoris-keybindings';

// ── GAME_KEYS set (rebuilt on preset change) ──────────────────────────────────

let GAME_KEYS = new Set(Object.values(DEFAULT_BINDINGS).flat());

// Fallback: map key characters to e.code for IME situations where e.code is empty
let KEY_CHAR_TO_CODE = new Map<string, string>();
function rebuildKeyMaps(bindings: Record<GameAction, string[]>): void {
  GAME_KEYS = new Set(Object.values(bindings).flat());
  KEY_CHAR_TO_CODE = new Map();
  for (const codes of Object.values(bindings)) {
    for (const code of codes) {
      if (code.startsWith('Key')) KEY_CHAR_TO_CODE.set(code.slice(3).toLowerCase(), code);
    }
  }
}

// Virtual key prefix to avoid collisions with real key codes
const VIRTUAL_PREFIX = 'Virtual_';

export class InputManager {
  private keyState = new Map<string, boolean>();
  private prevKeyState = new Map<string, boolean>();
  private consumed = new Set<string>();
  private bindings: Record<GameAction, string[]>;
  /** True while Shift is held. Used for debug key combos (Shift+O, Shift+P). */
  shiftDown = false;

  /** Currently active preset name */
  currentPreset: PresetName = 'classic';

  constructor() {
    // Load saved preset or use default
    const saved = this.loadSaved();
    if (saved) {
      this.currentPreset = saved.preset;
      this.bindings = saved.bindings;
    } else {
      this.bindings = { ...DEFAULT_BINDINGS };
    }
    rebuildKeyMaps(this.bindings);

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

  // ── Preset management ───────────────────────────────────────────────────────

  applyPreset(name: PresetName): void {
    const preset = PRESETS[name];
    if (!preset) return;
    this.currentPreset = name;
    this.bindings = structuredClone(preset);
    rebuildKeyMaps(this.bindings);
    this.save();
  }

  /** Get display string for a key (e.g. 'KeyZ' → 'Z', 'Space' → 'Space', 'ArrowLeft' → '←') */
  getKeyDisplay(action: GameAction): string {
    const keys = this.bindings[action];
    if (!keys?.length) return '?';
    const code = keys[0];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Arrow')) {
      const dir = code.slice(5);
      return { Left: '←', Right: '→', Up: '↑', Down: '↓' }[dir] ?? dir;
    }
    if (code === 'Space') return 'Space';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'Escape') return 'ESC';
    if (code === 'Tab') return 'Tab';
    return code;
  }

  /** Check if a saved preset exists (used by TitleScene to skip preset selection) */
  hasSavedPreset(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      preset: this.currentPreset,
      bindings: this.bindings,
    }));
  }

  private loadSaved(): { preset: PresetName; bindings: Record<GameAction, string[]> } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.preset || !data.bindings) return null;
      // Validate preset name
      if (!PRESET_NAMES.includes(data.preset)) return null;
      return { preset: data.preset, bindings: data.bindings };
    } catch {
      return null;
    }
  }

  // ── IME block ───────────────────────────────────────────────────────────────

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

  // ── Key event handling ──────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
    // Never intercept browser shortcuts (Ctrl/Meta combos like Ctrl+R, Ctrl+Shift+R)
    if (e.ctrlKey || e.metaKey) return;

    this.shiftDown = e.shiftKey;
    const code = e.code;

    // P0 CK-12: Block Tab from moving focus away from canvas
    if (e.key === 'Tab') {
      e.preventDefault();
      // Fall through so Tab is registered as a game key (STATUS action)
    }

    // IME produces keydown with key='Process' and sometimes empty code.
    // Always use e.code (physical key) which is reliable even during IME.
    // Some browsers/OS combos produce empty code — fallback to key-based lookup.
    if (e.key === 'Process' || e.isComposing) {
      const resolvedCode = (code && GAME_KEYS.has(code)) ? code : KEY_CHAR_TO_CODE.get(e.key?.toLowerCase() ?? '');
      if (resolvedCode && GAME_KEYS.has(resolvedCode)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.keyState.set(resolvedCode, true);
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
    this.shiftDown = e.shiftKey;
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

  /** Check if a raw key code was just pressed (for preset selection before bindings are set) */
  isRawKeyJustPressed(code: string): boolean {
    return this.keyState.get(code) === true
      && this.prevKeyState.get(code) !== true
      && !this.consumed.has(code);
  }
}
