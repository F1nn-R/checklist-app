import { isDone, isDueTop, reorderInGroup, useData, useToday } from '../data';
import { formatShort } from '../logic/dates';
import { countsForProgress } from '../logic/schedule';
import { TaskRow } from '../components/TaskRow';
import { AddButton, ProgressTube, SideMenu } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

/** Home page: today's tasks under every group (empty groups included). Other pages are in the side menu. */
export default function Today() {
  const data = useData();
  const today = useToday();

  const due = data.tasks.filter((t) => !t.parentId && !t.archived && isDueTop(data, t, today));
  const counted = due.filter(countsForProgress);
  const doneCount = counted.filter((t) => isDone(data, t, today)).length;

  return (
    <div className="page">
      <div className="topbar">
        <h1 className="date-title">{formatShort(today)}</h1>
        <SideMenu />
      </div>

      {counted.length > 0 && <ProgressTube done={doneCount} total={counted.length} />}

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

      <GroupedList data={data} tasks={due} storageKey="today" emptyText="Nothing today"
        onReorder={(section, from, to) => reorderInGroup(data, section, from, to)}>
        {(t) => <TaskRow key={t.id} task={t} data={data} date={today} today={today} />}
      </GroupedList>

      <AddButton />
    </div>
  );
}
