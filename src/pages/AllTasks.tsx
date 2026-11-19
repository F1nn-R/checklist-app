import { useState } from 'react';
import { useData, useToday } from '../data';
import { TaskRow } from '../components/TaskRow';
import { Fab } from '../components/ui';
import { GroupedList } from '../components/GroupedList';

export default function AllTasks() {
  const data = useData();
  const today = useToday();
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const tasks = data.tasks.filter((t) => {
    if (t.parentId || t.archived !== archived) return false;
    if (!query) return true;
    const subs = data.subtasksOf.get(t.id) ?? [];
    return [t, ...subs].some((x) => `${x.title} ${x.description}`.toLowerCase().includes(query));
  });

  return (
    <div className="page">
      <div className="topbar"><h1>All tasks</h1></div>
      <div className="field">
        <input className="input" type="search" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={!archived ? 'on' : ''} onClick={() => setArchived(false)}>Active</button>
        <button className={archived ? 'on' : ''} onClick={() => setArchived(true)}>Archived</button>
      </div>
      {data.ready && tasks.length === 0 && <div className="empty"><p>{query ? 'No matches.' : archived ? 'No archived tasks.' : 'No tasks yet.'}</p></div>}
      <GroupedList data={data} tasks={tasks} storageKey="all">
        {(t) => <TaskRow key={t.id} task={t} data={data} date={today} today={today} showRepeat />}
      </GroupedList>
      <Fab to="/task/new" />
    </div>
  );
}
