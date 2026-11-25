import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { dropIndex } from '../logic/reorder';

/** Active drag: which row, where the finger started, how far it moved, and the row spacing. */
interface Drag { from: number; startY: number; dy: number; pitch: number }

/**
 * Hold-and-drag reordering for a vertical list. Put `listRef` on the container and
 * `data-drag-item` on each row; spread `handleProps(i, label)` onto a <DragHandle>.
 * `onMove(from, to)` runs on drop (or arrow key on the handle).
 */
export function useDragReorder(count: number, onMove: (from: number, to: number) => void, onStart?: () => void) {
  const listRef = useRef<HTMLDivElement>(null);
  // State drives rendering; the ref holds the live value so fast pointer events never see a stale drag.
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  const target = drag ? dropIndex(drag.from, drag.dy, drag.pitch, count) : -1;

  const handleProps = (index: number, label: string) => ({
    'aria-label': `Reorder ${label} (drag, or use arrow keys)`,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault(); // no text selection / scrolling while dragging
      e.currentTarget.focus(); // preventDefault skips focus; keep it so arrow keys work after a tap
      e.currentTarget.setPointerCapture(e.pointerId);
      onStart?.();
      const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-drag-item]');
      const a = rows?.[0]?.getBoundingClientRect();
      const b = rows?.[1]?.getBoundingClientRect();
      const pitch = a && b ? b.top - a.top : (a?.height ?? 56);
      setDrag({ from: index, startY: e.clientY, dy: 0, pitch });
      navigator.vibrate?.(8);
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (d) setDrag({ ...d, dy: e.clientY - d.startY });
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setDrag(null);
      const to = dropIndex(d.from, e.clientY - d.startY, d.pitch, count);
      if (to !== d.from) onMove(d.from, to);
    },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!d || index + d < 0 || index + d >= count) return;
      e.preventDefault();
      onMove(index, index + d);
    },
  });

  /** Lifted row follows the finger; rows between start and target slide one place to make room. */
  const itemStyle = (i: number): CSSProperties => {
    if (!drag) return {};
    let y = 0;
    if (i === drag.from) y = drag.dy;
    else if (drag.from < target && i > drag.from && i <= target) y = -drag.pitch;
    else if (target < drag.from && i >= target && i < drag.from) y = drag.pitch;
    return { transform: `translateY(${y}px)` };
  };

  return { listRef, dragging: !!drag, isLifted: (i: number) => drag?.from === i, handleProps, itemStyle };
}

export function DragHandle(props: ReturnType<ReturnType<typeof useDragReorder>['handleProps']>) {
  return (
    <button type="button" className="drag-handle" {...props}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" />))}
      </svg>
    </button>
  );
}
