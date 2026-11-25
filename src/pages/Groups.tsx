import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Group } from '../db';
import { createGroup, GROUP_COLORS, useData } from '../data';
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

  const groups = data.groups;
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setName('');
    await createGroup(n, groups);
  };
  const move = async (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= groups.length) return;
    const a = groups[i], b = groups[j];
    await db.transaction('rw', db.groups, async () => {
      await db.groups.update(a.id, { order: b.order });
      await db.groups.update(b.id, { order: a.order });
    });
  };
  const remove = async (g: Group) => {
    await db.transaction('rw', db.groups, db.tasks, async () => {
      await db.tasks.where('groupId').equals(g.id).modify({ groupId: null });
      await db.groups.delete(g.id);
    });
    setEditing(null);
  };

  return (
    <div className="page no-nav">
      <BackBar title="Groups" />

      <div className="list-edit" style={{ marginBottom: 16 }}>
        {groups.map((g, i) => {
          const count = data.tasks.filter((t) => t.groupId === g.id && !t.parentId && !t.archived).length;
          const open = editing === g.id;
          return (
            <div key={g.id}>
              <div className="item">
                <span className="dot" style={{ width: 12, height: 12, borderRadius: '50%', background: g.color, flexShrink: 0, marginRight: 6 }} />
                <GroupName g={g} />
                <span className="faint" style={{ fontSize: 13, marginRight: 4 }}>{count}</span>
                <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="icon-btn" aria-label="Move down" disabled={i === groups.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="icon-btn" aria-label="Group options" aria-expanded={open} onClick={() => setEditing(open ? null : g.id)}>⋯</button>
              </div>
              {open && (
                <div style={{ padding: '4px 12px 14px' }}>
                  <div className="swatches" style={{ marginBottom: 12 }}>
                    {GROUP_COLORS.map((c) => (
                      <button key={c} className={`swatch ${g.color === c ? 'on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`}
                        onClick={() => db.groups.update(g.id, { color: c })} />
                    ))}
                  </div>
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
        <div className="add" style={groups.length ? undefined : { borderTop: 'none' }}>
          <input className="input" placeholder="New group name" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" onClick={add} disabled={!name.trim()}>Add</button>
        </div>
      </div>
      {data.ready && !groups.length && <p className="muted">Groups organise your list, e.g. Morning, Health, Work.</p>}
    </div>
  );
}
