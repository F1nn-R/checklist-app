import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { dropTarget, type RowBox } from '../logic/reorder';

/** Active drag: which row, where the finger started, how far it moved, and the measured rows. */
interface Drag { from: number; startY: number; dy: number; rows: RowBox[]; gap: number }

const HOLD_MS = 350; // how long to hold a row before it lifts
const HOLD_SLOP = 8; // px the finger may wander during the hold before it counts as a scroll

/**
 * Drag-to-reorder for a vertical list. Put `listRef` on the container and `data-drag-item`
 * on each row. Either spread `handleProps(i, label)` onto a <DragHandle> (drag starts at once),
 * or spread `holdProps(i)` onto the row itself (drag starts after holding still, so normal
 * scrolling and taps still work). `onMove(from, to)` runs on drop.
 */
export function useDragReorder(count: number, onMove: (from: number, to: number) => void, onStart?: () => void) {
  const listRef = useRef<HTMLDivElement>(null);
  // State drives rendering; the ref holds the live value so fast pointer events never see a stale drag.
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  const target = drag ? dropTarget(drag.from, drag.dy, drag.rows) : -1;

  // Hold-to-drag bookkeeping.
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const cancelHold = () => { if (hold.current) { clearTimeout(hold.current.timer); hold.current = null; } };
  useEffect(() => cancelHold, []);

  // While a row is lifted, stop the page from scrolling under the finger (needs a non-passive listener).
  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return;
    const stop = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('touchmove', stop, { passive: false });
    return () => document.removeEventListener('touchmove', stop);
  }, [dragging]);

  const lift = (index: number, startY: number) => {
    onStart?.();
    const els = listRef.current?.querySelectorAll<HTMLElement>('[data-drag-item]');
    const rows = [...(els ?? [])].map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; });
    const gap = rows.length > 1 ? Math.max(0, rows[1].top - rows[0].top - rows[0].height) : 0;
    setDrag({ from: index, startY, dy: 0, rows, gap });
    navigator.vibrate?.(8);
  };
  const move = (y: number) => {
    const d = dragRef.current;
    if (d) setDrag({ ...d, dy: y - d.startY });
  };
  const drop = (y: number) => {
    const d = dragRef.current;
    if (!d) return;
    setDrag(null);
    const to = dropTarget(d.from, y - d.startY, d.rows);
    if (to !== d.from) onMove(d.from, to);
  };

  const handleProps = (index: number, label: string) => ({
    'aria-label': `Reorder ${label} (drag, or use arrow keys)`,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault(); // no text selection / scrolling while dragging
      e.currentTarget.focus(); // preventDefault skips focus; keep it so arrow keys work after a tap
      e.currentTarget.setPointerCapture(e.pointerId);
      lift(index, e.clientY);
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => move(e.clientY),
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => drop(e.clientY),
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!d || index + d < 0 || index + d >= count) return;
      e.preventDefault();
      onMove(index, index + d);
    },
  });

  const holdProps = (index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      suppressClick.current = false;
      if (e.button !== 0 || count < 2) return;
      cancelHold();
      const el = e.currentTarget;
      const { pointerId, clientX: x, clientY: y } = e;
      hold.current = {
        x, y,
        timer: window.setTimeout(() => {
          hold.current = null;
          try { el.setPointerCapture(pointerId); } catch { /* pointer already gone */ }
          suppressClick.current = true; // releasing after a hold must not open or tick the task
          lift(index, y);
        }, HOLD_MS),
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const h = hold.current;
      if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP) cancelHold(); // it's a scroll
      move(e.clientY);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => { cancelHold(); drop(e.clientY); },
    onPointerCancel: () => { cancelHold(); setDrag(null); },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(), // long-press menu on phones
  });

  /** Lifted row follows the finger; rows between start and target slide over to make room. */
  const itemStyle = (i: number): CSSProperties => {
    if (!drag) return {};
    const shift = (drag.rows[drag.from]?.height ?? 0) + drag.gap;
    let y = 0;
    if (i === drag.from) y = drag.dy;
    else if (drag.from < target && i > drag.from && i <= target) y = -shift;
    else if (target < drag.from && i >= target && i < drag.from) y = shift;
    return { transform: `translateY(${y}px)` };
  };

  return { listRef, dragging, isLifted: (i: number) => drag?.from === i, handleProps, holdProps, itemStyle };
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
