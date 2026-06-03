import type { Container } from 'pixi.js';

export class WorldAnvilDiveUiRuntime {
  private hidden = false;
  private wasVisible = true;

  constructor(private readonly uiContainer: Container) {}

  hide(): void {
    if (this.hidden) return;
    this.wasVisible = this.uiContainer.visible;
    this.uiContainer.visible = false;
    this.hidden = true;
  }

  restore(): void {
    if (!this.hidden) return;
    this.uiContainer.visible = this.wasVisible;
    this.hidden = false;
  }
}
