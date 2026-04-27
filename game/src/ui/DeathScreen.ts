/**
 * DeathScreen — "YOU DIED" overlay with statistics.
 *
 * Shows after player HP reaches 0. Displays session stats.
 * [C] to return to last save point.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { MODAL_BG, MODAL_BORDER, MODAL_BORDER_W, TEXT_NEGATIVE, TEXT_SECONDARY, TEXT_ACCENT, FONT_TITLE, FONT_HINT, createModalPanel } from './ModalPanel';
import { GameAction, actionKey } from '@core/InputManager';
import type { UISkin } from './UISkin';

const PANEL_W = 280;
const PANEL_H = 160;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

export interface DeathStats {
  time: number;       // ms played this session
  defeated: number;   // enemies killed
  goldLost: number;   // gold lost on death
}

export class DeathScreen {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private inputReady = false;
  private inputTimer = 0;
  private skin: UISkin | null = null;

  /** Called when player presses C to respawn */
  onRespawn: (() => void) | null = null;

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.visible = false;

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  show(stats: DeathStats): void {
    this.visible = true;
    this.container.visible = true;
    this.inputReady = false;
    this.inputTimer = 0;
    this.drawPanel(stats);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  update(dt: number): void {
    if (!this.visible) return;
    if (!this.inputReady) {
      this.inputTimer += dt;
      if (this.inputTimer > 1500) this.inputReady = true;
    }
  }

  confirm(): void {
    if (!this.inputReady) return;
    this.hide();
    this.onRespawn?.();
  }

  private drawPanel(stats: DeathStats): void {
    // Clear previous content
    this.container.removeChildren();

    // Overlay + 9-slice panel (or Graphics fallback)
    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    // "YOU DIED"
    const title = new BitmapText({
      text: 'YOU DIED',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_TITLE, fill: TEXT_NEGATIVE },
    });
    title.x = Math.floor((PANEL_W - 80) / 2);
    title.y = 16;
    this.panel.addChild(title);

    // Divider
    const div = new Graphics();
    div.moveTo(20, 36); div.lineTo(PANEL_W - 20, 36);
    div.stroke({ width: 1, color: MODAL_BORDER });
    this.panel.addChild(div);

    // Stats
    const lines = [
      `Time:     ${this.formatTime(stats.time)}`,
      `Defeated: ${stats.defeated}`,
      `Gold Lost: ${stats.goldLost}`,
    ];

    let y = 44;
    for (const line of lines) {
      const t = new BitmapText({
        text: line,
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
      });
      t.x = 24;
      t.y = y;
      this.panel.addChild(t);
      y += 14;
    }

    // Divider 2
    const div2 = new Graphics();
    div2.moveTo(20, y + 4); div2.lineTo(PANEL_W - 20, y + 4);
    div2.stroke({ width: 1, color: MODAL_BORDER });
    this.panel.addChild(div2);

    // [C] RETURN
    const action = new BitmapText({
      text: `[${actionKey(GameAction.ATTACK)}] RETURN TO SAVE POINT`,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_ACCENT },
    });
    action.x = Math.floor((PANEL_W - 180) / 2);
    action.y = y + 14;
    this.panel.addChild(action);
  }

  private formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
}
