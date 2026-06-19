import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { PRNG } from '@utils/PRNG';
import {
  populateItemWorldFullMapRooms,
  type PopulatedItemWorldFullMapRoom,
} from './ItemWorldFullMapPopulationHelpers';
import { ItemWorldFullGridRuntime } from './ItemWorldFullGridRuntime';
import { ItemWorldBuildStateRuntime } from './ItemWorldBuildStateRuntime';
import { ItemWorldProceduralDecorRuntime } from './ItemWorldProceduralDecorRuntime';
import { ItemWorldFullMapAttachRuntime } from './ItemWorldFullMapAttachRuntime';
import { ItemWorldFullMapRoomApplyRuntime } from './ItemWorldFullMapRoomApplyRuntime';

export interface ItemWorldFullMapBuildRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getItemUid: () => number;
  getDebugGenerationSeedOffset: () => number;
  getCurrentStratumIndex: () => number;
  getTotalStrata: () => number;
  getTemplateCount: () => number;
  getThemeId: () => string;
  isProceduralDecoEnabled: () => boolean;
  hasRequiredTemplateRenderingState: () => boolean;
  pickTemplate: (cell: UnifiedRoomCell, rng: PRNG) => LdtkLevel | null;
  rebuildFullMapLayers: (depthRatio: number) => void;
  setFullGrid: (grid: number[][]) => void;
  getFullGrid: () => number[][];
  clearStaticEntities: () => void;
  persistRoomState: () => void;
  resetAndSpawnBreakableProps: () => void;
  log: (message: string) => void;
}

export interface ItemWorldFullMapBuildRuntimeOptions {
  roomWidthPx: number;
  roomHeightPx: number;
  visualBoundsBleedPx: number;
}

export class ItemWorldFullMapBuildRuntime {
  constructor(
    private readonly deps: ItemWorldFullMapBuildRuntimeDeps,
    private readonly buildStateRuntime: ItemWorldBuildStateRuntime,
    private readonly fullGridRuntime: ItemWorldFullGridRuntime,
    private readonly proceduralDecorRuntime: ItemWorldProceduralDecorRuntime,
    private readonly attachRuntime: ItemWorldFullMapAttachRuntime,
    private readonly roomApplyRuntime: ItemWorldFullMapRoomApplyRuntime,
  ) {}

  build(options: ItemWorldFullMapBuildRuntimeOptions): void {
    this.buildStateRuntime.resetForFullMapBuild();
    const totalStrata = this.deps.getTotalStrata();
    const currentStratumIndex = this.deps.getCurrentStratumIndex();
    const depthRatio = totalStrata > 1 ? currentStratumIndex / (totalStrata - 1) : 0;
    const unifiedGrid = this.deps.getUnifiedGrid();
    const totalCols = unifiedGrid.totalWidth;
    const totalRows = unifiedGrid.totalHeight;
    this.deps.rebuildFullMapLayers(depthRatio);
    this.deps.log(
      `[ItemWorld] buildFullMap UNIFIED totalGrid=${totalCols}x${totalRows} `
      + `strata=${unifiedGrid.strataOffsets.length} templates=${this.deps.getTemplateCount()}`,
    );

    this.deps.setFullGrid(this.fullGridRuntime.createInitialGrid(totalCols, totalRows));
    this.deps.clearStaticEntities();
    this.populateRooms(unifiedGrid);
    this.generateProceduralDecor(currentStratumIndex, depthRatio);
    this.attachBuiltMap(totalCols, totalRows, options);
    this.finalizeBuild();
  }

  private populateRooms(unifiedGrid: UnifiedGridData): void {
    const canPopulateTemplates = this.deps.hasRequiredTemplateRenderingState();
    populateItemWorldFullMapRooms({
      unifiedGrid,
      itemUid: this.deps.getItemUid() + this.deps.getDebugGenerationSeedOffset(),
      pickTemplate: (cell, rng) => this.deps.pickTemplate(cell, rng),
      shouldSkipTemplate: () => !canPopulateTemplates,
      onRoom: (room: PopulatedItemWorldFullMapRoom) => this.roomApplyRuntime.apply(room),
    });
  }

  private generateProceduralDecor(currentStratumIndex: number, depthRatio: number): void {
    this.proceduralDecorRuntime.generate({
      enabled: this.deps.isProceduralDecoEnabled(),
      fullGrid: this.deps.getFullGrid(),
      themeId: this.deps.getThemeId(),
      itemUid: this.deps.getItemUid(),
      currentStratumIndex,
      depthRatio,
    });
  }

  private attachBuiltMap(
    totalCols: number,
    totalRows: number,
    options: ItemWorldFullMapBuildRuntimeOptions,
  ): void {
    this.attachRuntime.attachBuiltFullMap({
      fullGrid: this.deps.getFullGrid(),
      totalCols,
      totalRows,
      roomWidthPx: options.roomWidthPx,
      roomHeightPx: options.roomHeightPx,
      visualBoundsBleedPx: options.visualBoundsBleedPx,
    });
  }

  private finalizeBuild(): void {
    this.deps.persistRoomState();
    this.deps.resetAndSpawnBreakableProps();
  }
}
