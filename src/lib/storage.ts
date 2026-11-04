import type {
  ResistanceLevel,
  Step,
  StepAdjustAction,
  StepBlocker,
  StepOrigin,
} from '@/types';

const SESSION_KEY = 'microstep_session_v1';
const HISTORY_KEY = 'microstep_history_v1';
const HISTORY_LIMIT = 100;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LEVELS: ResistanceLevel[] = ['light', 'hard', 'panic'];
const ADJUST_ACTIONS: StepAdjustAction[] = ['too-big', 'no-time', 'stuck'];
const STEP_BLOCKERS: StepBlocker[] = ['fear', 'tired', 'unclear'];

export interface StoredSession {
  version: 1;
  id: string;
  task: string;
  level: ResistanceLevel;
  source: 'ai' | 'mock';
  usedModel: string | null;
  steps: Step[];
  startedAt: number;
  updatedAt: number;
}

export interface HistoryStep {
  title: string;
  durationSec: number;
  origin?: StepOrigin;
}

export interface HistoryEntry {
  id: string;
  task: string;
  level: ResistanceLevel;
  source: 'ai' | 'mock';
  startedAt: number;
  completedAt: number;
  steps: HistoryStep[];
  totalDurationSec: number;
}

export interface WeekDay {
  key: string;
  date: Date;
  weekday: string;
  dayNum: number;
  count: number;
  isToday: boolean;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isStepOrigin(value: unknown): value is StepOrigin {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    Array.isArray(o.lineage) &&
    o.lineage.every((title) => typeof title === 'string') &&
    ADJUST_ACTIONS.includes(o.action as StepAdjustAction) &&
    (o.source === 'ai' || o.source === 'mock') &&
    (o.blocker === undefined ||
      STEP_BLOCKERS.includes(o.blocker as StepBlocker))
  );
}

function isStep(value: unknown): value is Step {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.id !== 'string' ||
    typeof s.title !== 'string' ||
    typeof s.description !== 'string' ||
    typeof s.durationSec !== 'number' ||
    typeof s.done !== 'boolean'
  ) {
    return false;
  }
  if (s.timer !== undefined) {
    const t = s.timer as Record<string, unknown> | null;
    if (
      !t ||
      typeof t !== 'object' ||
      typeof t.remainingSec !== 'number' ||
      (t.endsAt !== null && typeof t.endsAt !== 'number')
    ) {
      return false;
    }
  }
  if (s.origin !== undefined && !isStepOrigin(s.origin)) return false;
  return true;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.task === 'string' &&
    LEVELS.includes(e.level as ResistanceLevel) &&
    (e.source === 'ai' || e.source === 'mock') &&
    typeof e.startedAt === 'number' &&
    typeof e.completedAt === 'number' &&
    typeof e.totalDurationSec === 'number' &&
    Array.isArray(e.steps) &&
    e.steps.every((s) => {
      if (!s || typeof s !== 'object') return false;
      const hs = s as HistoryStep;
      return (
        typeof hs.title === 'string' &&
        typeof hs.durationSec === 'number' &&
        (hs.origin === undefined || isStepOrigin(hs.origin))
      );
    })
  );
}

export function createSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStepId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSession(): StoredSession | null {
  const store = getStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      parsed.version !== 1 ||
      typeof parsed.id !== 'string' ||
      typeof parsed.task !== 'string' ||
      !LEVELS.includes(parsed.level as ResistanceLevel) ||
      (parsed.source !== 'ai' && parsed.source !== 'mock') ||
      !Array.isArray(parsed.steps) ||
      parsed.steps.length === 0 ||
      !parsed.steps.every(isStep) ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > SESSION_TTL_MS) return null;
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota/storage errors */
  }
}

export function clearStoredSession(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadHistory(): HistoryEntry[] {
  const store = getStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).sort((a, b) => b.completedAt - a.completedAt);
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory().filter((e) => e.id !== entry.id)]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, HISTORY_LIMIT);
  saveHistory(next);
  return next;
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  saveHistory(next);
  return next;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getStreak(entries: HistoryEntry[], now = new Date()): number {
  if (entries.length === 0) return 0;
  const completedDays = new Set(
    entries.map((e) => dayKey(new Date(e.completedAt)))
  );
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!completedDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!completedDays.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (completedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getWeekDays(
  entries: HistoryEntry[],
  now = new Date(),
  count = 7
): WeekDay[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(new Date(entry.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const formatter = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
  const todayKey = dayKey(now);
  const days: WeekDay[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const key = dayKey(date);
    days.push({
      key,
      date,
      weekday: formatter.format(date),
      dayNum: date.getDate(),
      count: counts.get(key) ?? 0,
      isToday: key === todayKey,
    });
  }
  return days;
}

export function getHistoryTotals(entries: HistoryEntry[]): {
  completed: number;
  steps: number;
  minutes: number;
} {
  return {
    completed: entries.length,
    steps: entries.reduce((sum, e) => sum + e.steps.length, 0),
    minutes: Math.round(
      entries.reduce((sum, e) => sum + e.totalDurationSec, 0) / 60
    ),
  };
}
