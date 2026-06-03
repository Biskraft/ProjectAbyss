import type { Player } from '@entities/Player';
import type { ItemWorldGhostOverlay } from '@effects/ItemWorldGhostOverlay';

export class ItemWorldGhostRevealRuntime {
  private lastPlayerX: number | null = null;
  private lastPlayerY: number | null = null;
  private activated = false;

  reset(): void {
    this.lastPlayerX = null;
    this.lastPlayerY = null;
    this.activated = false;
  }

  update(
    dt: number,
    ghost: ItemWorldGhostOverlay,
    player: Player,
    onActivated?: () => void,
  ): void {
    const playerWorldX = player.container.x + player.width / 2;
    const playerWorldY = player.container.y + player.height;
    const localPlayerX = playerWorldX - ghost.container.x;
    const localPlayerY = playerWorldY - ghost.container.y;

    if (this.lastPlayerX !== null && this.lastPlayerY !== null) {
      const dx = playerWorldX - this.lastPlayerX;
      const dy = playerWorldY - this.lastPlayerY;
      if (!this.activated && dx * dx + dy * dy > 1) {
        this.activated = true;
        onActivated?.();
      }
    }

    this.lastPlayerX = playerWorldX;
    this.lastPlayerY = playerWorldY;
    ghost.update(dt, localPlayerX, localPlayerY, this.activated);
  }
}
