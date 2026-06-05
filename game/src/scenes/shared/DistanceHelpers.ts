export function getDistanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function getDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(getDistanceSquared(ax, ay, bx, by));
}
