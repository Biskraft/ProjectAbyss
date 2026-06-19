interface StratumStartRoom {
  col: number;
  row: number;
}

interface ItemWorldStratumJumpRuntimeDeps {
  getCurrentStratumIndex: () => number;
  getStrataCount: () => number;
  resolveStartRoom: (stratumIndex: number) => StratumStartRoom | null;
  clearEnemies: () => void;
  applyStratumState: (stratumIndex: number, col: number, row: number) => void;
  updateProgress: (prevStratum: number, stratumIndex: number) => void;
  resetTrapdoorState: () => void;
  placePlayer: (stratumIndex: number, col: number, row: number) => void;
  activateStartRoom: (col: number, row: number) => void;
  showDepthToast: (stratumIndex: number) => void;
}

export class ItemWorldStratumJumpRuntime {
  constructor(private readonly deps: ItemWorldStratumJumpRuntimeDeps) {}

  jumpTo(stratumIndex: number): void {
    if (stratumIndex === this.deps.getCurrentStratumIndex()) return;
    if (stratumIndex < 0 || stratumIndex >= this.deps.getStrataCount()) return;

    const startRoom = this.deps.resolveStartRoom(stratumIndex);
    if (!startRoom) return;

    this.deps.clearEnemies();

    const prevStratum = this.deps.getCurrentStratumIndex();
    this.deps.applyStratumState(stratumIndex, startRoom.col, startRoom.row);
    this.deps.updateProgress(prevStratum, stratumIndex);
    this.deps.resetTrapdoorState();
    this.deps.placePlayer(stratumIndex, startRoom.col, startRoom.row);
    this.deps.activateStartRoom(startRoom.col, startRoom.row);
    this.deps.showDepthToast(stratumIndex);
  }
}
