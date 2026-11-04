import { useEffect, useRef } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  GitBranch,
  History,
  Sparkles,
  X,
} from 'lucide-react';
import { RESISTANCE_OPTIONS } from '@/types';
import {
  getHistoryTotals,
  getStreak,
  getWeekDays,
  type HistoryEntry,
  type WeekDay,
} from '@/lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
}

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
});

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatCompletedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = timeFormatter.format(date);

  if (diffDays === 0) return `Сьогодні, ${time}`;
  if (diffDays === 1) return `Учора, ${time}`;
  return `${dayFormatter.format(date)}, ${time}`;
}

function levelLabel(level: HistoryEntry['level']): string {
  return RESISTANCE_OPTIONS.find((o) => o.level === level)?.label ?? '';
}

function levelEmoji(level: HistoryEntry['level']): string {
  return RESISTANCE_OPTIONS.find((o) => o.level === level)?.emoji ?? '🙂';
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function daysWord(n: number): string {
  return plural(n, 'день', 'дні', 'днів');
}

function WeekCalendar({ days }: { days: WeekDay[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          Останні 7 днів
        </p>
        <p className="text-[11px] text-slate-500">справ завершено</p>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.key}
            className={`flex flex-col items-center rounded-xl px-0.5 py-2 ${
              day.isToday ? 'bg-indigo-100/70 ring-1 ring-indigo-200' : ''
            }`}
            title={`${day.weekday}, ${day.dayNum} — ${day.count} справ`}
          >
            <span
              className={`text-[10px] font-semibold uppercase ${
                day.isToday ? 'text-indigo-700' : 'text-slate-500'
              }`}
            >
              {day.weekday}
            </span>
            <span
              className={`mt-0.5 text-sm font-bold ${
                day.isToday ? 'text-indigo-700' : 'text-slate-700'
              }`}
            >
              {day.dayNum}
            </span>
            <span
              className={`mt-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                day.count > 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {day.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
  accent,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-100">
      <div
        className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${accent}`}
      >
        {icon}
      </div>
      <p className="mt-1.5 text-lg font-bold leading-none text-slate-800">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-slate-600">{label}</p>
    </div>
  );
}

export function HistoryModal({ open, onClose, entries }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totals = getHistoryTotals(entries);
  const streak = getStreak(entries);
  const week = getWeekDays(entries);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="relative flex max-h-[85vh] w-full max-w-lg animate-[pop_.2s_ease-out] flex-col rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-indigo-100 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 id="history-title" className="text-lg font-semibold text-slate-800">
                Твоя історія
              </h2>
              <p className="text-sm text-slate-700">Маленькі кроки, які вже сталися</p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              value={streak}
              label={`${daysWord(streak)} поспіль`}
              icon={<Flame className="h-4 w-4 text-amber-600" />}
              accent="bg-amber-100"
            />
            <StatCard
              value={totals.completed}
              label="справ завершено"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              accent="bg-emerald-100"
            />
            <StatCard
              value={totals.minutes}
              label="хвилин уваги"
              icon={<Clock3 className="h-4 w-4 text-indigo-600" />}
              accent="bg-indigo-100"
            />
          </div>

          <WeekCalendar days={week} />

          {entries.length === 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-emerald-50 p-6 text-center ring-1 ring-indigo-100">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-indigo-500 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Тут поки порожньо
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
                Заверши першу справу — і вона з'явиться тут разом зі стріком та
                календарем активності.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Останні завершені справи
              </p>
              <ul className="space-y-2">
                {entries.map((entry) => {
                  const minutes = Math.max(
                    1,
                    Math.round(entry.totalDurationSec / 60)
                  );
                  return (
                    <li
                      key={entry.id}
                      className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-800">
                            {entry.task}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatCompletedAt(entry.completedAt)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {levelEmoji(entry.level)} {levelLabel(entry.level)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {entry.steps.length}{' '}
                          {plural(entry.steps.length, 'крок', 'кроки', 'кроків')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                          <Clock3 className="h-3 w-3" />
                          {minutes} хв
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {entry.steps.map((step, i) => (
                          <li
                            key={`${entry.id}-${i}`}
                            className="flex gap-1.5 text-[11px] leading-snug text-slate-600"
                          >
                            <span className="text-emerald-500">✓</span>
                            <span className="min-w-0 break-words">{step.title}</span>
                            {step.origin && (
                              <GitBranch
                                className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400"
                                aria-label={`Подрібнено з: ${step.origin.lineage.join(' → ')}`}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HistoryButton({
  onClick,
  streak,
}: {
  onClick: () => void;
  streak: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-indigo-100 backdrop-blur transition hover:bg-white hover:text-indigo-600"
      aria-label={
        streak > 0
          ? `Історія, стрік ${streak} ${daysWord(streak)}`
          : 'Історія завершених справ'
      }
    >
      <History className="h-4 w-4" />
      <span className="hidden sm:inline">Історія</span>
      {streak > 0 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
          <Flame className="h-3 w-3" />
          {streak}
        </span>
      )}
    </button>
  );
}
