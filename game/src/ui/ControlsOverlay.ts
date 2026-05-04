import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { CONTROL_BINDINGS } from '@data/inputBindings';
import { onDeviceChange, getInputDevice } from '@core/input/InputDeviceTracker';

/**
 * 키↔패드 동시 표기 컨트롤 가이드 (System_Input_Gamepad §8.1 Stage 2).
 *
 * Goodboy Galaxy 형식 — 두 컬럼 항상 표시. 감지된 디바이스 컬럼은 alpha 0.15
 * highlight. gamepadconnected/disconnected → InputDeviceTracker.onDeviceChange
 * 로 자동 highlight 전환.
 *
 * 데이터 SSoT: game/src/data/inputBindings.ts
 */
export class ControlsOverlay {
  container: Container;
  private kbHighlight!: Graphics;
  private gpHighlight!: Graphics;

  // Layout
  private static readonly LINE_H = 9;
  private static readonly PAD_X = 6;
  private static readonly PAD_Y = 5;
  private static readonly BG_ALPHA = 0.55;
  private static readonly HIGHLIGHT_ALPHA = 0.15;
  private static readonly COL_ACTION_W = 46;
  private static readonly COL_KB_W = 64;
  private static readonly COL_GP_W = 56;
  private static readonly FONT = 6;

  constructor() {
    this.container = new Container();
    this.build();
    onDeviceChange(() => this.updateHighlight());
  }

  private build(): void {
    const { LINE_H, PAD_X, PAD_Y, BG_ALPHA, COL_ACTION_W, COL_KB_W, COL_GP_W, FONT } = ControlsOverlay;

    // Header (1) + divider (1) + bindings (N) — 표 끝까지.
    const headerRows = 2;
    const totalRows = headerRows + CONTROL_BINDINGS.length;
    const panelW = PAD_X * 2 + COL_ACTION_W + COL_KB_W + COL_GP_W;
    const panelH = PAD_Y * 2 + totalRows * LINE_H;

    // 우하단 정렬 (이전 ControlsOverlay 와 동일 위치 유지).
    const ox = GAME_WIDTH - panelW - 8;
    const oy = GAME_HEIGHT - panelH - 8;

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 2).fill({ color: 0x000000, alpha: BG_ALPHA });
    bg.x = ox;
    bg.y = oy;
    this.container.addChild(bg);

    // Column X 좌표
    const colX = {
      action: ox + PAD_X,
      kb: ox + PAD_X + COL_ACTION_W,
      gp: ox + PAD_X + COL_ACTION_W + COL_KB_W,
    };

    // Highlight 사각형 (header 아래 binding 행 전체) — bg 위·텍스트 아래.
    const highlightY = oy + PAD_Y + headerRows * LINE_H;
    const highlightH = CONTROL_BINDINGS.length * LINE_H;

    this.kbHighlight = new Graphics();
    this.kbHighlight.rect(0, 0, COL_KB_W, highlightH)
      .fill({ color: 0xffffff, alpha: ControlsOverlay.HIGHLIGHT_ALPHA });
    this.kbHighlight.x = colX.kb;
    this.kbHighlight.y = highlightY;
    this.container.addChild(this.kbHighlight);

    this.gpHighlight = new Graphics();
    this.gpHighlight.rect(0, 0, COL_GP_W, highlightH)
      .fill({ color: 0xffffff, alpha: ControlsOverlay.HIGHLIGHT_ALPHA });
    this.gpHighlight.x = colX.gp;
    this.gpHighlight.y = highlightY;
    this.container.addChild(this.gpHighlight);

    // Header
    const headerY = oy + PAD_Y;
    this._addText('Action',   colX.action, headerY, FONT, 0xaaaaaa);
    this._addText('Keyboard', colX.kb,     headerY, FONT, 0xaaaaaa);
    this._addText('Gamepad',  colX.gp,     headerY, FONT, 0xaaaaaa);

    // Divider
    const divider = new Graphics();
    divider.rect(0, 0, panelW - PAD_X * 2, 1).fill({ color: 0x666666, alpha: 0.6 });
    divider.x = ox + PAD_X;
    divider.y = oy + PAD_Y + LINE_H + 1;
    this.container.addChild(divider);

    // Bindings
    for (let i = 0; i < CONTROL_BINDINGS.length; i++) {
      const { action, kb, gp } = CONTROL_BINDINGS[i];
      const rowY = oy + PAD_Y + (i + headerRows) * LINE_H;
      this._addText(action, colX.action, rowY, FONT, 0xdddddd);
      this._addText(kb,     colX.kb,     rowY, FONT, 0xffcc44);
      this._addText(gp,     colX.gp,     rowY, FONT, 0x88ddff);
    }

    this.container.alpha = 0.7;
    this.updateHighlight();
  }

  private _addText(text: string, x: number, y: number, fontSize: number, color: number): void {
    const t = new BitmapText({
      text,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: color },
    });
    t.x = x;
    t.y = y;
    this.container.addChild(t);
  }

  /** 감지된 device 의 컬럼만 highlight visible. */
  private updateHighlight(): void {
    const device = getInputDevice();
    if (this.kbHighlight) this.kbHighlight.visible = device === 'keyboard';
    if (this.gpHighlight) this.gpHighlight.visible = device === 'gamepad';
  }
}
