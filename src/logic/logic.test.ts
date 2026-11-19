import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChecklistDB, type Task } from '../db';
import { addDays } from './dates';
import { isDueOn, ruleMatches } from './schedule';
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
    id, parentId, groupId: null, title: id, description: '', info: '', repeat, startDate: '2026-11-01',
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
