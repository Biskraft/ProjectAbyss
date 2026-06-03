import { ColorMatrixFilter, type Container, type Filter } from 'pixi.js';
import type { Game } from '../../Game';

interface ItemWorldEntryCorridorVisibilityRuntimeDeps {
  game: Game;
  getHideTargets: () => Array<Container | null | undefined>;
  getColorRestoreTargets: () => Array<Container | null | undefined>;
  getPlayerContainer: () => Container;
  getParallaxContainer: () => Container;
  hideHud: () => void;
}

const ENTRY_CORRIDOR_CONTRAST = 0.5;
const ENTRY_CORRIDOR_BACKGROUND_BRIGHTNESS = 2.2;
const ENTRY_CORRIDOR_COLOR_HOLD_MS = 1000;
const ENTRY_CORRIDOR_COLOR_RESTORE_MS = 1000;

export class ItemWorldEntryCorridorVisibilityRuntime {
  private hiddenTargets: Array<{ target: Container; visible: boolean }> = [];
  private backgroundFilters: Filter[] | null = null;
  private colorRestoreFilter: ColorMatrixFilter | null = null;
  private colorRestoreTargets: Container[] = [];
  private colorRestoreElapsed = 0;

  constructor(private readonly deps: ItemWorldEntryCorridorVisibilityRuntimeDeps) {}

  suppressWorld(): void {
    this.hiddenTargets = [];
    const playerContainer = this.deps.getPlayerContainer();

    const hide = (target: Container | null | undefined): void => {
      if (!target || target === playerContainer) return;
      this.hiddenTargets.push({ target, visible: target.visible });
      target.visible = false;
    };

    for (const target of this.deps.getHideTargets()) {
      hide(target);
    }

    this.deps.getParallaxContainer().visible = true;
    this.applyBackgroundFilter();
    this.deps.hideHud();
  }

  restoreWorld(startColorRestore = true): void {
    for (const state of this.hiddenTargets) {
      state.target.visible = state.visible;
    }
    this.hiddenTargets = [];
    this.deps.getParallaxContainer().visible = true;
    this.restoreBackgroundFilter();
    if (startColorRestore) this.startColorRestore();
  }

  updateColorRestore(dt: number): void {
    if (!this.colorRestoreFilter) return;
    this.colorRestoreElapsed += dt;
    const restoreElapsed = Math.max(0, this.colorRestoreElapsed - ENTRY_CORRIDOR_COLOR_HOLD_MS);
    const t = Math.min(1, restoreElapsed / ENTRY_CORRIDOR_COLOR_RESTORE_MS);
    this.colorRestoreFilter.alpha = 1 - t;
    if (t >= 1) this.clearColorRestore();
  }

  clearColorRestore(): void {
    const filter = this.colorRestoreFilter;
    if (!filter) return;
    for (const target of this.colorRestoreTargets) {
      const next = ((target.filters as Filter[] | null) ?? []).filter(f => f !== filter);
      target.filters = next.length > 0 ? next : null;
    }
    this.colorRestoreFilter = null;
    this.colorRestoreTargets = [];
    this.colorRestoreElapsed = 0;
  }

  restoreBackgroundFilter(): void {
    if (this.backgroundFilters === null) return;
    this.deps.game.backgroundContainer.filters = this.backgroundFilters;
    this.backgroundFilters = null;
  }

  destroy(): void {
    this.clearColorRestore();
    this.restoreWorld(false);
    this.restoreBackgroundFilter();
  }

  private applyBackgroundFilter(): void {
    if (this.backgroundFilters !== null) return;
    this.backgroundFilters = [...(this.deps.game.backgroundContainer.filters ?? [])];
    const filter = new ColorMatrixFilter();
    filter.desaturate();
    filter.contrast(ENTRY_CORRIDOR_CONTRAST, true);
    filter.brightness(ENTRY_CORRIDOR_BACKGROUND_BRIGHTNESS, true);
    this.deps.game.backgroundContainer.filters = [...this.backgroundFilters, filter];
  }

  private startColorRestore(): void {
    this.clearColorRestore();
    const filter = new ColorMatrixFilter();
    filter.desaturate();
    filter.contrast(ENTRY_CORRIDOR_CONTRAST, true);
    filter.alpha = 1;

    const seen = new Set<Container>();
    const targets = this.deps.getColorRestoreTargets().filter((target): target is Container => {
      if (!target || seen.has(target)) return false;
      seen.add(target);
      return true;
    });

    for (const target of targets) {
      const current = (target.filters as Filter[] | null) ?? [];
      if (!current.includes(filter)) target.filters = [...current, filter];
    }

    this.colorRestoreFilter = filter;
    this.colorRestoreTargets = targets;
    this.colorRestoreElapsed = 0;
  }
}
