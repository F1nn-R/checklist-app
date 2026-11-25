import { useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup, parseBackup, type Backup } from '../backup';
import { useData } from '../data';
import { BackBar, ConfirmButton } from '../components/ui';

export default function Settings() {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const requestPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    setPersisted(!!ok);
    setMsg(ok ? 'Storage is now persistent' : 'The browser declined. Installing the app to your home screen usually helps.');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setMsg((e as Error).message || 'Could not read that file.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const topLevel = data.tasks.filter((t) => !t.parentId).length;
  const doneTotal = [...data.doneDates.values()].reduce((n, s) => n + s.size, 0);

  return (
    <div className="page no-nav">
      <BackBar title="Settings" />

      <div className="section">
        <h2>Backup</h2>
        <div className="card" style={{ padding: 14 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Your data lives only on this device. Export a backup now and then so you never lose your tasks and streaks.
          </p>
          <p className="faint" style={{ fontSize: 13 }}>{data.groups.length} groups · {topLevel} tasks · {doneTotal} completions</p>
          <div className="btn-row">
            <button className="btn primary" onClick={() => exportBackup().catch((e) => setMsg(String(e)))}>Export</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Import…</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {pending && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <p style={{ marginTop: 0 }}>
                Backup from <b>{new Date(pending.exportedAt).toLocaleString()}</b>: {pending.groups.length} groups,{' '}
                {pending.tasks.filter((t) => !t.parentId).length} tasks, {pending.completions.length} completions.
              </p>
              <p className="muted" style={{ fontSize: 14 }}>Importing <b>replaces everything</b> currently in the app.</p>
              <div className="btn-row">
                <button className="btn" onClick={() => setPending(null)}>Cancel</button>
                <ConfirmButton className="btn danger" armedText="Tap again to replace" onConfirm={async () => {
                  await importBackup(pending);
                  setPending(null);
                  setMsg('Backup restored');
                }}>Replace my data</ConfirmButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <h2>Storage</h2>
        <div className="card" style={{ padding: 14 }}>
          <div className="row">
            <div className="spacer">
              <div style={{ fontWeight: 600 }}>Persistent storage</div>
              <div className="faint" style={{ fontSize: 13 }}>
                {persisted == null ? 'Not supported by this browser' : persisted ? 'On: the browser will not clear your data' : 'Off: the browser may clear data if space runs low'}
              </div>
            </div>
            {persisted === false && <button className="btn" onClick={requestPersist}>Enable</button>}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>About</h2>
        <p className="faint" style={{ fontSize: 13 }}>
          Checklist v{__APP_VERSION__} · works offline. To install it, use “Add to Home Screen” from the browser menu (on iPhone, use Safari’s Share menu).
        </p>
      </div>

      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
