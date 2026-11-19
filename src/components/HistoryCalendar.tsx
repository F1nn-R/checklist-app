import { useState } from 'react';
import type { RepeatRule } from '../db';
import { daysInMonth, diffDays, toDateStr, type DateStr } from '../logic/dates';
import { ruleMatches } from '../logic/schedule';

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month grid of done / missed / scheduled days. Tap a scheduled past day to fix its history. */
export function HistoryCalendar({ rule, startDate, done, today, onToggle }: {
  rule: RepeatRule; startDate: DateStr; done: Set<DateStr>; today: DateStr; onToggle: (d: DateStr) => void;
}) {
  const [y0, m0] = today.split('-').map(Number);
  const [ym, setYm] = useState({ y: y0, m: m0 - 1 });
  const first = new Date(ym.y, ym.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const n = daysInMonth(ym.y, ym.m);
  const shift = (k: number) => setYm(({ y, m }) => { const d = new Date(y, m + k, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const canPrev = diffDays(startDate, toDateStr(new Date(ym.y, ym.m, 0))) >= 0;
  const canNext = ym.y < y0 || (ym.y === y0 && ym.m < m0 - 1);

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">‹</button>
        <div className="m">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className="icon-btn" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid">
        {WD.map((w, i) => <div key={i} className="wd">{w}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={'x' + i} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = toDateStr(new Date(ym.y, ym.m, i + 1));
          const sched = ruleMatches(rule, startDate, d);
          const future = diffDays(today, d) > 0;
          const isDone = done.has(d);
          const cls = [
            'cal-cell',
            isDone ? 'done' : sched ? (future || d === today ? 'sched' : 'missed') : '',
            d === today ? 'today' : '',
            future ? 'future' : '',
          ].join(' ');
          return (
            <button key={d} className={cls} disabled={!sched || future} onClick={() => onToggle(d)} aria-label={`${d}${isDone ? ' done' : ''}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="cal-legend">
        <span style={{ ['--c' as string]: 'var(--success)' }}>Done</span>
        <span style={{ ['--c' as string]: 'color-mix(in srgb, var(--danger) 40%, var(--surface))' }}>Missed</span>
        <span style={{ ['--c' as string]: 'var(--surface-2)' }}>Scheduled</span>
      </div>
    </div>
  );
}
