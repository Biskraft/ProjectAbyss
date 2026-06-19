import type { LdtkLevel } from '@level/LdtkLoader';

export const ITEM_WORLD_SLOT_TILES = 16;

export interface ItemWorldTemplateFootprint {
  w: number;
  h: number;
}

export interface ItemWorldTemplateSocketAnchors {
  leftY: number;
  rightY: number;
  upX: number;
  downX: number;
}

export interface ItemWorldTemplateCatalogEntry {
  template: LdtkLevel;
  footprint: ItemWorldTemplateFootprint;
  socketAnchors: ItemWorldTemplateSocketAnchors;
}

export interface ItemWorldTemplateCatalog {
  entries: ItemWorldTemplateCatalogEntry[];
}

export function createItemWorldTemplateCatalog(templates: readonly LdtkLevel[]): ItemWorldTemplateCatalog {
  return {
    entries: templates
      .filter(isAssignableItemWorldTemplate)
      .map(template => ({
        template,
        footprint: footprintForItemWorldTemplate(template),
        socketAnchors: socketAnchorsForItemWorldTemplate(template),
      })),
  };
}

export function isAssignableItemWorldTemplate(template: LdtkLevel): boolean {
  const id = template.identifier.toLowerCase();
  if (!id.startsWith('itemstratum_')) return false;
  if (id.includes('prologue') || id.includes('filler') || id.includes('debug') || id.includes('test')) return false;
  if (/^memory_/i.test(template.identifier)) return false;
  if (template.roomType === 'Cinematic' || template.roomType === 'Debug') return false;
  return template.gridW % ITEM_WORLD_SLOT_TILES === 0 && template.gridH % ITEM_WORLD_SLOT_TILES === 0;
}

export function footprintForItemWorldTemplate(template: LdtkLevel): ItemWorldTemplateFootprint {
  return {
    w: Math.max(1, Math.ceil(template.gridW / ITEM_WORLD_SLOT_TILES)),
    h: Math.max(1, Math.ceil(template.gridH / ITEM_WORLD_SLOT_TILES)),
  };
}

export function socketAnchorsForItemWorldTemplate(template: LdtkLevel): ItemWorldTemplateSocketAnchors {
  const grid = template.collisionGrid;
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  return {
    leftY: edgeOpeningCenter(grid.map(row => row[0]), h * 0.5),
    rightY: edgeOpeningCenter(grid.map(row => row[Math.max(0, w - 1)]), h * 0.5),
    upX: edgeOpeningCenter(grid[0] ?? [], w * 0.5),
    downX: edgeOpeningCenter(grid[Math.max(0, h - 1)] ?? [], w * 0.5),
  };
}

export function sameItemWorldExitSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every(dir => bSet.has(dir));
}

export function itemWorldExitMatchScore(candidate: readonly string[], required: readonly string[]): number {
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

function edgeOpeningCenter(values: number[], fallback: number): number {
  let bestStart = -1;
  let bestEnd = -1;
  let start = -1;
  for (let i = 0; i <= values.length; i++) {
    const open = i < values.length && values[i] !== 1;
    if (open && start < 0) start = i;
    if ((!open || i === values.length) && start >= 0) {
      const end = i - 1;
      if ((end - start) > (bestEnd - bestStart)) {
        bestStart = start;
        bestEnd = end;
      }
      start = -1;
    }
  }
  return bestStart >= 0 ? (bestStart + bestEnd + 1) * 0.5 : fallback;
}
