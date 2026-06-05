import type { Container, Graphics } from 'pixi.js';
import type { InventorySelectionPulseRect } from './InventorySelectionPulse';
import { redrawInventoryAnvilPulse, redrawInventorySelectionPulse } from './InventorySelectionPulse';
import { updateInventoryDivePromptPulse } from './InventoryAnvilSlotDisplay';
import type { InventoryStratumNoiseLayer } from './InventoryStratumCardDisplay';
import { redrawInventoryStratumNoiseLayers } from './InventoryStratumCardDisplay';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';

export interface InventoryPulseUpdateState {
  selectionPulseTimer: number;
  anvilPulseTimer: number;
  abyssNoiseTimer: number;
  abyssNoiseTick: number;
}

export interface InventoryPulseUpdateTargets {
  selectionPulseOverlay: Graphics | null;
  selectionPulseRect: InventorySelectionPulseRect | null;
  anvilPulseOverlay: Graphics | null;
  anvilPulseRect: InventorySelectionPulseRect | null;
  divePromptIcon: Container | null;
  divePromptLabel: Container | null;
  abyssNoiseLayers: readonly InventoryStratumNoiseLayer[];
}

export function updateInventoryPulses(
  state: InventoryPulseUpdateState,
  targets: InventoryPulseUpdateTargets,
  dt: number,
  mode: InventoryUIMode,
): InventoryPulseUpdateState {
  const next = { ...state };

  if (targets.selectionPulseOverlay && targets.selectionPulseRect) {
    next.selectionPulseTimer += dt;
    redrawInventorySelectionPulse(targets.selectionPulseOverlay, targets.selectionPulseRect, next.selectionPulseTimer);
  }

  if (mode !== 'anvil') return next;

  next.anvilPulseTimer += dt;
  if (targets.anvilPulseOverlay && targets.anvilPulseRect) {
    redrawInventoryAnvilPulse(targets.anvilPulseOverlay, targets.anvilPulseRect, next.anvilPulseTimer);
  }
  if (targets.divePromptIcon && targets.divePromptLabel) {
    updateInventoryDivePromptPulse(targets.divePromptIcon, targets.divePromptLabel, next.anvilPulseTimer);
  }

  next.abyssNoiseTimer += dt;
  if (next.abyssNoiseTimer >= 60 && targets.abyssNoiseLayers.length > 0) {
    next.abyssNoiseTimer = 0;
    next.abyssNoiseTick++;
    redrawInventoryStratumNoiseLayers(targets.abyssNoiseLayers, next.abyssNoiseTick);
  }

  return next;
}
