import type { UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { isExcludedItemWorldRandomTemplate } from '@level/ItemWorldTemplatePool';
import {
  footprintForItemWorldTemplate,
  itemWorldExitMatchScore,
  sameItemWorldExitSet,
} from '@level/ItemWorldTemplateCatalog';
import { isEntryCorridorTemplateIdentifier } from './ItemWorldEntryCorridorLayout';

interface ItemWorldTemplateFallbackDeps {
  getStartRoom: () => { col: number; absoluteRow: number };
  isStratumEndRoom: (col: number, absRow: number) => boolean;
}

interface ItemWorldTemplateFallbackRng {
  next(): number;
  nextInt(min: number, max: number): number;
}

export function selectItemWorldTemplateFallback(
  cell: UnifiedRoomCell,
  templates: LdtkLevel[],
  required: readonly string[],
  rng: ItemWorldTemplateFallbackRng,
  deps: ItemWorldTemplateFallbackDeps,
): LdtkLevel | null {
  const requiredExitsText = required.length > 0 ? required.join('') : 'none';
  const pool = templates.filter(template =>
    !isExcludedItemWorldRandomTemplate(template) &&
    !/^memory_/i.test(template.identifier) &&
    template.roomType !== 'Cinematic' &&
    !isEntryCorridorTemplateIdentifier(template.identifier)
  );

  let desiredType = getDesiredRoomType(cell, rng, deps);
  const footprintPool = pool.filter(template => matchesFootprint(template, cell));
  if (footprintPool.length === 0) {
    const desired = cell.footprint ?? { w: 1, h: 1 };
    console.warn(
      `[ItemWorld] no footprint-matching LDtk template for footprint=${desired.w}x${desired.h} `
      + `type=${desiredType} exits=${requiredExitsText} at (${cell.col},${cell.absoluteRow}); skipping room.`,
    );
    return null;
  }

  const typedPool = footprintPool;
  let exactByType = typedPool.filter(template =>
    template.roomType === desiredType && sameItemWorldExitSet(template.exits, required));
  if ((desiredType === 'Treasure' || desiredType === 'Puzzle') && exactByType.length === 0) {
    desiredType = 'Combat';
    exactByType = typedPool.filter(template =>
      template.roomType === desiredType && sameItemWorldExitSet(template.exits, required));
  }
  if (exactByType.length > 0) {
    return exactByType[rng.nextInt(0, exactByType.length - 1)];
  }

  const exactAnyType = typedPool.filter(template => sameItemWorldExitSet(template.exits, required));
  if (exactAnyType.length > 0) {
    console.warn(
      `[ItemWorld] no exact LDtk template for type=${desiredType} exits=${requiredExitsText} `
      + `at (${cell.col},${cell.absoluteRow}); using another room type.`,
    );
    return exactAnyType[rng.nextInt(0, exactAnyType.length - 1)];
  }

  if (desiredType === 'Boss') {
    const roleTemplates = typedPool.filter(template => template.roomType === desiredType);
    if (roleTemplates.length > 0) {
      const rankedRoleTemplates = [...roleTemplates].sort((a, b) =>
        itemWorldExitMatchScore(b.exits, required) - itemWorldExitMatchScore(a.exits, required),
      );
      const fallback = rankedRoleTemplates[0];
      if (!fallback) return null;
      const fallbackExitsText = fallback.exits.length > 0 ? fallback.exits.join('') : 'none';
      console.warn(
        `[ItemWorld] no exact LDtk template for required role=${desiredType} exits=${requiredExitsText} `
        + `at (${cell.col},${cell.absoluteRow}); using ${fallback.identifier} exits=${fallbackExitsText}.`,
      );
      return fallback;
    }
  }

  console.warn(
    `[ItemWorld] Missing LDtk ItemStratum template exits=${requiredExitsText} `
    + `type=${desiredType} at (${cell.col},${cell.absoluteRow}); `
    + `skipping room to preserve graph/template exit integrity.`,
  );
  return null;
}

function getDesiredRoomType(
  cell: UnifiedRoomCell,
  rng: { next(): number },
  deps: ItemWorldTemplateFallbackDeps,
): string {
  const startRoom = deps.getStartRoom();
  const isStart = cell.col === startRoom.col && cell.absoluteRow === startRoom.absoluteRow;
  if (isStart) return 'Start';
  if (deps.isStratumEndRoom(cell.col, cell.absoluteRow)) return 'Boss';
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

function matchesFootprint(template: LdtkLevel, cell: UnifiedRoomCell): boolean {
  const desired = cell.footprint;
  if (!desired) return true;
  const actual = footprintForItemWorldTemplate(template);
  return desired.w === actual.w && desired.h === actual.h;
}
