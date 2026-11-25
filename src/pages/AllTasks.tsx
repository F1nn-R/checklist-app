import { useState } from 'react';
import { useData, useToday } from '../data';
import { TaskRow } from '../components/TaskRow';
import { AddButton, BackBar } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

/** Every task regardless of schedule (`archived=false`), or the archived ones. Opened from the side menu. */
export default function AllTasks({ archived }: { archived: boolean }) {
  const data = useData();
  const today = useToday();
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const tasks = data.tasks.filter((t) => {
    if (t.parentId || t.archived !== archived) return false;
    if (!query) return true;
    const subs = data.subtasksOf.get(t.id) ?? [];
    return [t, ...subs].some((x) => `${x.title} ${x.description}`.toLowerCase().includes(query));
  });

  return (
    <div className={`page ${archived ? 'no-nav' : ''}`}>
      <BackBar title={archived ? 'Archived' : 'All tasks'} />
      <div className="field">
        <input className="input" type="search" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {data.ready && tasks.length === 0 && <div className="empty"><p>{query ? 'No matches.' : archived ? 'No archived tasks.' : 'No tasks yet.'}</p></div>}
      <GroupedList data={data} tasks={tasks} storageKey={archived ? 'archived' : 'all'}>
        {(t) => <TaskRow key={t.id} task={t} data={data} date={today} today={today} showRepeat />}
      </GroupedList>
      {!archived && <AddButton />}
    </div>
  );
}
