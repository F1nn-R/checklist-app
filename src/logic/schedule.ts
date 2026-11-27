import type { RepeatRule, Task } from '../db';
import { daysInMonth, diffDays, parseDate, type DateStr } from './dates';

export function ruleMatches(rule: RepeatRule, startDate: DateStr, date: DateStr): boolean {
  if (diffDays(startDate, date) < 0) return false;
  switch (rule.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return rule.days.includes(parseDate(date).getDay());
    case 'interval':
      return diffDays(startDate, date) % Math.max(1, rule.everyNDays) === 0;
    case 'monthly': {
      const d = parseDate(date);
      const target = Math.min(rule.dayOfMonth, daysInMonth(d.getFullYear(), d.getMonth()));
      return d.getDate() === target;
    }
  }
}

/** The effective schedule for a task: subtasks use their parent's. */
export function effective(task: Task, parent?: Task): { repeat: RepeatRule | null; startDate: DateStr } {
  if (task.parentId && parent) return { repeat: parent.repeat, startDate: parent.startDate };
  return { repeat: task.repeat, startDate: task.startDate };
}

/**
 * Is this task on the list for `date`?
 * One-off tasks show from their start date until done; once done they show only on the day they were done.
 * `doneOn` = the date a one-off task was completed (if any).
 */
export function isDueOn(task: Task, date: DateStr, parent?: Task, doneOn?: DateStr | null): boolean {
  const { repeat, startDate } = effective(task, parent);
  if (repeat) return ruleMatches(repeat, startDate, date);
  if (doneOn) return doneOn === date;
  return diffDays(startDate, date) >= 0;
}

export function describeRepeat(rule: RepeatRule | null): string {
  if (!rule) return 'One-off';
  switch (rule.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const sorted = [...rule.days].sort();
      if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
      if (sorted.join() === '0,6') return 'Weekends';
      return sorted.map((d) => names[d]).join(', ');
    }
    case 'interval':
      return rule.everyNDays === 1 ? 'Every day' : `Every ${rule.everyNDays} days`;
    case 'monthly':
      return `Monthly on day ${rule.dayOfMonth}`;
  }
}

/**
 * Due-date state for a one-off task, or null if it has none (repeating tasks never have one).
 * `daysLeft` < 0 means overdue; a done task is never overdue.
 */
export function dueStatus(task: Task, today: DateStr, done: boolean): { daysLeft: number; overdue: boolean } | null {
  if (task.repeat || task.parentId || !task.dueDate) return null;
  const daysLeft = diffDays(today, task.dueDate);
  return { daysLeft, overdue: !done && daysLeft < 0 };
}

/** Whether a top-level task counts towards the day's progress bar. Misc. one-off tasks don't. */
export function countsForProgress(task: Task): boolean {
  return !(task.misc && !task.repeat);
}
