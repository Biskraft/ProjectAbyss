export const CONTAINER_SOLID_TILES = new Set<number>([1, 3, 7, 9, 12, 15]);
export const CONTAINER_FLUID_TILES = new Set<number>([2, 6, 8, 11, 13, 20]);

export const getGridTile = (grid: number[][], gx: number, gy: number): number => grid[gy]?.[gx] ?? 0;

export const isContainerSolidTile = (tile: number): boolean => CONTAINER_SOLID_TILES.has(tile);

export const isContainerFluidTile = (tile: number): boolean => CONTAINER_FLUID_TILES.has(tile);

export const isContainerSolidCell = (
  grid: number[][],
  container: { isWoodFamily: () => boolean },
  gx: number,
  gy: number,
): boolean => {
  const tile = getGridTile(grid, gx, gy);
  if (isContainerSolidTile(tile)) return true;
  return container.isWoodFamily() && isContainerFluidTile(tile);
};

export const isContainerFluidCell = (grid: number[][], gx: number, gy: number): boolean =>
  isContainerFluidTile(getGridTile(grid, gx, gy));
