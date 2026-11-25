import { useState } from 'react';
import { isDone, isDueTop, useData, useToday } from '../data';
import { addDays, parseDate } from '../logic/dates';
import { TaskRow } from '../components/TaskRow';
import { BackBar, ProgressTube } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

/** Browse and correct earlier days. Opened from the side menu on the home page; never shows today or the future. */
export default function PastDays() {
  const data = useData();
  const today = useToday();
  const [offset, setOffset] = useState(-1);
  const date = addDays(today, offset);

  const due = data.tasks.filter((t) => !t.parentId && !t.archived && isDueTop(data, t, date));
  const doneCount = due.filter((t) => isDone(data, t, date)).length;

  const label = offset === -1 ? 'Yesterday' : parseDate(date).toLocaleDateString(undefined, { weekday: 'long' });
  const sub = parseDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page no-nav">
      <BackBar title="Past days" />
      <div className="date-switch">
        <button className="icon-btn" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>‹</button>
        <div className="label">{label}<small>{sub}</small></div>
        <button className="icon-btn" aria-label="Next day" disabled={offset >= -1} onClick={() => setOffset(offset + 1)}>›</button>
      </div>

      {due.length > 0 && <ProgressTube done={doneCount} total={due.length} />}

      {data.ready && due.length === 0 && <div className="empty"><p>Nothing was scheduled for this day.</p></div>}

      <GroupedList data={data} tasks={due} storageKey="past">
        {(t) => <TaskRow key={t.id} task={t} data={data} date={date} today={today} />}
      </GroupedList>
    </div>
  );
}
