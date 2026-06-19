import type { ItemWorldDebugGenerationResult } from './ItemWorldGenerationRuntime';

interface ItemWorldDebugMapRefreshRuntimeDeps {
  isInitialized: () => boolean;
  generateDebugMap: () => ItemWorldDebugGenerationResult | null;
  applyGeneratedMap: (result: ItemWorldDebugGenerationResult) => void;
  computeMemoryPlacements: (debugSeed: number) => void;
  resetToStartRoom: () => void;
  resetRunState: () => void;
  rebuildEnvironment: () => void;
  placePlayerAtCurrentRoom: () => void;
  activateStartRoom: () => void;
  showToast: (message: string, color: number) => void;
}

export class ItemWorldDebugMapRefreshRuntime {
  constructor(private readonly deps: ItemWorldDebugMapRefreshRuntimeDeps) {}

  regenerate(): void {
    if (!this.deps.isInitialized()) return;
    const result = this.deps.generateDebugMap();
    if (!result) return;
    this.apply(result);
  }

  apply(result: ItemWorldDebugGenerationResult): void {
    this.deps.applyGeneratedMap(result);
    this.deps.computeMemoryPlacements(result.debugSeed);
    this.deps.resetToStartRoom();
    this.deps.resetRunState();
    this.deps.rebuildEnvironment();
    this.deps.placePlayerAtCurrentRoom();
    this.deps.activateStartRoom();
    this.deps.showToast(
      `[Debug] Item World ${String(result.rarity)} depth ${result.strataDepth} ${result.archetype}`,
      0x88ffcc,
    );
  }
}
