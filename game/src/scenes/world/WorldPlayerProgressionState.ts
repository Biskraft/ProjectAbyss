interface WorldPlayerProgressionSaveData {
  gold?: number | null;
  healthShardBonus?: number | null;
}

export class WorldPlayerProgressionState {
  gold = 0;
  healthShardBonus = 0;

  replaceFromSave(saveData: WorldPlayerProgressionSaveData): void {
    this.gold = saveData.gold ?? 0;
    this.healthShardBonus = saveData.healthShardBonus ?? 0;
  }

  setHealthShardBonus(value: number): void {
    this.healthShardBonus = value;
  }

  addGold(amount: number): void {
    this.gold += amount;
  }

  addHealthShardBonus(amount: number): void {
    this.healthShardBonus += amount;
  }
}
