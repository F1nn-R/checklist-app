/** Returns a copy of `list` with the item at `from` moved to index `to` (both clamped to the list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/** A row's measured position in the list (viewport px). */
export interface RowBox { top: number; height: number }

/**
 * Index the row at `from` lands on after being dragged `dy` px: it passes another row once its
 * leading edge (bottom going down, top going up) crosses that row's middle. Rows may differ in height.
 */
export function dropTarget(from: number, dy: number, rows: readonly RowBox[]): number {
  const r = rows[from];
  if (!r) return from;
  const top = r.top + dy, bottom = top + r.height;
  const mid = (j: number) => rows[j].top + rows[j].height / 2;
  let to = from;
  for (let j = from + 1; j < rows.length && bottom > mid(j); j++) to = j;
  for (let j = from - 1; j >= 0 && top < mid(j); j--) to = j;
  return to;
}

/**
 * `full` with the items of `subset` (a reordered selection of it, matched by id) put back into
 * the positions that selection occupied. Items not in `subset` keep their places.
 */
export function placeSubset<T extends { id: string }>(full: readonly T[], subset: readonly T[]): T[] {
  const ids = new Set(subset.map((t) => t.id));
  let k = 0;
  return full.map((t) => (ids.has(t.id) ? subset[k++] : t));
}
