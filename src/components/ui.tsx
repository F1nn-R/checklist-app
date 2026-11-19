import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

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
export function ConfirmButton({ children, armedText, onConfirm, className = 'btn danger' }: {
  children: ReactNode; armedText: string; onConfirm: () => void; className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={`${className} ${armed ? 'armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
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
