import { resolveContainerSlotKind } from '@data/ContainerPools';
import { parseContainerKind, type ContainerKind } from '@entities/ThrowableContainer';

export function resolveRuntimeContainerKind(
  rawKind: unknown,
  temperament: string | undefined | null,
): ContainerKind | null {
  const direct = parseContainerKind(rawKind);
  if (direct) return direct;

  const slot = typeof rawKind === 'string' ? rawKind.toLowerCase() : '';
  if (slot === 'generic_a' || slot === 'generic_b' || slot === 'generic_c') {
    return resolveContainerSlotKind(slot, temperament ?? null);
  }
  return null;
}
