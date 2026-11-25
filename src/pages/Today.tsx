import { isDone, isDueTop, useData, useToday } from '../data';
import { formatShort } from '../logic/dates';
import { TaskRow } from '../components/TaskRow';
import { AddButton, SideMenu } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

/** Home page: today's tasks under every group (empty groups included). Other pages are in the side menu. */
export default function Today() {
  const data = useData();
  const today = useToday();

  const due = data.tasks.filter((t) => !t.parentId && !t.archived && isDueTop(data, t, today));
  const doneCount = due.filter((t) => isDone(data, t, today)).length;
  const pct = due.length ? Math.round((doneCount / due.length) * 100) : 0;

  return (
    <div className="page">
      <div className="topbar">
        <h1>{formatShort(today)}</h1>
        <SideMenu />
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

      {data.ready && due.length === 0 && !data.groups.length && (
        <div className="empty">
          <div className="big">{data.tasks.length ? '🌤️' : '📝'}</div>
          {data.tasks.length ? <p>Nothing scheduled for today.</p> : (
            <>
              <p>No tasks yet.</p>
              <p className="faint">Tap <b>+</b> to add your first task or group.</p>
            </>
          )}
        </div>
      )}

      <GroupedList data={data} tasks={due} storageKey="today" emptyText="Nothing today">
        {(t) => <TaskRow key={t.id} task={t} data={data} date={today} today={today} />}
      </GroupedList>

      <AddButton />
    </div>
  );
}
