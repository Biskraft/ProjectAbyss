import { GameAction, InputManager } from '@core/InputManager';

/**
 * HTML-based virtual gamepad overlay for mobile/touch devices.
 * Renders at native resolution above the game canvas.
 * Supports both portrait and landscape orientations.
 */
export class VirtualPad {
  private root: HTMLDivElement;
  private input: InputManager;
  private activeActions = new Map<number, GameAction>(); // touchId → action

  /** Only create the pad on touch-capable devices */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  constructor(input: InputManager) {
    this.input = input;
    this.root = document.createElement('div');
    this.root.id = 'virtual-pad';
    this.build();
    document.body.appendChild(this.root);
  }

  private build(): void {
    this.root.innerHTML = '';

    // --- D-Pad (left side) ---
    const dpad = this.createZone('vpad-dpad');

    const up = this.createBtn('▲', GameAction.LOOK_UP, 'vpad-up');
    const down = this.createBtn('▼', GameAction.LOOK_DOWN, 'vpad-down');
    const left = this.createBtn('◀', GameAction.MOVE_LEFT, 'vpad-left');
    const right = this.createBtn('▶', GameAction.MOVE_RIGHT, 'vpad-right');

    dpad.append(up, down, left, right);

    // --- Action buttons (right side) ---
    const actions = this.createZone('vpad-actions');

    const atkBtn = this.createBtn('ATK', GameAction.ATTACK, 'vpad-atk');
    const jumpBtn = this.createBtn('JMP', GameAction.JUMP, 'vpad-jump');
    const dashBtn = this.createBtn('DSH', GameAction.DASH, 'vpad-dash');

    actions.append(atkBtn, jumpBtn, dashBtn);

    // --- Utility buttons (top area) ---
    const utils = this.createZone('vpad-utils');
    const invBtn = this.createBtn('INV', GameAction.INVENTORY, 'vpad-inv');
    const menuBtn = this.createBtn('ESC', GameAction.MENU, 'vpad-menu');
    utils.append(invBtn, menuBtn);

    this.root.append(dpad, actions, utils);
    this.injectStyles();
  }

  private createZone(cls: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = cls;
    return div;
  }

  private createBtn(label: string, action: GameAction, cls: string): HTMLDivElement {
    const btn = document.createElement('div');
    btn.className = `vpad-btn ${cls}`;
    btn.textContent = label;
    btn.dataset.action = action;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        this.activeActions.set(touch.identifier, action);
      }
      this.input.setVirtualAction(action, true);
      btn.classList.add('active');
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        this.activeActions.delete(touch.identifier);
      }
      // Only release if no other touch is holding this action
      const stillHeld = Array.from(this.activeActions.values()).includes(action);
      if (!stillHeld) {
        this.input.setVirtualAction(action, false);
        btn.classList.remove('active');
      }
    }, { passive: false });

    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        this.activeActions.delete(touch.identifier);
      }
      const stillHeld = Array.from(this.activeActions.values()).includes(action);
      if (!stillHeld) {
        this.input.setVirtualAction(action, false);
        btn.classList.remove('active');
      }
    }, { passive: false });

    return btn;
  }

  private injectStyles(): void {
    if (document.getElementById('vpad-styles')) return;
    const style = document.createElement('style');
    style.id = 'vpad-styles';
    style.textContent = `
      #virtual-pad {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1000;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      }

      .vpad-btn {
        pointer-events: auto;
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        border: 2px solid rgba(255,255,255,0.25);
        color: rgba(255,255,255,0.6);
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        touch-action: none;
        transition: background 0.05s, transform 0.05s;
      }
      .vpad-btn.active {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.5);
        transform: scale(0.92);
        color: #fff;
      }

      /* ===== D-PAD ===== */
      .vpad-dpad {
        position: absolute;
      }
      .vpad-up, .vpad-down, .vpad-left, .vpad-right {
        width: 52px; height: 52px;
        border-radius: 12px;
      }

      /* ===== ACTION BUTTONS ===== */
      .vpad-actions {
        position: absolute;
      }
      .vpad-atk, .vpad-jump, .vpad-dash {
        width: 60px; height: 60px;
      }
      .vpad-atk {
        background: rgba(255,80,80,0.18);
        border-color: rgba(255,80,80,0.4);
      }
      .vpad-atk.active {
        background: rgba(255,80,80,0.4);
        border-color: rgba(255,80,80,0.7);
      }
      .vpad-jump {
        background: rgba(80,180,255,0.18);
        border-color: rgba(80,180,255,0.4);
      }
      .vpad-jump.active {
        background: rgba(80,180,255,0.4);
        border-color: rgba(80,180,255,0.7);
      }
      .vpad-dash {
        background: rgba(80,255,120,0.18);
        border-color: rgba(80,255,120,0.4);
      }
      .vpad-dash.active {
        background: rgba(80,255,120,0.4);
        border-color: rgba(80,255,120,0.7);
      }

      /* ===== UTILITY BUTTONS ===== */
      .vpad-utils {
        position: absolute;
      }
      .vpad-inv, .vpad-menu {
        width: 40px; height: 40px;
        font-size: 8px;
        border-radius: 8px;
      }

      /* ========================================
         LANDSCAPE (default — wider than tall)
         ======================================== */
      .vpad-dpad {
        bottom: 16px; left: 16px;
      }
      .vpad-left  { bottom: 52px; left: 0; }
      .vpad-right { bottom: 52px; left: 108px; }
      .vpad-up    { bottom: 108px; left: 54px; }
      .vpad-down  { bottom: 0; left: 54px; }

      .vpad-actions {
        bottom: 16px; right: 16px;
      }
      /* Diamond layout: ATK center-left, JMP top, DSH center-right */
      .vpad-atk  { bottom: 36px; right: 120px; }
      .vpad-jump { bottom: 96px; right: 56px; }
      .vpad-dash { bottom: 36px; right: 0; }

      .vpad-utils {
        top: 12px; right: 16px;
      }
      .vpad-inv  { position: relative; display: inline-block; margin-right: 8px; }
      .vpad-menu { position: relative; display: inline-block; }

      /* ========================================
         PORTRAIT (taller than wide)
         ======================================== */
      @media (orientation: portrait) {
        .vpad-dpad {
          bottom: 24px; left: 12px;
        }
        .vpad-left  { bottom: 44px; left: 0; }
        .vpad-right { bottom: 44px; left: 92px; }
        .vpad-up    { bottom: 92px; left: 46px; }
        .vpad-down  { bottom: 0; left: 46px; }

        .vpad-actions {
          bottom: 24px; right: 12px;
        }
        .vpad-atk  { bottom: 30px; right: 104px; }
        .vpad-jump { bottom: 84px; right: 48px; }
        .vpad-dash { bottom: 30px; right: 0; }

        .vpad-utils {
          top: 8px; right: 12px;
        }
      }

      /* Hide on non-touch / desktop */
      @media (hover: hover) and (pointer: fine) {
        #virtual-pad { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  destroy(): void {
    this.root.remove();
    const style = document.getElementById('vpad-styles');
    if (style) style.remove();
  }
}
