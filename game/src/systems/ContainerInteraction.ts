import type { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { KeyPrompt } from '@ui/KeyPrompt';
import { SFX } from '@audio/Sfx';
import type { Game } from '../Game';
import { GAME_HEIGHT, GAME_WIDTH } from '../Game';
import type { ArcTether } from '@effects/ArcTether';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';

interface ContainerSearchDeps {
  player: Player;
  containers: ThrowableContainer[];
  input: {
    isDown(action: GameAction): boolean;
  };
}

interface ContainerGrabState {
  pullStartX: number;
  pullStartY: number;
  pullElapsedMs: number;
  pullingContainer: ThrowableContainer;
  heldContainer: ThrowableContainer;
}

interface ArcTetherUpdateDeps {
  dtMs: number;
  player: Player;
  arcTether: ArcTether | null;
  heldContainer: ThrowableContainer | null;
  pullingContainer: ThrowableContainer | null;
  findHover: () => ThrowableContainer | null;
}

interface ContainerPromptDeps {
  game: Game;
  prompt: Container | null;
  heldContainer: ThrowableContainer | null;
  findTarget: () => ThrowableContainer | null;
  promptText: string;
}

function isArcBoosted(container: ThrowableContainer): boolean {
  return container.kind === 'ChargedCrate' || container.kind === 'ChargedCell';
}

export function findNearestGrabbableContainer({
  player,
  containers,
  input,
}: ContainerSearchDeps): ThrowableContainer | null {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  const maxRange = 96;
  const maxRangeSq = maxRange * maxRange;
  const adjacentThresholdSq = 24 * 24;
  const coneCos = 0.5;

  let dirX = player.facingRight ? 1 : -1;
  let dirY = 0;
  if (input.isDown(GameAction.LOOK_UP)) {
    dirX = 0;
    dirY = -1;
  } else if (input.isDown(GameAction.LOOK_DOWN)) {
    dirX = 0;
    dirY = 1;
  }

  let best: ThrowableContainer | null = null;
  let bestDist = Infinity;
  for (const c of containers) {
    if (c.destroyed || c.held) continue;
    const cx = c.colX + c.colW / 2;
    const cy = c.colY + c.colH / 2;
    const dx = cx - px;
    const dy = cy - py;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxRangeSq) continue;
    if (distSq <= adjacentThresholdSq) {
      if (distSq < bestDist) {
        best = c;
        bestDist = distSq;
      }
      continue;
    }

    const dist = Math.sqrt(distSq);
    const dot = (dx / dist) * dirX + (dy / dist) * dirY;
    if (dot < coneCos) continue;
    if (distSq < bestDist) {
      best = c;
      bestDist = distSq;
    }
  }
  return best;
}

export function startContainerGrabPull(
  target: ThrowableContainer,
  arcTether: ArcTether | null,
): ContainerGrabState {
  target.pickUp();
  arcTether?.startPull(isArcBoosted(target));
  SFX.play('grab_arc');

  return {
    pullStartX: target.x,
    pullStartY: target.y,
    pullElapsedMs: 0,
    pullingContainer: target,
    heldContainer: target,
  };
}

export function updateContainerArcTether({
  dtMs,
  player,
  arcTether,
  heldContainer,
  pullingContainer,
  findHover,
}: ArcTetherUpdateDeps): void {
  if (!arcTether) return;

  const fromX = player.x + player.width / 2;
  const fromY = player.y + player.height * 0.4;
  if (heldContainer && !heldContainer.destroyed) {
    const boosted = isArcBoosted(heldContainer);
    if (pullingContainer === heldContainer) {
      if (arcTether.getPhase() !== 'pull') arcTether.startPull(boosted);
    } else if (arcTether.getPhase() !== 'hold') {
      arcTether.setHold(boosted);
    }
    const toX = heldContainer.colX + heldContainer.colW / 2;
    const toY = heldContainer.colY + heldContainer.colH / 2;
    arcTether.update(dtMs, { x: fromX, y: fromY }, { x: toX, y: toY });
    return;
  }

  const hover = findHover();
  if (!hover) {
    if (arcTether.isVisible()) arcTether.hide();
    return;
  }

  const boosted = isArcBoosted(hover);
  if (arcTether.getPhase() !== 'hover') arcTether.setHover(boosted);
  const toX = hover.colX + hover.colW / 2;
  const toY = hover.colY + hover.colH / 2;
  arcTether.update(dtMs, { x: fromX, y: fromY }, { x: toX, y: toY });
}

export function updateContainerPrompt({
  game,
  prompt,
  heldContainer,
  findTarget,
  promptText,
}: ContainerPromptDeps): Container | null {
  const target = heldContainer ? null : findTarget();
  if (!target) {
    if (prompt) prompt.visible = false;
    return prompt;
  }

  let nextPrompt = prompt;
  if (!nextPrompt) {
    nextPrompt = KeyPrompt.createPromptForAction(GameAction.GRAB, promptText, game.uiScale);
    nextPrompt.visible = false;
    game.uiContainer.addChild(nextPrompt);
  } else if (!nextPrompt.parent) {
    game.uiContainer.addChild(nextPrompt);
  }

  const us = game.uiScale;
  const cam = game.camera;
  const worldX = target.colX + target.colW / 2;
  const worldY = target.colY;
  const sx = (worldX - cam.renderX + GAME_WIDTH / 2) * us - nextPrompt.width / 2;
  const sy = (worldY - cam.renderY + GAME_HEIGHT / 2 - 28) * us;
  nextPrompt.x = Math.round(sx);
  nextPrompt.y = Math.round(sy);
  nextPrompt.visible = true;
  return nextPrompt;
}
