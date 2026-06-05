import type { Container, Filter } from 'pixi.js';

export function appendFilterIfMissing(target: Container, filter: Filter): void {
  const current = (target.filters as Filter[] | null) ?? [];
  if (!current.includes(filter)) target.filters = [...current, filter];
}

export function removeFilterAndClearIfEmpty(target: Container, filter: Filter): void {
  const current = target.filters as Filter[] | null;
  if (!current) return;
  const next = current.filter(existing => existing !== filter);
  target.filters = next.length > 0 ? next : null;
}
