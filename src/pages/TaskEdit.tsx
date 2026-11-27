import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, newId, type RepeatRule, type Task } from '../db';
import { useData } from '../data';
import { deleteTask, syncParent } from '../logic/completion';
import { diffDays, todayStr, toDateStr } from '../logic/dates';
import { BackBar, ConfirmButton, Switch } from '../components/ui';
import { RepeatPicker } from '../components/RepeatPicker';
import { DragHandle, useDragReorder } from '../components/DragReorder';
import { moveItem } from '../logic/reorder';

interface SubDraft { id: string; title: string; isNew: boolean }

export default function TaskEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const data = useData();
  const isNew = !id;
  const existing = id ? data.taskById.get(id) : undefined;
  const parentId = existing ? existing.parentId : params.get('parent');
  const parent = parentId ? data.taskById.get(parentId) : undefined;

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [info, setInfo] = useState('');
  const [groupId, setGroupId] = useState<string | null>(params.get('group'));
  const [repeat, setRepeat] = useState<RepeatRule | null>({ kind: 'daily' });
  // When the start-date toggle is off, the task starts on the day it was created.
  const [startOn, setStartOn] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [dueOn, setDueOn] = useState(false);
  const [dueDate, setDueDate] = useState(todayStr());
  const [misc, setMisc] = useState(false);
  const [subs, setSubs] = useState<SubDraft[]>([]);
  // Hook stays above the early "not found" return below.
  const subDnd = useDragReorder(subs.length, (from, to) => setSubs((cur) => moveItem(cur, from, to)));
  const [removed, setRemoved] = useState<string[]>([]);
  const [newSub, setNewSub] = useState('');

  // Initialise the form once data is ready.
  useEffect(() => {
    if (!data.ready || loaded) return;
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description);
      setInfo(existing.info);
      setGroupId(existing.groupId);
      setRepeat(existing.repeat);
      setStartDate(existing.startDate);
      setStartOn(existing.startDate !== toDateStr(new Date(existing.createdAt)));
      if (existing.dueDate) { setDueOn(true); setDueDate(existing.dueDate); }
      setMisc(!!existing.misc);
      setSubs((data.subtasksOf.get(existing.id) ?? []).map((s) => ({ id: s.id, title: s.title, isNew: false })));
    } else if (!params.get('group') && data.groups.length === 1) {
      setGroupId(data.groups[0].id);
    }
    setLoaded(true);
  }, [data.ready, loaded, existing, data.subtasksOf, data.groups, params]);

  if (data.ready && id && !existing) return <div className="page no-nav"><BackBar menu={false} /><div className="empty">Task not found.</div></div>;

  const isSub = !!parentId;
  const canSave = title.trim().length > 0;
  const createdDay = existing ? toDateStr(new Date(existing.createdAt)) : todayStr();
  const effStart = startOn ? startDate : createdDay;
  const effDue = !repeat && dueOn ? dueDate : null; // due dates are for one-off tasks only

  const toggleDue = (on: boolean) => {
    // Default a fresh due date to the start day (or today, if that's later).
    if (on && !existing?.dueDate) setDueDate(diffDays(todayStr(), effStart) > 0 ? effStart : todayStr());
    setDueOn(on);
  };

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubs([...subs, { id: newId(), title: t, isNew: true }]);
    setNewSub('');
  };

  const save = async () => {
    if (!canSave) return;
    const taskId = existing?.id ?? newId();
    const siblings = data.tasks.filter((t) => t.parentId === (parentId ?? null));
    const base: Task = existing ?? {
      id: taskId, parentId: parentId ?? null, groupId: null, title: '', description: '', info: '',
      repeat: null, startDate: effStart, dueDate: null, misc: false, order: siblings.length ? Math.max(...siblings.map((t) => t.order)) + 1 : 0,
      archived: false, createdAt: Date.now(),
    };
    const task: Task = {
      ...base,
      title: title.trim(),
      description: description.trim(),
      info,
      groupId: isSub ? parent?.groupId ?? null : groupId,
      repeat: isSub ? null : repeat,
      startDate: isSub ? base.startDate : effStart,
      dueDate: isSub ? null : effDue,
      misc: !isSub && !repeat && misc, // one-off tasks only
    };
    await db.transaction('rw', db.tasks, db.completions, async () => {
      await db.tasks.put(task);
      if (!isSub) {
        for (const rid of removed) await deleteTask(db, rid);
        await Promise.all(subs.map(async (s, i) => {
          const prev = s.isNew ? undefined : await db.tasks.get(s.id);
          await db.tasks.put({
            ...(prev ?? {
              id: s.id, parentId: taskId, description: '', info: '', repeat: null,
              startDate: task.startDate, dueDate: null, misc: false, archived: false, createdAt: Date.now(),
            }),
            title: s.title, order: i, groupId: task.groupId,
          } as Task);
        }));
      }
    });
    await syncParent(db, isSub && parentId ? parentId : taskId, todayStr());
    if (isNew) nav(`/task/${taskId}`, { replace: true });
    else nav(-1);
  };

  const archive = async () => {
    if (!existing) return;
    await db.tasks.update(existing.id, { archived: !existing.archived });
    nav(-1);
  };
  const remove = async () => {
    if (!existing) return;
    await deleteTask(db, existing.id);
    if (existing.parentId) await syncParent(db, existing.parentId, todayStr());
    nav(existing.parentId ? `/task/${existing.parentId}` : '/', { replace: true });
  };

  return (
    <div className="page no-nav">
      <BackBar
        menu={false}
        title={isNew ? (isSub ? 'New subtask' : 'New task') : 'Edit task'}
        right={<button className="btn primary" disabled={!canSave} onClick={save}>Save</button>}
      />

      {isSub && parent && <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>Subtask of <b>{parent.title}</b>. Follows its schedule.</p>}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" className="input" value={title} autoFocus={isNew}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </div>

      <div className="field">
        <label htmlFor="desc">Description</label>
        <textarea id="desc" className="textarea" rows={2} style={{ minHeight: 60 }} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>

      {!isSub && (
        <>
          <div className="field">
            <label htmlFor="group">Group</label>
            <select id="group" className="select" value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value || null)}>
              <option value="">No group</option>
              {data.groups.filter((g) => !g.archived || g.id === groupId).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Repeat</div>
            <RepeatPicker value={repeat} onChange={setRepeat} startDate={effStart} />
          </div>

          <div className="field">
            <div className="toggle-row">
              <label htmlFor="start">Start date</label>
              <Switch on={startOn} onChange={setStartOn} label="Set a start date" />
            </div>
            {startOn
              ? <input id="start" className="input" type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
              : <div className="hint">{isNew ? 'Starts today.' : 'Starts the day it was created.'}</div>}
            {!isNew && repeat && startOn && <div className="hint">Streaks and history are counted from this date.</div>}
          </div>

          {!repeat && (
            <div className="field">
              <div className="toggle-row">
                <label htmlFor="due">Due date</label>
                <Switch on={dueOn} onChange={toggleDue} label="Set a due date" />
              </div>
              {dueOn && <input id="due" className="input" type="date" value={dueDate} min={effStart} onChange={(e) => e.target.value && setDueDate(e.target.value)} />}
            </div>
          )}

          {!repeat && (
            <div className="field">
              <div className="toggle-row">
                <span>Misc. task</span>
                <Switch on={misc} onChange={setMisc} label="Misc. task" />
              </div>
              <div className="hint">Doesn't count towards the progress bar.</div>
            </div>
          )}

          <div className="field">
            <div className="label">Subtasks</div>
            <div ref={subDnd.listRef} className={`list-edit reorderable ${subDnd.dragging ? 'dragging' : ''}`}>
              {subs.map((s, i) => (
                <div key={s.id} data-drag-item className={`item ${subDnd.isLifted(i) ? 'lifted' : ''}`} style={subDnd.itemStyle(i)}>
                  {subs.length > 1 && <DragHandle {...subDnd.handleProps(i, s.title || 'subtask')} />}
                  <input className="name input-bare" value={s.title} aria-label="Subtask title"
                    onChange={(e) => setSubs(subs.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
                  <button type="button" className="icon-btn" aria-label="Remove subtask" onClick={() => {
                    setSubs(subs.filter((x) => x.id !== s.id));
                    if (!s.isNew) setRemoved([...removed, s.id]);
                  }}>✕</button>
                </div>
              ))}
              <div className="add">
                <input className="input" value={newSub} placeholder="Add a subtask" onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} />
                <button type="button" className="btn" onClick={addSub} disabled={!newSub.trim()}>Add</button>
              </div>
            </div>
            <div className="hint">Open a subtask after saving to give it its own description and info.</div>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="info">Full info</label>
        <textarea id="info" className="textarea tall" value={info} onChange={(e) => setInfo(e.target.value)} />
        <div className="hint">Only shown when you open the task.</div>
      </div>

      {existing && (
        <div className="btn-row" style={{ marginTop: 24 }}>
          {!isSub && <button className="btn" onClick={archive}>{existing.archived ? 'Unarchive' : 'Archive'}</button>}
          <ConfirmButton armedText="Tap again to delete" onConfirm={remove}>Delete</ConfirmButton>
        </div>
      )}
    </div>
  );
}
