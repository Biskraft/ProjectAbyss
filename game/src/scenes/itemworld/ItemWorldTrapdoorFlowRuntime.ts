interface TrapdoorLikeEntity {
  x: number;
  y: number;
  active?: boolean;
  consumed?: boolean;
  activate: () => void;
}

interface ItemWorldTrapdoorFlowRuntimeDeps {
  getTrapdoor: () => TrapdoorLikeEntity | null;
  captureDescentFromTrapdoor: (trapdoor: TrapdoorLikeEntity) => void;
  isFinalDescent: () => boolean;
  onPrepareDescent: () => void;
  onFinalDescent: () => void;
  onIntermediateDescent: () => void;
  hidePrompt: () => void;
  disposeTrapdoor: () => void;
}

export class ItemWorldTrapdoorFlowRuntime {
  constructor(private readonly deps: ItemWorldTrapdoorFlowRuntimeDeps) {}

  startDescent(): void {
    const trapdoor = this.deps.getTrapdoor();
    if (!trapdoor || trapdoor.active === false || trapdoor.consumed) return;

    this.deps.captureDescentFromTrapdoor(trapdoor);
    this.deps.hidePrompt();
    trapdoor.activate();

    if (!this.deps.isFinalDescent()) {
      this.deps.disposeTrapdoor();
    }

    this.deps.onPrepareDescent();

    if (this.deps.isFinalDescent()) {
      this.deps.onFinalDescent();
      return;
    }

    this.deps.onIntermediateDescent();
  }
}
