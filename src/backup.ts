import { db, type Completion, type Group, type Task } from './db';
import { todayStr } from './logic/dates';

const FORMAT = 'checklist-backup';
const VERSION = 2; // v2: tasks have `dueDate`

export interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  groups: Group[];
  tasks: Task[];
  completions: Completion[];
}

export async function exportBackup(): Promise<void> {
  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    groups: await db.groups.toArray(),
    tasks: await db.tasks.toArray(),
    completions: await db.completions.toArray(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const name = `checklist-backup-${todayStr()}.json`;
  const file = new File([blob], name, { type: 'application/json' });

  // On phones, the share sheet is the easiest way to save to Files / Drive.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackup(text: string): Backup {
  const b = JSON.parse(text);
  if (b?.format !== FORMAT || !Array.isArray(b.groups) || !Array.isArray(b.tasks) || !Array.isArray(b.completions)) {
    throw new Error('This file is not a checklist backup.');
  }
  if (b.version > VERSION) throw new Error('This backup is from a newer version of the app.');
  return b as Backup;
}

/** Replaces all data with the backup's contents. */
export async function importBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.groups, db.tasks, db.completions, async () => {
    await Promise.all([db.groups.clear(), db.tasks.clear(), db.completions.clear()]);
    await db.groups.bulkAdd(b.groups);
    await db.tasks.bulkAdd(b.tasks.map((t) => ({ ...t, dueDate: t.dueDate ?? null })));
    await db.completions.bulkAdd(b.completions.map((c) => ({ ...c, auto: !!c.auto })));
  });
}
