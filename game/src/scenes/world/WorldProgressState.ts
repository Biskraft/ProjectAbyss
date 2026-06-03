interface WorldProgressSaveData {
  unlockedEvents?: readonly string[] | null;
  collectedRelics?: readonly string[] | null;
  collectedItems?: readonly string[] | null;
  visitedLevels?: readonly string[] | null;
  clearedLevels?: readonly string[] | null;
}

export class WorldProgressState {
  readonly visitedLevels = new Set<string>();
  readonly clearedLevels = new Set<string>();
  readonly collectedItems = new Set<string>();
  readonly collectedRelics = new Set<string>();
  readonly unlockedEvents = new Set<string>();

  replaceFromSave(saveData: WorldProgressSaveData): void {
    this.replaceSet(this.unlockedEvents, saveData.unlockedEvents);
    this.replaceSet(this.collectedRelics, saveData.collectedRelics);
    this.replaceSet(this.collectedItems, saveData.collectedItems);
    this.replaceSet(this.visitedLevels, saveData.visitedLevels);
    this.replaceSet(this.clearedLevels, saveData.clearedLevels);
  }

  private replaceSet(target: Set<string>, values: readonly string[] | null | undefined): void {
    target.clear();
    for (const value of values ?? []) target.add(value);
  }
}
