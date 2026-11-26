import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Group } from '../db';
import { createGroup, useData } from '../data';
import { moveItem } from '../logic/reorder';
import { DragHandle, useDragReorder } from '../components/DragReorder';
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

export default function Groups() {
  const data = useData();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  // Order shown right after a drop, until the database catches up (avoids a flicker back).
  const [pending, setPending] = useState<string[] | null>(null);

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

  const dnd = useDragReorder(groups.length, (from, to) => saveOrder(moveItem(groups, from, to)), () => setEditing(null));

  return (
    <div className="page no-nav">
      <BackBar title="Groups" />

      <div ref={dnd.listRef} className={`group-list reorderable ${dnd.dragging ? 'dragging' : ''}`}>
        {groups.map((g, i) => {
          const count = data.tasks.filter((t) => t.groupId === g.id && !t.parentId && !t.archived).length;
          const open = editing === g.id;
          return (
            <div key={g.id} data-drag-item className={`group-item glass ${dnd.isLifted(i) ? 'lifted' : ''}`} style={dnd.itemStyle(i)}>
              <div className="item">
                <DragHandle {...dnd.handleProps(i, g.name)} />
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
      {data.ready && !groups.length && <p className="muted">Groups organise your list, e.g. Morning, Health, Work.</p>}
    </div>
  );
}
