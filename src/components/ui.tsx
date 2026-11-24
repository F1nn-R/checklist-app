import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

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

export function StreakBadge({ n }: { n: number }) {
  return <span className={`streak ${n ? '' : 'zero'}`} title={`${n} streak`}>🔥{n}</span>;
}

/** On/off toggle. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  );
}

/** "⋮" button that opens a small dropdown of actions. */
export function MoreMenu({ items }: { items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="more">
      <button type="button" className="icon-btn" aria-label="More" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
      </button>
      {open && (
        <>
          <div className="more-backdrop" onClick={() => setOpen(false)} />
          <div className="more-menu" role="menu">
            {items.map((it) => (
              <button key={it.label} type="button" role="menuitem" onClick={() => { setOpen(false); it.onSelect(); }}>{it.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
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
      <button className="icon-btn" aria-label="Back" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>
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
  today: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9" />,
  all: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  groups: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
};

export function BottomNav() {
  const items: [string, keyof typeof icons, string][] = [
    ['/', 'today', 'Today'], ['/all', 'all', 'All tasks'], ['/groups', 'groups', 'Groups'], ['/settings', 'settings', 'Settings'],
  ];
  return (
    <nav className="bottom-nav">
      <div className="inner">
        {items.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[icon]}</svg>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Fab({ to }: { to: string }) {
  const nav = useNavigate();
  return <button className="fab" aria-label="New task" onClick={() => nav(to)}>+</button>;
}
