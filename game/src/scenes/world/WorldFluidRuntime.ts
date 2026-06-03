import type { Container } from 'pixi.js';
import { FluidSystem } from '@effects/FluidSystem';
import { FluidResidueManager } from '@effects/FluidResidue';
import { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import { FluidSpawnerManager, readFluidSpawnerEntities } from '@systems/FluidSpawner';
import type { LdtkLevel } from '@level/LdtkLoader';

interface FluidLayerOptions {
  fluidLayer: Container;
  entityLayer: Container;
  debug: boolean;
  reduceMotion: boolean;
}

export class WorldFluidRuntime {
  private fluidSystem: FluidSystem | null = null;
  private fluidSpawners: FluidSpawnerManager | null = null;
  private fluidCrestFoam: FluidCrestFoamManager | null = null;
  private fluidResidue: FluidResidueManager | null = null;

  get system(): FluidSystem {
    if (!this.fluidSystem) throw new Error('WorldFluidRuntime.system used before initializeFluidLayer()');
    return this.fluidSystem;
  }

  get spawners(): FluidSpawnerManager {
    if (!this.fluidSpawners) throw new Error('WorldFluidRuntime.spawners used before initializeFluidLayer()');
    return this.fluidSpawners;
  }

  get crestFoam(): FluidCrestFoamManager {
    if (!this.fluidCrestFoam) throw new Error('WorldFluidRuntime.crestFoam used before initializeFluidLayer()');
    return this.fluidCrestFoam;
  }

  get residue(): FluidResidueManager {
    if (!this.fluidResidue) throw new Error('WorldFluidRuntime.residue used before initializeResidue()');
    return this.fluidResidue;
  }

  initializeFluidLayer(options: FluidLayerOptions): void {
    this.fluidSystem = new FluidSystem(options.fluidLayer);
    this.fluidSpawners = new FluidSpawnerManager(
      options.fluidLayer,
      options.debug ? options.entityLayer : null,
    );
    this.fluidCrestFoam = new FluidCrestFoamManager(options.fluidLayer, options.reduceMotion);
  }

  initializeResidue(entityLayer: Container): void {
    this.fluidResidue = new FluidResidueManager(entityLayer);
  }

  clearSpawnersAndFoam(): void {
    this.fluidSpawners?.clear();
    this.fluidCrestFoam?.clear();
  }

  clearResidue(): void {
    this.fluidResidue?.clear();
  }

  attachLevel(level: LdtkLevel): void {
    this.system.attach(level);
    this.clearSpawnersAndFoam();
    for (const entity of level.entities) {
      if (entity.type !== 'FluidSpawner') continue;
      for (const options of readFluidSpawnerEntities(entity)) this.spawners.add(options);
    }
  }

  releaseWorldVisualsForItemWorld(): void {
    this.fluidSystem?.detach();
    this.clearSpawnersAndFoam();
    this.clearResidue();
  }
}
