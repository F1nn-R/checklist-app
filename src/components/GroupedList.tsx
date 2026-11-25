import { useState, type ReactNode } from 'react';
import type { Task } from '../db';
import type { AppData } from '../data';

function loadCollapsed(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('collapsed-' + key) ?? '[]')); } catch { return new Set(); }
}

/**
 * Renders tasks under collapsible group headers, in group order; ungrouped tasks go last.
 * With `emptyText`, groups with no tasks still show (with that text) instead of being hidden.
 */
export function GroupedList({ data, tasks, storageKey, emptyText, children }: {
  data: AppData; tasks: Task[]; storageKey: string; emptyText?: string; children: (t: Task) => ReactNode;
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
    ...data.groups.map((g) => ({ id: g.id, name: g.name, items: tasks.filter((t) => t.groupId === g.id) })),
    { id: '_none', name: 'No group', items: tasks.filter((t) => !t.groupId || !groupIds.has(t.groupId)) },
  ].filter((s) => s.items.length || (emptyText && s.id !== '_none'));

  const onlyUngrouped = sections.length === 1 && sections[0].id === '_none';

  return (
    <>
      {sections.map((s) => {
        const open = !collapsed.has(s.id);
        return (
          <section key={s.id} className={onlyUngrouped ? 'group' : `group group-box glass ${open ? 'open' : ''}`}>
            {!onlyUngrouped && (
              <button className="group-header" onClick={() => toggle(s.id)} aria-expanded={open} aria-label={`${s.name}, ${s.items.length} ${s.items.length === 1 ? 'task' : 'tasks'}`}>
                <span className="count">{s.items.length}</span>
                <span className="name">{s.name}</span>
                <span className={`chev-btn ${open ? 'open' : ''}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </button>
            )}
            {(open || onlyUngrouped) && (
              <div className="group-body">
                {s.items.length ? s.items.map(children) : <p className="group-empty">{emptyText}</p>}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
