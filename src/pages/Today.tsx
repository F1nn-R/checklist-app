import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isDone, isDueTop, useData, useToday } from '../data';
import { addDays, diffDays, parseDate } from '../logic/dates';
import { TaskRow } from '../components/TaskRow';
import { Fab } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

export default function Today() {
  const data = useData();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const date = addDays(today, offset);
  const future = diffDays(today, date) > 0;

  const due = data.tasks.filter((t) => !t.parentId && !t.archived && isDueTop(data, t, date));
  const doneCount = due.filter((t) => isDone(data, t, date)).length;
  const pct = due.length ? Math.round((doneCount / due.length) * 100) : 0;

  const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : offset === 1 ? 'Tomorrow'
    : parseDate(date).toLocaleDateString(undefined, { weekday: 'long' });
  const sub = parseDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <div className="date-switch">
        <button className="icon-btn" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>‹</button>
        <button className="label" style={{ background: 'none', border: 'none' }} onClick={() => setOffset(0)}>
          {label}<small>{sub}</small>
        </button>
        <button className="icon-btn" aria-label="Next day" onClick={() => setOffset(offset + 1)}>›</button>
      </div>

      {due.length > 0 && (
        <>
          <div className="progress-label">
            <span>{doneCount} of {due.length} done</span>
            <span>{pct}%</span>
          </div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        </>
      )}

      {data.ready && due.length === 0 && (
        <div className="empty">
          <div className="big">{data.tasks.length ? '🌤️' : '📝'}</div>
          {data.tasks.length ? <p>Nothing scheduled for this day.</p> : (
            <>
              <p>No tasks yet.</p>
              <p className="faint">Tap <b>+</b> to add your first task, or set up <Link to="/groups">groups</Link> first.</p>
            </>
          )}
        </div>
      )}

      <GroupedList data={data} tasks={due} storageKey="today">
        {(t) => <TaskRow key={t.id} task={t} data={data} date={date} today={today} checkable={!future} />}
      </GroupedList>

      {future && due.length > 0 && <p className="hint" style={{ textAlign: 'center' }}>Future days are view-only.</p>}
      <Fab to="/task/new" />
    </div>
  );
}
