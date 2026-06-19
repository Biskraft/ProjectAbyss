import { t } from '@i18n';
import type { Container } from 'pixi.js';
import type { ItemWorldTrapdoorDescentRuntime } from './ItemWorldTrapdoorDescentRuntime';

interface TrapdoorDescentSnapshot {
  trapdoorX: number;
  trapdoorY: number;
  bossCellRow: number;
}

interface ItemWorldStratumContinueRuntimeDeps {
  showGameplayHud: () => void;
  resetFlowState: () => void;
  getTrapdoorDescentRuntime: () => ItemWorldTrapdoorDescentRuntime;
  getFullGrid: () => number[][];
  getTrapdoorDescentSnapshot: () => TrapdoorDescentSnapshot;
  getHoleAggregates: () => {
    wall: Container | null;
    shadow: Container | null;
    naturalDeco: Container | null;
    artificialDeco: Container | null;
    structure: Container | null;
    background: Container | null;
    seal: Container | null;
  };
  flashScreen: (color: number, alpha: number, durationMs: number) => void;
  shakeCamera: (intensity: number) => void;
  setHitstopFrames: (frames: number) => void;
  clearDamageNumbers: () => void;
  getCurrentStratumIndex: () => number;
  getTotalStrata: () => number;
  showToast: (message: string, color: number) => void;
}

export class ItemWorldStratumContinueRuntime {
  constructor(private readonly deps: ItemWorldStratumContinueRuntimeDeps) {}

  continueToNextStratum(): void {
    this.deps.showGameplayHud();
    this.deps.resetFlowState();
    this.punchBossFloorHole();
    this.playClearVfx();
    this.deps.clearDamageNumbers();

    const nextStratum = this.deps.getCurrentStratumIndex() + 1;
    this.deps.showToast(
      t('toast.descending_depth', { n: nextStratum + 1, total: this.deps.getTotalStrata() }),
      0xffa41b,
    );
  }

  private punchBossFloorHole(): void {
    const snapshot = this.deps.getTrapdoorDescentSnapshot();
    this.deps.getTrapdoorDescentRuntime().punchBossFloorHole({
      fullGrid: this.deps.getFullGrid(),
      trapdoorX: snapshot.trapdoorX,
      trapdoorY: snapshot.trapdoorY,
      bossCellRow: snapshot.bossCellRow,
      aggregates: this.deps.getHoleAggregates(),
    });
  }

  private playClearVfx(): void {
    this.deps.flashScreen(0xffaa22, 0.4, 200);
    this.deps.shakeCamera(7);
    this.deps.setHitstopFrames(6);
  }
}
