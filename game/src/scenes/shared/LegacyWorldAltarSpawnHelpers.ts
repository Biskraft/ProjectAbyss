export interface LegacyWorldAltarSpawnCandidate {
  x: number;
  y: number;
}

export function getLegacyWorldAltarSpawnCandidate({
  existingAltarCount,
  roomWidth,
  roomHeight,
  tileSize,
  random = Math.random,
}: {
  existingAltarCount: number;
  roomWidth: number;
  roomHeight: number;
  tileSize: number;
  random?: () => number;
}): LegacyWorldAltarSpawnCandidate | null {
  if (existingAltarCount >= 2) return null;
  if (random() > 0.3) return null;

  const floorY = (roomHeight - 3) * tileSize;
  const x = (roomWidth / 2) * tileSize + (random() - 0.5) * 6 * tileSize;
  return { x, y: floorY };
}
