import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChecklistDB, type Task } from '../db';
import { addDays, formatShort } from './dates';
import { dropTarget, moveItem, placeSubset } from './reorder';
import { countsForProgress, dueStatus, isDueOn, ruleMatches } from './schedule';
import { bestStreak, completionRate, currentStreak } from './streak';
import { findCompletion, toggle } from './completion';

const s = (...d: string[]) => new Set(d);

describe('schedule', () => {
  it('weekdays rule', () => {
    const r = { kind: 'weekdays' as const, days: [1, 3, 5] }; // Mon Wed Fri
    expect(ruleMatches(r, '2026-11-01', '2026-11-16')).toBe(true); // Mon
    expect(ruleMatches(r, '2026-11-01', '2026-11-17')).toBe(false); // Tue
  });
  it('not before start date', () => {
    expect(ruleMatches({ kind: 'daily' }, '2026-11-10', '2026-11-09')).toBe(false);
  });
  it('interval rule', () => {
    const r = { kind: 'interval' as const, everyNDays: 3 };
    expect(ruleMatches(r, '2026-11-01', '2026-11-04')).toBe(true);
    expect(ruleMatches(r, '2026-11-01', '2026-11-05')).toBe(false);
  });
  it('monthly day 31 clamps to last day of short months', () => {
    const r = { kind: 'monthly' as const, dayOfMonth: 31 };
    expect(ruleMatches(r, '2026-01-01', '2026-02-28')).toBe(true);
    expect(ruleMatches(r, '2026-01-01', '2026-04-30')).toBe(true);
    expect(ruleMatches(r, '2026-01-01', '2026-05-30')).toBe(false);
    expect(ruleMatches(r, '2026-01-01', '2026-05-31')).toBe(true);
  });
  it('one-off shows until done, then only on done day', () => {
    const t = { repeat: null, startDate: '2026-11-01', parentId: null } as unknown as Task;
    expect(isDueOn(t, '2026-11-05')).toBe(true);
    expect(isDueOn(t, '2026-11-05', undefined, '2026-11-03')).toBe(false);
    expect(isDueOn(t, '2026-11-03', undefined, '2026-11-03')).toBe(true);
  });
});

describe('due dates', () => {
  const t = (over: Partial<Task>) => ({ repeat: null, parentId: null, startDate: '2026-11-01', dueDate: '2026-11-10', ...over }) as Task;
  it('counts days left and flags overdue only when not done', () => {
    expect(dueStatus(t({}), '2026-11-08', false)).toEqual({ daysLeft: 2, overdue: false });
    expect(dueStatus(t({}), '2026-11-10', false)).toEqual({ daysLeft: 0, overdue: false });
    expect(dueStatus(t({}), '2026-11-11', false)).toEqual({ daysLeft: -1, overdue: true });
    expect(dueStatus(t({}), '2026-11-11', true)?.overdue).toBe(false);
  });
  it('ignores repeating tasks, subtasks and tasks without a due date', () => {
    expect(dueStatus(t({ repeat: { kind: 'daily' } }), '2026-11-11', false)).toBeNull();
    expect(dueStatus(t({ parentId: 'p' }), '2026-11-11', false)).toBeNull();
    expect(dueStatus(t({ dueDate: null }), '2026-11-11', false)).toBeNull();
  });
});

describe('progress', () => {
  const t = (over: Partial<Task>) => ({ repeat: null, parentId: null, misc: false, ...over }) as Task;
  it('misc one-off tasks are left out of progress', () => {
    expect(countsForProgress(t({}))).toBe(true);
    expect(countsForProgress(t({ misc: true }))).toBe(false);
    // misc only applies to one-off tasks
    expect(countsForProgress(t({ misc: true, repeat: { kind: 'daily' } }))).toBe(true);
  });
});

describe('schema upgrade', () => {
  it('v1 tasks get dueDate: null and misc: false', async () => {
    const name = 'upgrade-test-' + Math.random();
    const { default: Dexie } = await import('dexie');
    const v1 = new Dexie(name);
    v1.version(1).stores({ groups: 'id, order', tasks: 'id, groupId, parentId, order', completions: 'id, taskId, date, &[taskId+date]' });
    await v1.table('tasks').add({ id: 'a', title: 'old', parentId: null, groupId: null, order: 0 });
    v1.close();
    const db2 = new ChecklistDB(name);
    expect((await db2.tasks.get('a'))?.dueDate).toBeNull();
    expect((await db2.tasks.get('a'))?.misc).toBe(false);
    db2.close();
  });
});

describe('streaks', () => {
  const mwf = { kind: 'weekdays' as const, days: [1, 3, 5] };
  const start = '2026-11-01';
  it('set-day gaps do not break streak', () => {
    // Mon 16, Wed 18 done; today Thu 19 (not scheduled)
    expect(currentStreak(mwf, start, s('2026-11-16', '2026-11-18'), '2026-11-19')).toBe(2);
  });
  it('missing a scheduled day breaks it', () => {
    // Mon 16 done, Wed 18 missed, today Thu 19
    expect(currentStreak(mwf, start, s('2026-11-16'), '2026-11-19')).toBe(0);
  });
  it('today pending does not drop streak to 0', () => {
    const daily = { kind: 'daily' as const };
    expect(currentStreak(daily, start, s('2026-11-17', '2026-11-18'), '2026-11-19')).toBe(2);
    expect(currentStreak(daily, start, s('2026-11-17', '2026-11-18', '2026-11-19'), '2026-11-19')).toBe(3);
  });
  it('best streak and rate', () => {
    const daily = { kind: 'daily' as const };
    const done = s('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05');
    expect(bestStreak(daily, start, done, '2026-11-06')).toBe(3);
    // scheduled Nov 1..5 (6th pending) = 5, done 4
    expect(completionRate(daily, start, done, '2026-11-06')).toBeCloseTo(0.8);
  });
});

describe('completion / auto-tick', () => {
  let db: ChecklistDB;
  const day = '2026-11-19';
  const mk = (id: string, parentId: string | null, repeat: Task['repeat'] = { kind: 'daily' }): Task => ({
    id, parentId, groupId: null, title: id, description: '', info: '', repeat, startDate: '2026-11-01', dueDate: null, misc: false,
    order: 0, archived: false, createdAt: 0,
  });
  let parent: Task, a: Task, b: Task;

  beforeEach(async () => {
    db = new ChecklistDB('test-' + Math.random());
    parent = mk('p', null);
    a = mk('a', 'p', null);
    b = mk('b', 'p', null);
    await db.tasks.bulkAdd([parent, a, b]);
  });

  const done = async (t: Task, d = day) => !!(await findCompletion(db, t, d));

  it('ticking all subtasks auto-ticks the parent', async () => {
    await toggle(db, a, day);
    expect(await done(parent)).toBe(false);
    await toggle(db, b, day);
    expect(await done(parent)).toBe(true);
  });
  it('unticking a subtask unticks an auto-ticked parent', async () => {
    await toggle(db, a, day);
    await toggle(db, b, day);
    await toggle(db, b, day);
    expect(await done(parent)).toBe(false);
  });
  it('manually ticked parent stays ticked', async () => {
    await toggle(db, parent, day);
    await toggle(db, a, day);
    await toggle(db, a, day);
    expect(await done(parent)).toBe(true);
    expect(await done(b)).toBe(false); // parent tick does not tick subtasks
  });
  it('subtasks follow the parent schedule per day', async () => {
    await toggle(db, a, day);
    expect(await done(a, addDays(day, 1))).toBe(false);
  });
});

describe('dates', () => {
  it('formatShort gives dd.mm.yy', () => {
    expect(formatShort('2026-11-25')).toBe('25.11.26');
    expect(formatShort('2027-01-05')).toBe('05.01.27');
  });
});

describe('reorder', () => {
  it('moveItem moves forward and back without mutating', () => {
    const a = ['a', 'b', 'c', 'd'];
    expect(moveItem(a, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(a, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(a, 1, 1)).toEqual(a);
    expect(moveItem(a, 1, 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(a).toEqual(['a', 'b', 'c', 'd']);
  });
  it('dropTarget passes a row once the dragged edge crosses its middle', () => {
    const even = [0, 60, 120, 180].map((top) => ({ top, height: 50 }));
    expect(dropTarget(1, 0, even)).toBe(1);
    expect(dropTarget(1, 34, even)).toBe(1);
    expect(dropTarget(1, 36, even)).toBe(2);
    expect(dropTarget(1, -200, even)).toBe(0);
    expect(dropTarget(1, 500, even)).toBe(3);
    // Uneven heights: a tall row (an expanded card) needs a longer drag to pass.
    const uneven = [{ top: 0, height: 50 }, { top: 60, height: 200 }, { top: 270, height: 50 }];
    expect(dropTarget(0, 100, uneven)).toBe(0);
    expect(dropTarget(0, 140, uneven)).toBe(1);
    expect(dropTarget(2, -150, uneven)).toBe(1);
    expect(dropTarget(2, -260, uneven)).toBe(0);
  });
  it('placeSubset reorders a selection and leaves the rest in place', () => {
    const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
    expect(placeSubset([a, b, c, d, e], [d, b]).map((t) => t.id)).toEqual(['a', 'd', 'c', 'b', 'e']);
    expect(placeSubset([a, b, c], [a, b, c])).toEqual([a, b, c]);
  });
});
