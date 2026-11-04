import { CheckCircle2, History, Play, Plus } from 'lucide-react';
import { RESISTANCE_OPTIONS } from '@/types';
import type { StoredSession } from '@/lib/storage';

interface Props {
  session: StoredSession;
  onResume: () => void;
  onDiscard: () => void;
}

export function ResumeCard({ session, onResume, onDiscard }: Props) {
  const done = session.steps.filter((s) => s.done).length;
  const total = session.steps.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const completed = total > 0 && done === total;
  const levelLabel =
    RESISTANCE_OPTIONS.find((o) => o.level === session.level)?.label ?? '';

  return (
    <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-indigo-100 backdrop-blur sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            completed
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-indigo-100 text-indigo-600'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <History className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              completed ? 'text-emerald-600' : 'text-indigo-600'
            }`}
          >
            {completed ? 'Завершена справа' : 'Незавершена справа'}
          </p>
          <h2 className="mt-1 break-words text-lg font-bold text-slate-800">
            {session.task}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {done} з {total} кроків · {progress}% · {levelLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            completed
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-slate-600">
        {completed
          ? 'Справу завершено — вона вже в історії. Можеш відкрити результат або почати нову.'
          : 'Прогрес, позначки та таймери збережено — можеш продовжити з того ж місця.'}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onResume}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[.98]"
        >
          <Play className="h-4 w-4" />
          {completed ? 'Відкрити результат' : 'Продовжити'}
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[.98]"
        >
          <Plus className="h-4 w-4" />
          Нова справа
        </button>
      </div>
    </div>
  );
}
