import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, newId, type RepeatRule, type Task } from '../db';
import { useData } from '../data';
import { deleteTask, syncParent } from '../logic/completion';
import { todayStr } from '../logic/dates';
import { BackBar, ConfirmButton, MarkdownView } from '../components/ui';
import { RepeatPicker } from '../components/RepeatPicker';

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
  const [infoTab, setInfoTab] = useState<'write' | 'preview'>('write');
  const [groupId, setGroupId] = useState<string | null>(params.get('group'));
  const [repeat, setRepeat] = useState<RepeatRule | null>({ kind: 'daily' });
  const [startDate, setStartDate] = useState(todayStr());
  const [subs, setSubs] = useState<SubDraft[]>([]);
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
      setSubs((data.subtasksOf.get(existing.id) ?? []).map((s) => ({ id: s.id, title: s.title, isNew: false })));
    } else if (!params.get('group') && data.groups.length === 1) {
      setGroupId(data.groups[0].id);
    }
    setLoaded(true);
  }, [data.ready, loaded, existing, data.subtasksOf, data.groups, params]);

  if (data.ready && id && !existing) return <div className="page no-nav"><BackBar /><div className="empty">Task not found.</div></div>;

  const isSub = !!parentId;
  const canSave = title.trim().length > 0;

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubs([...subs, { id: newId(), title: t, isNew: true }]);
    setNewSub('');
  };
  const moveSub = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= subs.length) return;
    const next = [...subs];
    [next[i], next[j]] = [next[j], next[i]];
    setSubs(next);
  };

  const save = async () => {
    if (!canSave) return;
    const taskId = existing?.id ?? newId();
    const siblings = data.tasks.filter((t) => t.parentId === (parentId ?? null));
    const base: Task = existing ?? {
      id: taskId, parentId: parentId ?? null, groupId: null, title: '', description: '', info: '',
      repeat: null, startDate, order: siblings.length ? Math.max(...siblings.map((t) => t.order)) + 1 : 0,
      archived: false, createdAt: Date.now(),
    };
    const task: Task = {
      ...base,
      title: title.trim(),
      description: description.trim(),
      info,
      groupId: isSub ? parent?.groupId ?? null : groupId,
      repeat: isSub ? null : repeat,
      startDate: isSub ? base.startDate : startDate,
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
              startDate: task.startDate, archived: false, createdAt: Date.now(),
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
        title={isNew ? (isSub ? 'New subtask' : 'New task') : 'Edit task'}
        right={<button className="btn primary" disabled={!canSave} onClick={save}>Save</button>}
      />

      {isSub && parent && <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>Subtask of <b>{parent.title}</b>. Follows its schedule.</p>}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" className="input" value={title} autoFocus={isNew} placeholder="e.g. Morning workout"
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </div>

      <div className="field">
        <label htmlFor="desc">Description</label>
        <textarea id="desc" className="textarea" rows={2} style={{ minHeight: 60 }} value={description}
          placeholder="Short summary shown in the list" onChange={(e) => setDescription(e.target.value)} />
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
            <RepeatPicker value={repeat} onChange={setRepeat} startDate={startDate} />
          </div>

          <div className="field">
            <label htmlFor="start">{repeat ? 'Starts' : 'Show from'}</label>
            <input id="start" className="input" type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
            {!isNew && repeat && <div className="hint">Streaks and history are counted from this date.</div>}
          </div>

          <div className="field">
            <div className="label">Subtasks</div>
            <div className="list-edit">
              {subs.map((s, i) => (
                <div key={s.id} className="item">
                  <input className="name input-bare" value={s.title} aria-label="Subtask title"
                    onChange={(e) => setSubs(subs.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
                  <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => moveSub(i, -1)}>↑</button>
                  <button type="button" className="icon-btn" aria-label="Move down" disabled={i === subs.length - 1} onClick={() => moveSub(i, 1)}>↓</button>
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
        <div className="row" style={{ marginBottom: 6 }}>
          <div className="label" style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Full info</div>
          <div className="seg" style={{ padding: 2 }}>
            <button type="button" className={infoTab === 'write' ? 'on' : ''} style={{ padding: '5px 12px' }} onClick={() => setInfoTab('write')}>Write</button>
            <button type="button" className={infoTab === 'preview' ? 'on' : ''} style={{ padding: '5px 12px' }} onClick={() => setInfoTab('preview')}>Preview</button>
          </div>
        </div>
        {infoTab === 'write'
          ? <textarea className="textarea mono" value={info} onChange={(e) => setInfo(e.target.value)}
              placeholder={'Markdown supported:\n# Heading\n- bullet\n**bold**, [link](https://…)'} />
          : info.trim() ? <MarkdownView text={info} /> : <p className="faint">Nothing to preview.</p>}
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
