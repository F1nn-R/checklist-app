/** Returns a copy of `list` with the item at `from` moved to index `to` (both clamped to the list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/** Index an item dragged `dy` px from `from` lands on, given the distance between rows. */
export function dropIndex(from: number, dy: number, pitch: number, count: number): number {
  if (pitch <= 0 || count <= 0) return from;
  return Math.max(0, Math.min(count - 1, from + Math.round(dy / pitch)));
}
