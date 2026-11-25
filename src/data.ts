import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type Completion, type Group, type Task } from './db';
import { todayStr, type DateStr } from './logic/dates';
import { effective, isDueOn } from './logic/schedule';
import { bestStreak, completionRate, currentStreak } from './logic/streak';

export interface AppData {
  ready: boolean;
  groups: Group[];
  tasks: Task[];
  taskById: Map<string, Task>;
  subtasksOf: Map<string, Task[]>; // non-archived, ordered
  doneDates: Map<string, Set<DateStr>>;
  firstDone: Map<string, DateStr>; // earliest completion (used for one-off tasks)
  autoDone: Set<string>; // `${taskId}|${date}` completions that were auto-ticked
}

/** Loads everything reactively. Personal-scale data, so holding it all in memory is fine. */
export function useData(): AppData {
  const groups = useLiveQuery(() => db.groups.orderBy('order').toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.orderBy('order').toArray(), []);
  const completions = useLiveQuery(() => db.completions.toArray(), []);

  return useMemo(() => {
    const ready = !!groups && !!tasks && !!completions;
    const t = tasks ?? [];
    const taskById = new Map(t.map((x) => [x.id, x]));
    const subtasksOf = new Map<string, Task[]>();
    for (const x of t) {
      if (!x.parentId || x.archived) continue;
      const arr = subtasksOf.get(x.parentId) ?? [];
      arr.push(x);
      subtasksOf.set(x.parentId, arr);
    }
    const doneDates = new Map<string, Set<DateStr>>();
    const firstDone = new Map<string, DateStr>();
    const autoDone = new Set<string>();
    for (const c of (completions ?? []) as Completion[]) {
      let s = doneDates.get(c.taskId);
      if (!s) doneDates.set(c.taskId, (s = new Set()));
      s.add(c.date);
      const f = firstDone.get(c.taskId);
      if (!f || c.date < f) firstDone.set(c.taskId, c.date);
      if (c.auto) autoDone.add(`${c.taskId}|${c.date}`);
    }
    return { ready, groups: groups ?? [], tasks: t, taskById, subtasksOf, doneDates, firstDone, autoDone };
  }, [groups, tasks, completions]);
}

export function parentOf(data: AppData, task: Task): Task | undefined {
  return task.parentId ? data.taskById.get(task.parentId) : undefined;
}

export function isDone(data: AppData, task: Task, date: DateStr): boolean {
  const { repeat } = effective(task, parentOf(data, task));
  if (!repeat) return data.firstDone.has(task.id);
  return data.doneDates.get(task.id)?.has(date) ?? false;
}

export function isDueTop(data: AppData, task: Task, date: DateStr): boolean {
  return isDueOn(task, date, undefined, task.repeat ? null : data.firstDone.get(task.id) ?? null);
}

export function streakInfo(data: AppData, task: Task, today: DateStr) {
  const { repeat, startDate } = effective(task, parentOf(data, task));
  const done = data.doneDates.get(task.id) ?? new Set<DateStr>();
  return {
    repeat,
    startDate,
    done,
    current: currentStreak(repeat, startDate, done, today),
    best: bestStreak(repeat, startDate, done, today),
    rate: completionRate(repeat, startDate, done, today),
  };
}

/** Today's date, refreshed when the app regains focus or the day rolls over. */
export function useToday(): DateStr {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const update = () => setToday(todayStr());
    const iv = setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return today;
}

export const GROUP_COLORS = ['#6c8cff', '#3ecf8e', '#ffad42', '#ff6b6b', '#c77dff', '#4cc9f0', '#f72585', '#a3a3a3'];

/** Adds a group at the end of the list, cycling through the default colours. */
export async function createGroup(name: string, existing: Group[]): Promise<void> {
  const n = name.trim();
  if (!n) return;
  await db.groups.add({
    id: newId(), name: n, color: GROUP_COLORS[existing.length % GROUP_COLORS.length],
    order: existing.length ? Math.max(...existing.map((g) => g.order)) + 1 : 0, archived: false,
  });
}
