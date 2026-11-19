import { newId, type ChecklistDB, type Completion, type Task } from '../db';
import type { DateStr } from './dates';

/** One-off tasks (and subtasks of one-off parents) count as done once any completion exists. */
async function isOneOff(db: ChecklistDB, task: Task): Promise<boolean> {
  if (task.parentId) {
    const parent = await db.tasks.get(task.parentId);
    return !parent?.repeat;
  }
  return !task.repeat;
}

export async function findCompletion(db: ChecklistDB, task: Task, date: DateStr): Promise<Completion | undefined> {
  if (await isOneOff(db, task)) return db.completions.where('taskId').equals(task.id).first();
  return db.completions.where('[taskId+date]').equals([task.id, date]).first();
}

async function setDone(db: ChecklistDB, task: Task, date: DateStr, done: boolean, auto: boolean) {
  const existing = await findCompletion(db, task, date);
  if (done && !existing) {
    await db.completions.add({ id: newId(), taskId: task.id, date, completedAt: Date.now(), auto });
  } else if (!done && existing) {
    if (await isOneOff(db, task)) await db.completions.where('taskId').equals(task.id).delete();
    else await db.completions.delete(existing.id);
  }
}

/** Re-evaluate a parent after one of its subtasks changed. */
export async function syncParent(db: ChecklistDB, parentId: string, date: DateStr) {
  const parent = await db.tasks.get(parentId);
  if (!parent) return;
  const subs = (await db.tasks.where('parentId').equals(parentId).toArray()).filter((t) => !t.archived);
  if (!subs.length) return;
  const states = await Promise.all(subs.map((s) => findCompletion(db, s, date)));
  const allDone = states.every(Boolean);
  const parentDone = await findCompletion(db, parent, date);
  if (allDone && !parentDone) await setDone(db, parent, date, true, true);
  else if (!allDone && parentDone?.auto) await setDone(db, parent, date, false, false);
}

/**
 * Tick / untick a task for a date.
 * - Ticking the parent manually never touches its subtasks.
 * - Ticking a subtask auto-ticks the parent when all subtasks are done.
 * - Unticking a subtask unticks the parent only if the parent was auto-ticked.
 */
export async function toggle(db: ChecklistDB, task: Task, date: DateStr): Promise<boolean> {
  return db.transaction('rw', db.tasks, db.completions, async () => {
    const done = !!(await findCompletion(db, task, date));
    await setDone(db, task, date, !done, false);
    if (task.parentId) await syncParent(db, task.parentId, date);
    return !done;
  });
}

/** Delete a task, its subtasks and all their history. */
export async function deleteTask(db: ChecklistDB, taskId: string) {
  await db.transaction('rw', db.tasks, db.completions, async () => {
    const subs = await db.tasks.where('parentId').equals(taskId).primaryKeys();
    const ids = [taskId, ...subs];
    await db.completions.where('taskId').anyOf(ids).delete();
    await db.tasks.bulkDelete(ids);
  });
}
