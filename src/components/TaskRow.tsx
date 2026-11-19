import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Task } from '../db';
import { isDone, streakInfo, type AppData } from '../data';
import { toggle } from '../logic/completion';
import { describeRepeat } from '../logic/schedule';
import type { DateStr } from '../logic/dates';
import { Checkbox, StreakBadge } from './ui';

const expandedKey = 'expanded-tasks';
function loadExpanded(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(expandedKey) ?? '[]')); } catch { return new Set(); }
}
function saveExpanded(id: string, open: boolean) {
  try {
    const s = loadExpanded();
    if (open) s.add(id); else s.delete(id);
    localStorage.setItem(expandedKey, JSON.stringify([...s]));
  } catch { /* storage unavailable */ }
}

/**
 * A task with a checkbox, streak and (if it has subtasks) an expand/collapse chevron.
 * `checkable=false` (e.g. future dates, All-tasks view) hides interaction with the checkbox.
 */
export function TaskRow({ task, data, date, today, checkable = true, showRepeat = false }: {
  task: Task; data: AppData; date: DateStr; today: DateStr; checkable?: boolean; showRepeat?: boolean;
}) {
  const nav = useNavigate();
  const subs = data.subtasksOf.get(task.id) ?? [];
  const [open, setOpen] = useState(() => loadExpanded().has(task.id));
  const done = isDone(data, task, date);
  const { current, repeat } = streakInfo(data, task, today);
  const subsDone = subs.filter((s) => isDone(data, s, date)).length;

  const setOpenPersist = (v: boolean) => { setOpen(v); saveExpanded(task.id, v); };

  return (
    <div className="card">
      <div className={`task-row ${done ? 'done' : ''}`}>
        <Checkbox on={done} disabled={!checkable} onToggle={() => toggle(db, task, date)} label={`Mark ${task.title} done`} />
        <button className="body" onClick={() => nav(`/task/${task.id}`)}>
          <div className="title">{task.title || 'Untitled'}</div>
          {task.description && <div className="desc">{task.description}</div>}
          {(showRepeat || subs.length > 0) && (
            <div className="meta">
              {showRepeat && <span>{describeRepeat(task.repeat)}</span>}
              {subs.length > 0 && <span className="sub-count">{subsDone}/{subs.length}</span>}
            </div>
          )}
        </button>
        {repeat && <StreakBadge n={current} />}
        {subs.length > 0 && (
          <button className="icon-btn" aria-label={open ? 'Collapse subtasks' : 'Expand subtasks'} aria-expanded={open} onClick={() => setOpenPersist(!open)}>
            <span className={`chev ${open ? 'open' : ''}`}>▶</span>
          </button>
        )}
      </div>
      {open && subs.length > 0 && (
        <div className="subtasks">
          {subs.map((s) => {
            const sDone = isDone(data, s, date);
            return (
              <div key={s.id} className={`task-row ${sDone ? 'done' : ''}`}>
                <Checkbox size="small" on={sDone} disabled={!checkable} onToggle={() => toggle(db, s, date)} label={`Mark ${s.title} done`} />
                <button className="body" onClick={() => nav(`/task/${s.id}`)}>
                  <div className="title">{s.title || 'Untitled'}</div>
                  {s.description && <div className="desc">{s.description}</div>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
