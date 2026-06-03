export class WorldDoorAttackState {
  private readonly rejectedDoorIids = new Set<string>();
  private lastComboIndex = -1;

  resetWhenAttackEnds(isAttackActive: boolean): boolean {
    if (isAttackActive) return false;
    if (this.rejectedDoorIids.size > 0) {
      this.rejectedDoorIids.clear();
      this.lastComboIndex = -1;
    }
    return true;
  }

  prepareCombo(comboIndex: number): void {
    if (comboIndex === this.lastComboIndex) return;
    this.rejectedDoorIids.clear();
    this.lastComboIndex = comboIndex;
  }

  hasRejected(doorIid: string): boolean {
    return this.rejectedDoorIids.has(doorIid);
  }

  markRejected(doorIid: string): void {
    this.rejectedDoorIids.add(doorIid);
  }
}
