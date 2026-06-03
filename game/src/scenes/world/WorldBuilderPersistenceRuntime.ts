import type { GiantBuilder, GiantBuilderSnapshot } from '@entities/GiantBuilder';

export type WorldBuilderMode = 'cinematic' | 'patrol';

interface ResolvedBuilderSpawnState {
  alreadyPlayed: boolean;
  savedState: GiantBuilderSnapshot | undefined;
  savedY: number | undefined;
  spawnY: number;
}

export class WorldBuilderPersistenceRuntime {
  private activeLevelId: string | null = null;
  private activeMode: WorldBuilderMode | null = null;
  private readonly savedPositions = new Map<string, number>();
  private readonly savedStates = new Map<string, GiantBuilderSnapshot>();
  private readonly spawnerRunOnceKeys = new Set<string>();

  get isActiveCinematic(): boolean {
    return this.activeMode === 'cinematic';
  }

  resolveSpawnState(
    builderLevelId: string,
    runOnceKey: string,
    replayAtEnd: boolean,
    startY: number,
    endY: number,
  ): ResolvedBuilderSpawnState {
    const alreadyPlayed = runOnceKey.length > 0 && this.spawnerRunOnceKeys.has(runOnceKey);
    const savedState = this.savedStates.get(builderLevelId);
    const savedY = this.savedPositions.get(builderLevelId);
    const spawnY = savedState?.posY ?? savedY ?? (alreadyPlayed && replayAtEnd ? endY : startY);
    return { alreadyPlayed, savedState, savedY, spawnY };
  }

  markRunOnce(runOnceKey: string): void {
    if (runOnceKey.length > 0) this.spawnerRunOnceKeys.add(runOnceKey);
  }

  setActive(levelId: string, mode: WorldBuilderMode): void {
    this.activeLevelId = levelId;
    this.activeMode = mode;
  }

  saveActive(builder: GiantBuilder | null): void {
    if (!builder || !this.activeLevelId) return;
    this.savedPositions.set(this.activeLevelId, builder.posY);
    this.savedStates.set(this.activeLevelId, builder.createSnapshot());
  }

  clearActive(): void {
    this.activeLevelId = null;
    this.activeMode = null;
  }
}
