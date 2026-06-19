interface ItemWorldGameplaySimulationRuntimeDeps {
  updateUnavailableInput: () => void;
  isPlayerStandingOnContainer: () => boolean;
  forcePlayerGroundedOnContainer: () => void;
  updatePlayer: (dtMs: number) => void;
  updateLowHpHealHint: () => void;
  updateJumpTutorialHint: () => void;
  updateTutorialHint: (dtMs: number) => void;
  updateUpdraft: (dtMs: number) => void;
  updateDebugInput: () => void;
  updateEgoShardCast: (dtMs: number) => void;
  updateContainerCarry: (dtMs: number) => void;
  updateStaticEntities: (dtMs: number) => void;
  updateMemoryTriggers: (dtMs: number) => void;
  updateDeath: () => boolean;
  updateEnemies: (dtMs: number) => void;
  updateResidents: (dtMs: number) => void;
  updateTrapdoor: (dtMs: number) => void;
  updateAnvils: (dtMs: number) => void;
  updateCellVisibility: () => void;
  updatePlayerAttack: () => void;
  processDefeatedEnemies: () => void;
  updateHealingPickups: (dtMs: number) => void;
  updateBreakableProps: (dtMs: number) => void;
  updateGoldPickups: (dtMs: number) => void;
  updateProjectiles: (dtMs: number) => void;
  updateEnemyContact: () => void;
  consumeBossDefeat: () => void;
  updateRoomProgression: () => void;
}

export class ItemWorldGameplaySimulationRuntime {
  constructor(private readonly deps: ItemWorldGameplaySimulationRuntimeDeps) {}

  update(dtMs: number): boolean {
    this.deps.updateUnavailableInput();

    if (this.deps.isPlayerStandingOnContainer()) {
      this.deps.forcePlayerGroundedOnContainer();
    }
    this.deps.updatePlayer(dtMs);

    this.deps.updateLowHpHealHint();
    this.deps.updateJumpTutorialHint();
    this.deps.updateTutorialHint(dtMs);
    this.deps.updateUpdraft(dtMs);
    this.deps.updateDebugInput();
    this.deps.updateEgoShardCast(dtMs);
    this.deps.updateContainerCarry(dtMs);
    this.deps.updateStaticEntities(dtMs);
    this.deps.updateMemoryTriggers(dtMs);

    if (this.deps.updateDeath()) {
      return true;
    }

    this.deps.updateEnemies(dtMs);
    this.deps.updateResidents(dtMs);
    this.deps.updateTrapdoor(dtMs);
    this.deps.updateAnvils(dtMs);
    this.deps.updateCellVisibility();
    this.deps.updatePlayerAttack();
    this.deps.processDefeatedEnemies();
    this.deps.updateHealingPickups(dtMs);
    this.deps.updateBreakableProps(dtMs);
    this.deps.updateGoldPickups(dtMs);
    this.deps.updateProjectiles(dtMs);
    this.deps.updateEnemyContact();
    this.deps.consumeBossDefeat();
    this.deps.updateRoomProgression();
    return false;
  }
}
