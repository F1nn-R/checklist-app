import { useState, type ReactNode } from 'react';
import type { Task } from '../db';
import type { AppData } from '../data';

function loadCollapsed(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('collapsed-' + key) ?? '[]')); } catch { return new Set(); }
}

/** Renders tasks under collapsible group headers, in group order; ungrouped tasks go last. */
export function GroupedList({ data, tasks, storageKey, children }: {
  data: AppData; tasks: Task[]; storageKey: string; children: (t: Task) => ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(storageKey));
  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsed(next);
    try { localStorage.setItem('collapsed-' + storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const groupIds = new Set(data.groups.map((g) => g.id));
  const sections = [
    ...data.groups.map((g) => ({ id: g.id, name: g.name, color: g.color, items: tasks.filter((t) => t.groupId === g.id) })),
    { id: '_none', name: 'No group', color: 'var(--text-faint)', items: tasks.filter((t) => !t.groupId || !groupIds.has(t.groupId)) },
  ].filter((s) => s.items.length);

  const onlyUngrouped = sections.length === 1 && sections[0].id === '_none';

  return (
    <>
      {sections.map((s) => {
        const open = !collapsed.has(s.id);
        return (
          <section key={s.id} className="group">
            {!onlyUngrouped && (
              <button className="group-header" onClick={() => toggle(s.id)} aria-expanded={open}>
                <span className={`chev ${open ? 'open' : ''}`}>▶</span>
                <span className="dot" style={{ background: s.color }} />
                {s.name}
                <span className="count">{s.items.length}</span>
              </button>
            )}
            {(open || onlyUngrouped) && s.items.map(children)}
          </section>
        );
      })}
    </>
  );
}
