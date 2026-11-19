import type { RepeatRule } from '../db';
import { addDays, diffDays, type DateStr } from './dates';
import { ruleMatches } from './schedule';

const MAX_LOOKBACK = 3660; // ~10 years

/** Current streak: consecutive scheduled days completed. If today is scheduled but not done yet, it doesn't break the streak. */
export function currentStreak(rule: RepeatRule | null, startDate: DateStr, done: Set<DateStr>, today: DateStr): number {
  if (!rule) return 0;
  let streak = 0;
  let d = today;
  if (ruleMatches(rule, startDate, d) && !done.has(d)) d = addDays(d, -1); // today still pending
  for (let i = 0; i < MAX_LOOKBACK && diffDays(startDate, d) >= 0; i++, d = addDays(d, -1)) {
    if (!ruleMatches(rule, startDate, d)) continue;
    if (done.has(d)) streak++;
    else break;
  }
  return streak;
}

export function bestStreak(rule: RepeatRule | null, startDate: DateStr, done: Set<DateStr>, today: DateStr): number {
  if (!rule) return 0;
  let best = 0;
  let run = 0;
  for (let d = startDate, i = 0; diffDays(d, today) >= 0 && i < MAX_LOOKBACK * 2; d = addDays(d, 1), i++) {
    if (!ruleMatches(rule, startDate, d)) continue;
    if (done.has(d)) best = Math.max(best, ++run);
    else if (d !== today) run = 0;
  }
  return best;
}

/** Fraction of scheduled days (up to and including today if done, else yesterday) that were completed. */
export function completionRate(rule: RepeatRule | null, startDate: DateStr, done: Set<DateStr>, today: DateStr): number | null {
  if (!rule) return null;
  let scheduled = 0;
  let hit = 0;
  for (let d = startDate, i = 0; diffDays(d, today) >= 0 && i < MAX_LOOKBACK * 2; d = addDays(d, 1), i++) {
    if (!ruleMatches(rule, startDate, d)) continue;
    if (d === today && !done.has(d)) continue;
    scheduled++;
    if (done.has(d)) hit++;
  }
  return scheduled ? hit / scheduled : null;
}
