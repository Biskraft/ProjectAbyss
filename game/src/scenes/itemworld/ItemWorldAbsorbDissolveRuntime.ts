import { ColorMatrixFilter, type Container, type Filter } from 'pixi.js';
import { WorldPullInTransitionController } from '@effects/WorldPullInTransitionController';
import { appendFilterIfMissing } from '@scenes/shared/FilterLifecycleHelpers';
import type { Game } from '../../Game';

type AbsorbDissolveState = 'none' | 'absorbing' | 'dissolving';

interface PullTarget {
  container: Container;
  x: number;
  y: number;
  height: number;
}

interface ItemWorldAbsorbDissolveRuntimeDeps {
  game: Game;
  getTilemapContainer: () => Container;
  getFullMapContainer: () => Container | null;
  getBgAggregate: () => Container | null;
  getBuildingLayer: () => Container;
  getResidentsLayer: () => Container;
  getFluidLayer: () => Container;
  getAboveFluidLayer: () => Container;
  getEntityLayer: () => Container;
  getPlayerContainer: () => Container;
  getTrapdoor: () => PullTarget | null;
  getFadeOverlayParent: () => Container | null;
  onComplete: () => void;
}

const ABSORB_DURATION_MS = 1000;

export class ItemWorldAbsorbDissolveRuntime {
  private state: AbsorbDissolveState = 'none';
  private absorbFilter: ColorMatrixFilter | null = null;
  private absorbTimer = 0;
  private pullInTransition: WorldPullInTransitionController | null = null;
  private directorHandoffStarted = false;

  constructor(private readonly deps: ItemWorldAbsorbDissolveRuntimeDeps) {}

  get isActive(): boolean {
    return this.state !== 'none';
  }

  prepareFilter(): void {
    this.applyAbsorbFilter();
  }

  start(): void {
    this.state = 'absorbing';
    this.absorbTimer = 0;
    this.directorHandoffStarted = false;
    this.applyAbsorbFilter();
  }

  update(dt: number): void {
    if (this.state === 'absorbing') {
      this.absorbTimer += dt;
      if (this.absorbTimer >= ABSORB_DURATION_MS) {
        this.startDissolve();
      }
      return;
    }

    if (this.state !== 'dissolving') return;
    if (!this.pullInTransition) {
      this.finishDissolve();
      return;
    }
    if (this.pullInTransition.update(dt)) {
      this.finishDissolveUnderCover();
    }
  }

  cleanup(restoreSources: boolean): void {
    this.cleanupPullIn(restoreSources);
    if (restoreSources) {
      this.removeAbsorbFilter();
      this.state = 'none';
      this.absorbTimer = 0;
      this.directorHandoffStarted = false;
    }
  }

  private applyAbsorbFilter(): void {
    if (!this.absorbFilter) {
      this.absorbFilter = new ColorMatrixFilter();
      this.absorbFilter.desaturate();
      this.absorbFilter.contrast(0.5, true);
    }
    this.absorbFilter.alpha = 1;

    const fullMapContainer = this.deps.getFullMapContainer();
    if (fullMapContainer) {
      appendFilterIfMissing(fullMapContainer, this.absorbFilter);
    }

    const background = this.deps.game.backgroundContainer;
    appendFilterIfMissing(background, this.absorbFilter);
  }

  private removeAbsorbFilter(): void {
    const filter = this.absorbFilter;
    if (!filter) return;

    const fullMapContainer = this.deps.getFullMapContainer();
    if (fullMapContainer) {
      fullMapContainer.filters = ((fullMapContainer.filters as Filter[] | null) ?? []).filter(f => f !== filter);
    }

    const background = this.deps.game.backgroundContainer;
    background.filters = ((background.filters as Filter[] | null) ?? []).filter(f => f !== filter);
    this.absorbFilter = null;
  }

  private startDissolve(): void {
    this.state = 'dissolving';
    this.directorHandoffStarted = false;
    this.cleanupPullIn(true);

    const transition = this.createPullInTransition();
    this.pullInTransition = transition;
    if (!transition.start()) {
      this.finishDissolve();
    }
  }

  private createPullInTransition(): WorldPullInTransitionController {
    return new WorldPullInTransitionController(this.deps.game, {
      tilemapContainer: this.deps.getTilemapContainer(),
      fullMapContainer: this.deps.getFullMapContainer(),
      bgAggregate: this.deps.getBgAggregate(),
      buildingLayer: this.deps.getBuildingLayer(),
      residentsLayer: this.deps.getResidentsLayer(),
      fluidLayer: this.deps.getFluidLayer(),
      aboveFluidLayer: this.deps.getAboveFluidLayer(),
      entityLayer: this.deps.getEntityLayer(),
      playerContainer: this.deps.getPlayerContainer(),
      trapdoor: this.deps.getTrapdoor(),
    });
  }

  private finishDissolve(): void {
    this.removeAbsorbFilter();
    this.promoteTrapdoorFallback();
    this.cleanupPullIn(false);
    this.state = 'none';
    this.directorHandoffStarted = false;
    this.deps.onComplete();
  }

  private finishDissolveUnderCover(): void {
    if (this.directorHandoffStarted) return;
    this.directorHandoffStarted = true;
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      startCovered: true,
      durationOutMs: 0,
      durationInMs: 0,
      holdFrames: 1,
      onSwap: () => this.finishDissolve(),
    });
    if (!started) this.finishDissolve();
  }

  private cleanupPullIn(restoreSources: boolean): void {
    this.pullInTransition?.cleanup(restoreSources);
    this.pullInTransition = null;
  }

  private promoteTrapdoorFallback(): void {
    const target = this.deps.getTrapdoor();
    const parent = this.deps.getFadeOverlayParent();
    if (!target || !parent || this.pullInTransition?.hasPromotedTrapdoor) return;

    const container = target.container;
    const global = container.parent
      ? container.parent.toGlobal({ x: container.x, y: container.y })
      : { x: container.x, y: container.y };
    const local = parent.toLocal(global);
    container.x = local.x;
    container.y = local.y;
    parent.addChild(container);
  }
}
