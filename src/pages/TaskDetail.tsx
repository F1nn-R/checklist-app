import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { isDone, isDueTop, parentOf, streakInfo, useData, useToday } from '../data';
import { toggle } from '../logic/completion';
import { describeRepeat, dueStatus } from '../logic/schedule';
import { parseDate } from '../logic/dates';
import { BackBar, Checkbox, Flame } from '../components/ui';
import { dueLabel } from '../components/TaskRow';
import { HistoryCalendar } from '../components/HistoryCalendar';

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const data = useData();
  const today = useToday();
  const task = id ? data.taskById.get(id) : undefined;

  if (!data.ready) return <div className="page no-nav" />;
  if (!task) return <div className="page no-nav"><BackBar /><div className="empty">Task not found.</div></div>;

  const parent = parentOf(data, task);
  const owner = parent ?? task;
  const group = data.groups.find((g) => g.id === owner.groupId);
  const subs = data.subtasksOf.get(task.id) ?? [];
  const st = streakInfo(data, task, today);
  const done = isDone(data, task, today);
  const dueToday = isDueTop(data, owner, today) || (!st.repeat && !done);
  const oneOffDone = !st.repeat ? data.firstDone.get(task.id) : undefined;
  const due = dueStatus(task, today, done);

  return (
    <div className="page no-nav">
      <BackBar right={<button className="btn" onClick={() => nav(`/task/${task.id}/edit`)}>Edit</button>} />

      {parent && (
        <Link className="chip" to={`/task/${parent.id}`} style={{ marginBottom: 8 }}>↖ Part of: {parent.title}</Link>
      )}
      <h1 className="detail-title">{task.title || 'Untitled'}</h1>
      {task.description && <p className="detail-desc">{task.description}</p>}

      <div className="chips">
        {group && <span className="chip">{group.name}</span>}
        <span className="chip">🔁 {describeRepeat(st.repeat)}{parent ? ' (from parent)' : ''}</span>
        {due && task.dueDate && <span className={`chip due ${due.overdue ? 'overdue' : ''}`}>📅 {dueLabel(task.dueDate, due.daysLeft)}</span>}
        {task.archived && <span className="chip">Archived</span>}
      </div>

      {dueToday && !task.archived && (
        <div className={`done-today ${done ? 'on' : ''}`} onClick={() => toggle(db, task, today)}>
          <Checkbox on={done} onToggle={() => toggle(db, task, today)} label="Done today" />
          {done ? (st.repeat ? 'Done today' : 'Done') : st.repeat ? 'Mark done for today' : 'Mark done'}
        </div>
      )}

      {st.repeat && (
        <div className="stats">
          <div className="stat"><div className="v streak-v" style={{ color: st.current ? 'var(--flame)' : undefined }}><Flame off={!st.current} size={18} />{st.current}</div><div className="l">Current streak</div></div>
          <div className="stat"><div className="v">{st.best}</div><div className="l">Best streak</div></div>
          <div className="stat"><div className="v">{st.rate == null ? '–' : Math.round(st.rate * 100) + '%'}</div><div className="l">Completion</div></div>
        </div>
      )}
      {oneOffDone && <p className="muted">✅ Completed {parseDate(oneOffDone).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>}

      {!task.parentId && (
        <div className="section">
          <h2>Subtasks {subs.length > 0 && `· ${subs.filter((s) => isDone(data, s, today)).length}/${subs.length}`}</h2>
          {subs.length > 0 && (
            <div className="card">
              <div className="subtasks" style={{ border: 'none', padding: '2px 0', background: 'none' }}>
                {subs.map((s) => {
                  const sd = isDone(data, s, today);
                  return (
                    <div key={s.id} className={`task-row ${sd ? 'done' : ''}`}>
                      <Checkbox size="small" on={sd} disabled={!dueToday || task.archived} onToggle={() => toggle(db, s, today)} label={`Mark ${s.title} done`} />
                      <button className="body" onClick={() => nav(`/task/${s.id}`)}>
                        <div className="title">{s.title || 'Untitled'}</div>
                        {s.description && <div className="desc">{s.description}</div>}
                      </button>
                      <span className="faint">›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => nav(`/task/new?parent=${task.id}`)}>+ Add subtask</button>
        </div>
      )}

      <div className="section">
        <h2>Full info</h2>
        {task.info.trim()
          ? <p className="info-text">{task.info}</p>
          : <p className="faint">No info yet. <Link to={`/task/${task.id}/edit`}>Add some</Link>.</p>}
      </div>

      {st.repeat && (
        <div className="section">
          <h2>History</h2>
          <HistoryCalendar rule={st.repeat} startDate={st.startDate} done={st.done} today={today} onToggle={(d) => toggle(db, task, d)} />
          <p className="hint">Tap a past scheduled day to correct it.</p>
        </div>
      )}
    </div>
  );
}
