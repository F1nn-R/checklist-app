import Dexie, { type EntityTable } from 'dexie';
import type { DateStr } from './logic/dates';

export type RepeatRule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sun … 6 = Sat
  | { kind: 'interval'; everyNDays: number }
  | { kind: 'monthly'; dayOfMonth: number }; // clamps to last day of short months

export interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
  archived: boolean;
}

export interface Task {
  id: string;
  groupId: string | null;
  parentId: string | null; // set => subtask (one level only)
  title: string;
  description: string;
  info: string; // markdown, only shown on the detail screen
  repeat: RepeatRule | null; // null => one-off. Ignored on subtasks (they follow the parent)
  startDate: DateStr;
  order: number;
  archived: boolean;
  createdAt: number;
}

export interface Completion {
  id: string;
  taskId: string;
  date: DateStr; // for one-off tasks this is the day it was done
  completedAt: number;
  auto: boolean; // parent ticked automatically because all subtasks were done
}

export class ChecklistDB extends Dexie {
  groups!: EntityTable<Group, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  completions!: EntityTable<Completion, 'id'>;

  constructor(name = 'checklist') {
    super(name);
    this.version(1).stores({
      groups: 'id, order',
      tasks: 'id, groupId, parentId, order',
      completions: 'id, taskId, date, &[taskId+date]',
    });
  }
}

export const db = new ChecklistDB();

export const newId = () => crypto.randomUUID();
