export class ItemWorldRunStats {
  earnedExp = 0;
  earnedGold = 0;
  baselineGold = 0;
  roomsCleared = 0;
  totalRooms = 0;

  get displayGold(): number {
    return this.baselineGold + this.earnedGold;
  }

  setBaselineGold(amount: number): void {
    this.baselineGold = Math.max(0, amount);
  }

  addEarnedExp(amount: number): void {
    this.earnedExp += amount;
  }

  applyExpPenalty(ratio: number): void {
    const penalty = Math.floor(this.earnedExp * ratio);
    this.earnedExp = Math.max(0, this.earnedExp - penalty);
  }

  addEarnedGold(amount: number): void {
    this.earnedGold += amount;
  }

  incrementRoomsCleared(): void {
    this.roomsCleared++;
  }

  setRoomsCleared(amount: number): void {
    this.roomsCleared = Math.max(0, amount);
  }

  setTotalRooms(amount: number): void {
    this.totalRooms = Math.max(0, amount);
  }
}
