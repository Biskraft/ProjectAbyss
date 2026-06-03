import type { UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { ExitDir } from '@level/ItemWorldTemplates';
import { isEntryCorridorTemplateIdentifier } from './ItemWorldEntryCorridorLayout';

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

    const required = this.getRequiredExits(cell);
    const placed = this.deps.getMemoryRoomPlacements().get(`${cell.col}:${cell.absoluteRow}`);
    if (placed) {
      if (this.sameExitSet(placed.exits, required)) return placed;
      console.warn(
        `[ItemWorld] memory room ${placed.identifier} exits=${this.formatExits(placed.exits)} `
        + `does not match cell exits=${this.formatExits(required)} at (${cell.col},${cell.absoluteRow}); using normal template.`,
      );
    }

    const pool = templates.filter(template =>
      !/^memory_/i.test(template.identifier) &&
      template.roomType !== 'Cinematic' &&
      !isEntryCorridorTemplateIdentifier(template.identifier)
    );

    const desiredType = this.getDesiredRoomType(cell, rng);
    const exactByType = pool.filter(template =>
      template.roomType === desiredType && this.sameExitSet(template.exits, required));
    if (exactByType.length > 0) {
      return exactByType[rng.nextInt(0, exactByType.length - 1)];
    }

    if (desiredType === 'Boss') {
      const roleTemplates = pool.filter(template => template.roomType === desiredType);
      if (roleTemplates.length > 0) {
        const rankedRoleTemplates = [...roleTemplates].sort((a, b) =>
          this.exitMatchScore(b.exits, required) - this.exitMatchScore(a.exits, required),
        );
        const fallback = rankedRoleTemplates[0];
        console.warn(
          `[ItemWorld] no exact LDtk template for required role=${desiredType} exits=${this.formatExits(required)} `
          + `at (${cell.col},${cell.absoluteRow}); using ${fallback.identifier} exits=${this.formatExits(fallback.exits)}.`,
        );
        return fallback;
      }
    }

    const exactAnyType = pool.filter(template => this.sameExitSet(template.exits, required));
    if (exactAnyType.length > 0) {
      console.warn(
        `[ItemWorld] no exact LDtk template for type=${desiredType} exits=${this.formatExits(required)} `
        + `at (${cell.col},${cell.absoluteRow}); using another room type.`,
      );
      return exactAnyType[rng.nextInt(0, exactAnyType.length - 1)];
    }

    const fallbackPool = pool.length > 0 ? pool : templates;
    const ranked = [...fallbackPool].sort((a, b) =>
      this.exitMatchScore(b.exits, required) - this.exitMatchScore(a.exits, required),
    );
    const fallback = ranked[0] ?? null;
    if (!fallback) return null;

    console.warn(
      `[ItemWorld] Missing LDtk ItemStratum template exits=${this.formatExits(required)} `
      + `type=${desiredType} at (${cell.col},${cell.absoluteRow}); `
      + `fallback=${fallback.identifier} exits=${this.formatExits(fallback.exits)}. `
      + `Author this exit combination in LDtk to remove the fallback.`,
    );
    return fallback;
  }

  private getDesiredRoomType(cell: UnifiedRoomCell, rng: { next(): number }): string {
    const startRoom = this.deps.getStartRoom();
    const isStart = cell.col === startRoom.col && cell.absoluteRow === startRoom.absoluteRow;
    if (isStart) return 'Start';
    if (this.deps.isStratumEndRoom(cell.col, cell.absoluteRow)) return 'Boss';
    if (cell.role === 'hub') return 'Start';
    if (cell.role === 'shrine') return 'Rest';
    if (cell.kind === 'corridor') return 'Corridor';
    if (!cell.onCriticalPath) {
      const roll = rng.next();
      if (roll < 0.15) return 'Treasure';
      if (roll < 0.30) return 'Puzzle';
    }
    return 'Combat';
  }

  private getRequiredExits(cell: UnifiedRoomCell): ExitDir[] {
    const exits: ExitDir[] = [];
    if (cell.exits.left) exits.push('L');
    if (cell.exits.right) exits.push('R');
    if (cell.exits.up) exits.push('U');
    if (cell.exits.down) exits.push('D');
    return exits;
  }

  private sameExitSet(a: readonly ExitDir[], b: readonly ExitDir[]): boolean {
    if (a.length !== b.length) return false;
    const bSet = new Set(b);
    return a.every(dir => bSet.has(dir));
  }

  private exitMatchScore(candidate: readonly ExitDir[], required: readonly ExitDir[]): number {
    const candSet = new Set(candidate);
    const reqSet = new Set(required);
    let matches = 0;
    let extras = 0;
    let missing = 0;
    for (const dir of reqSet) {
      if (candSet.has(dir)) matches++;
      else missing++;
    }
    for (const dir of candSet) {
      if (!reqSet.has(dir)) extras++;
    }
    return matches * 10 - missing * 6 - extras * 2;
  }

  private formatExits(exits: readonly ExitDir[]): string {
    return exits.length > 0 ? exits.join('') : 'none';
  }
}
