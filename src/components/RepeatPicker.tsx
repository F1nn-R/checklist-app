import type { RepeatRule } from '../db';

type Kind = 'none' | RepeatRule['kind'];
const KINDS: [Kind, string][] = [['none', 'Once'], ['daily', 'Daily'], ['weekdays', 'Days'], ['interval', 'Every N'], ['monthly', 'Monthly']];
const DAYS = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']] as const;

export function RepeatPicker({ value, onChange, startDate }: {
  value: RepeatRule | null; onChange: (r: RepeatRule | null) => void; startDate: string;
}) {
  const kind: Kind = value?.kind ?? 'none';
  const pick = (k: Kind) => {
    if (k === kind) return;
    if (k === 'none') onChange(null);
    else if (k === 'daily') onChange({ kind: 'daily' });
    else if (k === 'weekdays') onChange({ kind: 'weekdays', days: [1, 2, 3, 4, 5] });
    else if (k === 'interval') onChange({ kind: 'interval', everyNDays: 2 });
    else onChange({ kind: 'monthly', dayOfMonth: Number(startDate.slice(8, 10)) || 1 });
  };

  return (
    <div>
      <div className="seg" role="radiogroup">
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => pick(k)}>{label}</button>
        ))}
      </div>
      {value?.kind === 'weekdays' && (
        <div className="day-chips">
          {DAYS.map(([d, l]) => {
            const on = value.days.includes(d);
            return (
              <button key={d} type="button" className={on ? 'on' : ''} aria-pressed={on}
                onClick={() => {
                  const days = on ? value.days.filter((x) => x !== d) : [...value.days, d];
                  if (days.length) onChange({ kind: 'weekdays', days });
                }}>{l}</button>
            );
          })}
        </div>
      )}
      {value?.kind === 'interval' && (
        <div className="inline-num">
          Every
          <input className="input" type="number" inputMode="numeric" min={1} max={365} value={value.everyNDays}
            onChange={(e) => onChange({ kind: 'interval', everyNDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })} />
          days, counting from the start date
        </div>
      )}
      {value?.kind === 'monthly' && (
        <div className="inline-num">
          On day
          <input className="input" type="number" inputMode="numeric" min={1} max={31} value={value.dayOfMonth}
            onChange={(e) => onChange({ kind: 'monthly', dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })} />
          of each month
        </div>
      )}
      {value?.kind === 'monthly' && value.dayOfMonth > 28 && <div className="hint">In shorter months this falls on the last day.</div>}
    </div>
  );
}
