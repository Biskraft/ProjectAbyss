import { aabbOverlap } from '@core/Physics';
import type { Anvil } from '@entities/Anvil';
import type { Player } from '@entities/Player';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { AnvilPromptController } from './AnvilPromptController';

interface WorldAnvilInteractionRuntimeDeps {
  getAnvil: () => Anvil | null;
  getPlayer: () => Player;
  getPrompts: () => AnvilPromptController | null;
  isRetiredByBossClear: (anvil: Anvil | null) => boolean;
  isDeploymentActive: () => boolean;
  triggerFloorCollapse: () => void;
}

export class WorldAnvilInteractionRuntime {
  constructor(private readonly deps: WorldAnvilInteractionRuntimeDeps) {}

  isPlayerNearAnvil(promptRange = 16): boolean {
    const anvil = this.deps.getAnvil();
    if (!anvil) return false;
    const player = this.deps.getPlayer();
    return anvil.overlaps(
      player.x - promptRange,
      player.y - promptRange,
      player.width + promptRange * 2,
      player.height + promptRange * 2,
    );
  }

  hidePrompts(): void {
    this.deps.getPrompts()?.hideAll();
  }

  update(dt: number): void {
    const prompts = this.deps.getPrompts();
    prompts?.updateSuppression(dt);

    const anvil = this.deps.getAnvil();
    if (!anvil) {
      prompts?.hideAll();
      return;
    }

    if (this.deps.isRetiredByBossClear(anvil) && !anvil.disabled) {
      void anvil.setDisabled(true);
    }

    if (this.deps.isDeploymentActive()) {
      anvil.update(dt);
      prompts?.hideAll();
      return;
    }

    if ((anvil.used || anvil.disabled) && !anvil.hasItem()) {
      anvil.update(dt);
      prompts?.hideAction();
      if (anvil.disabled && this.isPlayerNearAnvil()) {
        prompts?.showDisabled(anvil);
      } else {
        prompts?.hideDisabled();
      }
      return;
    }

    anvil.update(dt);
    prompts?.hideDisabled();

    anvil.setShowHint(false);
    const isPromptSuppressed = prompts?.isSuppressed ?? false;
    if (this.isPlayerNearAnvil() && !isPromptSuppressed) {
      const promptKey = anvil.hasItem() ? 'prompt.acquire_item' : 'prompt.place_weapon';
      prompts?.showAction(anvil, promptKey);
    } else {
      prompts?.hideAction();
    }

    const attackHitbox = getActivePlayerAttackHitbox(this.deps.getPlayer());
    if (anvil.hasItem() && attackHitbox && aabbOverlap(attackHitbox, anvil.getHitAABB())) {
      this.deps.triggerFloorCollapse();
    }
  }
}
