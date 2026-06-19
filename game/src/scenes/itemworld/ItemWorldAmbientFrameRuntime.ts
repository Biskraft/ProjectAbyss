interface ItemWorldAmbientFrameRuntimeDeps {
  beginInteractionFrame: () => void;
  updateWeather: (dtMs: number) => void;
  updateEntryCorridorColorRestore: (dtMs: number) => void;
}

export class ItemWorldAmbientFrameRuntime {
  constructor(private readonly deps: ItemWorldAmbientFrameRuntimeDeps) {}

  update(dtMs: number): void {
    this.deps.beginInteractionFrame();
    this.deps.updateWeather(dtMs);
    this.deps.updateEntryCorridorColorRestore(dtMs);
  }
}
