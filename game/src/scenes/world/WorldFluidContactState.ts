export class WorldFluidContactState {
  private playerInOtherFluid = false;
  private readonly enemiesInOtherFluid: boolean[] = [];

  updatePlayerOtherFluid(inOtherFluid: boolean): boolean {
    if (inOtherFluid === this.playerInOtherFluid) return false;
    this.playerInOtherFluid = inOtherFluid;
    return true;
  }

  updateEnemyOtherFluid(index: number, inOtherFluid: boolean): boolean {
    const previous = this.enemiesInOtherFluid[index] ?? false;
    if (inOtherFluid === previous) return false;
    this.enemiesInOtherFluid[index] = inOtherFluid;
    return true;
  }
}
