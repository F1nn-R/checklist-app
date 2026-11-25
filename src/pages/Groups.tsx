import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Group } from '../db';
import { createGroup, useData } from '../data';
import { dropIndex, moveItem } from '../logic/reorder';
import { BackBar, ConfirmButton } from '../components/ui';

function GroupName({ g }: { g: Group }) {
  const [v, setV] = useState(g.name);
  const commit = () => {
    const n = v.trim();
    if (n && n !== g.name) db.groups.update(g.id, { name: n });
    else setV(g.name);
  };
  return (
    <input className="name input-bare" value={v} aria-label="Group name" onChange={(e) => setV(e.target.value)}
      onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
  );
}

const GripIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" />))}
  </svg>
);

/** Active drag: which row, where it started, how far the finger has moved, and the row spacing. */
interface Drag { id: string; from: number; startY: number; dy: number; pitch: number }

export default function Groups() {
  const data = useData();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Order shown right after a drop, until the database catches up (avoids a flicker back).
  const [pending, setPending] = useState<string[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const byId = new Map(data.groups.map((g) => [g.id, g]));
  const groups = pending ? pending.map((id) => byId.get(id)).filter((g): g is Group => !!g) : data.groups;

  useEffect(() => {
    if (pending && data.groups.map((g) => g.id).join() === pending.join()) setPending(null);
  }, [data.groups, pending]);

  const saveOrder = async (list: Group[]) => {
    setPending(list.map((g) => g.id));
    await db.transaction('rw', db.groups, async () => {
      await Promise.all(list.map((g, i) => db.groups.update(g.id, { order: i })));
    });
  };

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setName('');
    await createGroup(n, groups);
  };
  const remove = async (g: Group) => {
    await db.transaction('rw', db.groups, db.tasks, async () => {
      await db.tasks.where('groupId').equals(g.id).modify({ groupId: null });
      await db.groups.delete(g.id);
    });
    setEditing(null);
  };

  // ---- Drag to reorder (pointer events: works for touch and mouse) ----
  const startDrag = (e: PointerEvent<HTMLButtonElement>, g: Group, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault(); // no text selection / scrolling while dragging
    e.currentTarget.focus(); // preventDefault skips focus; keep it so arrow keys work after a tap
    e.currentTarget.setPointerCapture(e.pointerId);
    setEditing(null);
    const rows = listRef.current?.querySelectorAll<HTMLElement>('.group-item');
    const first = rows?.[0]?.getBoundingClientRect();
    const second = rows?.[1]?.getBoundingClientRect();
    const pitch = first && second ? second.top - first.top : (first?.height ?? 60) + 10;
    setDrag({ id: g.id, from: index, startY: e.clientY, dy: 0, pitch });
    navigator.vibrate?.(8);
  };
  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag) setDrag({ ...drag, dy: e.clientY - drag.startY });
  };
  const endDrag = () => {
    if (!drag) return;
    const to = dropIndex(drag.from, drag.dy, drag.pitch, groups.length);
    setDrag(null);
    if (to !== drag.from) saveOrder(moveItem(groups, drag.from, to));
  };
  // Keyboard fallback on the handle: arrow keys move one place.
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!d || index + d < 0 || index + d >= groups.length) return;
    e.preventDefault();
    saveOrder(moveItem(groups, index, index + d));
  };

  const target = drag ? dropIndex(drag.from, drag.dy, drag.pitch, groups.length) : -1;
  const shiftFor = (i: number): number => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < target && i > drag.from && i <= target) return -drag.pitch;
    if (target < drag.from && i >= target && i < drag.from) return drag.pitch;
    return 0;
  };

  return (
    <div className="page no-nav">
      <BackBar title="Groups" />

      <div ref={listRef} className={`group-list ${drag ? 'dragging' : ''}`}>
        {groups.map((g, i) => {
          const count = data.tasks.filter((t) => t.groupId === g.id && !t.parentId && !t.archived).length;
          const open = editing === g.id;
          const isDragged = drag?.id === g.id;
          return (
            <div key={g.id} className={`group-item glass ${isDragged ? 'lifted' : ''}`}
              style={{ transform: `translateY(${isDragged ? drag.dy : shiftFor(i)}px)` }}>
              <div className="item">
                <button type="button" className="drag-handle" aria-label={`Reorder ${g.name} (drag, or use arrow keys)`}
                  onPointerDown={(e) => startDrag(e, g, i)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
                  onKeyDown={(e) => onHandleKey(e, i)}>
                  <GripIcon />
                </button>
                <GroupName g={g} />
                <span className="count-badge" aria-label={`${count} ${count === 1 ? 'task' : 'tasks'}`}>{count}</span>
                <button className="icon-btn" aria-label="Group options" aria-expanded={open} onClick={() => setEditing(open ? null : g.id)}>⋯</button>
              </div>
              {open && (
                <div className="group-options">
                  <div className="btn-row">
                    <button className="btn" onClick={() => nav(`/task/new?group=${g.id}`)}>+ Task</button>
                    <ConfirmButton armedText="Tap again" onConfirm={() => remove(g)}>Delete</ConfirmButton>
                  </div>
                  <p className="hint">Deleting a group keeps its tasks (they move to “No group”).</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="group-add glass">
        <input className="input" placeholder="New group name" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn primary" onClick={add} disabled={!name.trim()}>Add</button>
      </div>
      {data.ready && groups.length > 1 && <p className="hint">Hold <b>⠿</b> and drag to reorder.</p>}
      {data.ready && !groups.length && <p className="muted">Groups organise your list, e.g. Morning, Health, Work.</p>}
    </div>
  );
}
