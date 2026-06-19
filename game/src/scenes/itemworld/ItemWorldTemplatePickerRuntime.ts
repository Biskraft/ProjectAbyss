import type { UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { ExitDir } from '@level/ItemWorldTemplates';
import { sameItemWorldExitSet } from '@level/ItemWorldTemplateCatalog';
import { selectItemWorldTemplateFallback } from './ItemWorldTemplateFallbackSelector';

interface ItemWorldTemplatePickerRuntimeDeps {
  getTemplates: () => LdtkLevel[];
  getMemoryRoomPlacements: () => Map<string, LdtkLevel>;
  getStartRoom: () => { col: number; absoluteRow: number };
  isStratumEndRoom: (col: number, absRow: number) => boolean;
}

export class ItemWorldTemplatePickerRuntime {
  constructor(private readonly deps: ItemWorldTemplatePickerRuntimeDeps) {}

  pick(cell: UnifiedRoomCell | null, rng: { next(): number; nextInt(min: number, max: number): number }): LdtkLevel | null {
    const templates = this.deps.getTemplates();
    if (templates.length === 0 || !cell) return null;

    if (cell.isFiller) return this.pickFiller(templates);

    const required = this.getRequiredExits(cell);
    const memoryOverride = this.pickMemoryOverride(cell, required);
    if (memoryOverride) return memoryOverride;

    const assigned = this.pickAssignedTemplate(cell, templates);
    if (assigned) return assigned;

    return this.pickFallback(cell, templates, required, rng);
  }

  private pickFiller(templates: LdtkLevel[]): LdtkLevel | null {
    return templates.find(template => template.identifier === 'ItemStratum_Filler_01') ?? null;
  }

  private pickMemoryOverride(cell: UnifiedRoomCell, required: ExitDir[]): LdtkLevel | null {
    const placed = this.deps.getMemoryRoomPlacements().get(`${cell.col}:${cell.absoluteRow}`);
    if (!placed) return null;
    if (placed.identifier.startsWith('ItemStratum_Prologue_')) return placed;
    if (sameItemWorldExitSet(placed.exits, required)) return placed;
    const requiredExitsText = required.length > 0 ? required.join('') : 'none';
    const placedExitsText = placed.exits.length > 0 ? placed.exits.join('') : 'none';
    console.warn(
      `[ItemWorld] memory room ${placed.identifier} exits=${placedExitsText} `
      + `does not match cell exits=${requiredExitsText} at (${cell.col},${cell.absoluteRow}); using normal template.`,
    );
    return null;
  }

  private pickAssignedTemplate(cell: UnifiedRoomCell, templates: LdtkLevel[]): LdtkLevel | null {
    if (!cell.templateId) return null;
    const assigned = templates.find(template => template.identifier === cell.templateId) ?? null;
    if (assigned) return assigned;
    console.warn(`[ItemWorld] assigned LDtk template not found: ${cell.templateId} at (${cell.col},${cell.absoluteRow})`);
    return null;
  }

  private pickFallback(
    cell: UnifiedRoomCell,
    templates: LdtkLevel[],
    required: ExitDir[],
    rng: { next(): number; nextInt(min: number, max: number): number },
  ): LdtkLevel | null {
    return selectItemWorldTemplateFallback(cell, templates, required, rng, {
      getStartRoom: this.deps.getStartRoom,
      isStratumEndRoom: this.deps.isStratumEndRoom,
    });
  }

  private getRequiredExits(cell: UnifiedRoomCell): ExitDir[] {
    const exits: ExitDir[] = [];
    if (cell.exits.left) exits.push('L');
    if (cell.exits.right) exits.push('R');
    if (cell.exits.up) exits.push('U');
    if (cell.exits.down) exits.push('D');
    return exits;
  }

}
