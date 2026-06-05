import type { LdtkLoader } from '@level/LdtkLoader';
import type { WorldTransitionController } from './WorldTransitionController';

interface WorldSpawnStateDeps {
  loader: LdtkLoader;
  transitionController: WorldTransitionController;
  fallbackLevelId: string;
  isDebugMode: () => boolean;
  getScene: () => string;
}

export class WorldSpawnState {
  private levelId = '';

  constructor(private readonly deps: WorldSpawnStateDeps) {}

  get currentLevelId(): string {
    return this.levelId;
  }

  setCurrentLevelId(levelId: string): void {
    this.levelId = levelId;
  }

  findFallbackLevelId(): string {
    return this.deps.transitionController.findPlayerSpawnLevel(
      this.deps.loader,
      this.deps.fallbackLevelId,
      this.deps.getScene(),
    );
  }

  canLoadLevel(levelId: string | null | undefined): levelId is string {
    if (!levelId) return false;
    const level = this.deps.loader.getLevel(levelId);
    if (!level) return false;
    return level.roomType !== 'Debug' || this.deps.isDebugMode();
  }

  resolveLevelId(savedLevelId: string | null | undefined): string {
    if (this.canLoadLevel(savedLevelId)) return savedLevelId;
    const fallbackLevelId = this.findFallbackLevelId();
    if (savedLevelId) {
      console.warn(
        `[LdtkWorldScene] Saved level "${savedLevelId}" is missing or inaccessible; using "${fallbackLevelId}"`,
      );
    }
    return fallbackLevelId;
  }
}
