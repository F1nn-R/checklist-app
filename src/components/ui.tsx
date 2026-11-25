import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { createGroup } from '../data';

export function Checkbox({ on, onToggle, disabled, size, round, label }: {
  on: boolean; onToggle: () => void; disabled?: boolean; size?: 'small'; round?: boolean; label: string;
}) {
  return (
    <button
      type="button"
      className={`check ${on ? 'on' : ''} ${size ?? ''} ${round ? 'round' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
    >
      <span className="box">
        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
  );
}

/** Blue flame (an SVG: there is no blue flame emoji). Greyed out when `off`. */
export function Flame({ off, size = 14 }: { off?: boolean; size?: number }) {
  const id = useId();
  return (
    <svg className={`flame ${off ? 'off' : ''}`} width={size} height={size * 1.2} viewBox="0 0 20 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1d5bff" /><stop offset="1" stopColor="#4cc2ff" />
        </linearGradient>
      </defs>
      <path className="outer" fill={`url(#${id})`} d="M10 1c1 4.2 6.8 6.9 6.8 13.3A6.8 6.8 0 0 1 3.2 14.3c0-3.1 1.6-5 3-6.6.3 2 1.2 3.2 2.4 3.6C8.2 7.6 9 4.1 10 1z" />
      <path className="inner" fill="#d6f2ff" d="M10 11.2c.6 2.2 3.4 3.4 3.4 6.4a3.4 3.4 0 0 1-6.8 0c0-1.5.8-2.6 1.6-3.4.2 1 .7 1.6 1.3 1.8-.2-1.7.1-3.4.5-4.8z" />
    </svg>
  );
}

export function StreakBadge({ n }: { n: number }) {
  return <span className={`streak ${n ? '' : 'zero'}`} title={`${n} streak`}><Flame off={!n} />{n}</span>;
}

/** On/off toggle. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  );
}

export const ArchiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18v4H3zM5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" /></svg>
);
export const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></svg>
);

export function BackBar({ title, right }: { title?: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="topbar">
      <button className="glass-btn" aria-label="Back" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <p className="title-sm">{title}</p>
      {right}
    </div>
  );
}

/** Two-tap confirm button (avoids blocking browser dialogs). */
export function ConfirmButton({ children, armedText, onConfirm, className = 'btn danger', label }: {
  children: ReactNode; armedText: ReactNode; onConfirm: () => void; className?: string; label?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" aria-label={label} className={`${className} ${armed ? 'armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? armedText : children}
    </button>
  );
}

const icons = {
  past: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  all: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  archived: <path d="M3 4h18v4H3zM5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" />,
  groups: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
};

/** Closes on Escape and stops the page behind from scrolling while `open`. */
function useOverlay(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);
}

/** Hamburger button that slides a navigation panel in from the right. */
export function SideMenu() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useOverlay(open, close);
  const items: [string, keyof typeof icons, string][] = [
    ['/past', 'past', 'Past days'], ['/all', 'all', 'All tasks'], ['/archived', 'archived', 'Archived'],
    ['/groups', 'groups', 'Groups'], ['/settings', 'settings', 'Settings'],
  ];
  return (
    <>
      <button type="button" className="glass-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={close} />
      <nav className={`drawer glass ${open ? 'open' : ''}`} aria-label="Menu" aria-hidden={!open} inert={!open}>
        <div className="drawer-head">
          <button type="button" className="glass-btn" aria-label="Close menu" onClick={close}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {items.map(([to, icon, label]) => (
          <button key={to} type="button" className="drawer-item" onClick={() => { setOpen(false); nav(to); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[icon]}</svg>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

/** "+" button offering a new task or a new group. */
export function AddButton() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'closed' | 'menu' | 'group'>('closed');
  const [name, setName] = useState('');
  const close = useCallback(() => { setMode('closed'); setName(''); }, []);
  useOverlay(mode !== 'closed', close);

  const addGroup = async () => {
    if (!name.trim()) return;
    await createGroup(name, await db.groups.toArray());
    close();
  };

  return (
    <>
      {mode !== 'closed' && <div className="sheet-backdrop" onClick={close} />}
      {mode === 'menu' && (
        <div className="add-menu glass" role="menu">
          <button type="button" role="menuitem" onClick={() => { close(); nav('/task/new'); }}>New task</button>
          <button type="button" role="menuitem" onClick={() => setMode('group')}>New group</button>
        </div>
      )}
      {mode === 'group' && (
        <form className="sheet glass" onSubmit={(e) => { e.preventDefault(); addGroup(); }}>
          <label htmlFor="new-group" className="sheet-title">New group</label>
          <input id="new-group" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={close}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!name.trim()}>Add</button>
          </div>
        </form>
      )}
      <button className={`fab glass ${mode === 'menu' ? 'open' : ''}`} aria-label={mode === 'menu' ? 'Close' : 'Add'} aria-expanded={mode === 'menu'}
        onClick={() => (mode === 'menu' ? close() : setMode('menu'))}><span>+</span></button>
    </>
  );
}

/** Glass "tube" progress bar. The labels switch colour where the fill passes under them. */
export function ProgressTube({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const labels = <><span>{done}/{total}</span><span>{pct}%</span></>;
  return (
    <div className="tube glass" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${done} of ${total} done`}>
      <div className="tube-fill" style={{ width: `${pct}%` }} />
      <div className="tube-labels">{labels}</div>
      <div className="tube-labels on-fill" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} aria-hidden="true">{labels}</div>
    </div>
  );
}
