import { Link, useNavigate } from 'react-router-dom';
import { isDone, isDueTop, useData, useToday } from '../data';
import { parseDate } from '../logic/dates';
import { TaskRow } from '../components/TaskRow';
import { Fab, MoreMenu } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

export default function Today() {
  const data = useData();
  const today = useToday();
  const nav = useNavigate();

  const due = data.tasks.filter((t) => !t.parentId && !t.archived && isDueTop(data, t, today));
  const doneCount = due.filter((t) => isDone(data, t, today)).length;
  const pct = due.length ? Math.round((doneCount / due.length) * 100) : 0;
  const sub = parseDate(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <div className="topbar">
        <h1>Today<span className="date-sub">{sub}</span></h1>
        <MoreMenu items={[{ label: 'Past days', onSelect: () => nav('/past') }]} />
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
          {data.tasks.length ? <p>Nothing scheduled for today.</p> : (
            <>
              <p>No tasks yet.</p>
              <p className="faint">Tap <b>+</b> to add your first task, or set up <Link to="/groups">groups</Link> first.</p>
            </>
          )}
        </div>
      )}

      <GroupedList data={data} tasks={due} storageKey="today">
        {(t) => <TaskRow key={t.id} task={t} data={data} date={today} today={today} />}
      </GroupedList>

      <Fab to="/task/new" />
    </div>
  );
}
