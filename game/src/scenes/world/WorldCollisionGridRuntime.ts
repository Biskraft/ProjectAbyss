export class WorldCollisionGridRuntime {
  private runtimeGrid: number[][] = [];

  get grid(): number[][] {
    return this.runtimeGrid;
  }

  cloneFrom(source: readonly (readonly number[])[]): number[][] {
    this.runtimeGrid = source.map(row => [...row]);
    return this.runtimeGrid;
  }
}
