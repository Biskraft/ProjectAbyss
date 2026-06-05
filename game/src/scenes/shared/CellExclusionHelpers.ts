export function addCellExclusionRadius(
  exclude: Set<string>,
  centerCol: number,
  centerRow: number,
  radius: number,
): void {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      exclude.add(`${centerCol + dc},${centerRow + dr}`);
    }
  }
}
