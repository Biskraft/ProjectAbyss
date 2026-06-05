import type { Graphics } from 'pixi.js';
import { drawSelectionPulse, ROW_SELECTED_GLOW_ALPHA } from '../ModalPanel';

export interface PauseMenuPulseRect {
  w: number;
  h: number;
}

export interface AdvancePauseMenuPulseOptions {
  active: boolean;
  gfx: Graphics | null;
  rect: PauseMenuPulseRect;
  timerMs: number;
  dt: number;
}

export interface PauseMenuPulseState {
  active: boolean;
  gfx: Graphics | null;
  rect: PauseMenuPulseRect;
  timerMs: number;
}

export function pauseMenuPulseAlpha(timerMs: number): number {
  const t = timerMs / 1000;
  return ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
}

export function redrawPauseMenuPulse(
  gfx: Graphics | null,
  rect: PauseMenuPulseRect,
  timerMs: number,
): void {
  if (!gfx) return;
  gfx.clear();
  drawSelectionPulse(gfx, rect.w, rect.h, pauseMenuPulseAlpha(timerMs), 'soft');
}

export function advancePauseMenuPulse(options: AdvancePauseMenuPulseOptions): number {
  const { active, gfx, rect, timerMs, dt } = options;
  if (!active || !gfx) return timerMs;
  const nextTimerMs = timerMs + dt;
  redrawPauseMenuPulse(gfx, rect, nextTimerMs);
  return nextTimerMs;
}

export function advancePauseMenuPulseStates<T extends Record<string, PauseMenuPulseState>>(
  states: T,
  dt: number,
): { [K in keyof T]: number } {
  const nextTimers = {} as { [K in keyof T]: number };
  for (const key of Object.keys(states) as Array<keyof T>) {
    const state = states[key];
    nextTimers[key] = advancePauseMenuPulse({
      active: state.active,
      gfx: state.gfx,
      rect: state.rect,
      timerMs: state.timerMs,
      dt,
    });
  }
  return nextTimers;
}
