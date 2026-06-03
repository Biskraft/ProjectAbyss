import type { GiantBuilder } from '@entities/GiantBuilder';
import type { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { TileMutator } from '@systems/TileMutator';

export class WorldBuilderGrassRuntime {
  register(builder: GiantBuilder, grassClumpFire: GrassClumpFireSystem, tileMutator: TileMutator): void {
    const registered = grassClumpFire.registerWithCellResolver(
      builder.decorator.getGrassClumpsWithCells(),
      (clump) => {
        const bx = Math.round(builder.container.x / 16);
        const by = Math.round(builder.container.y / 16);
        return { gx: bx + clump.gx, gy: by + clump.gy };
      },
    );
    for (const prop of registered) tileMutator.registerBurnable(prop);
  }
}
