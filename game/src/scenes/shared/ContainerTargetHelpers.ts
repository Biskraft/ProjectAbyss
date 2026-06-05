import type { Container } from 'pixi.js';

export function compactContainers(targets: Array<Container | null | undefined>): Container[] {
  return targets.filter((target): target is Container => !!target);
}
