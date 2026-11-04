import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EXAMPLE_TASKS, RESISTANCE_OPTIONS, type ResistanceLevel } from '@/types';

interface Props {
  onSubmit: (task: string, level: ResistanceLevel) => void;
  onPickExample?: (task: string, level: ResistanceLevel) => void;
  loading: boolean;
  error: string | null;
  initialTask?: string;
}

export function TaskForm({ onSubmit, onPickExample, loading, error, initialTask = '' }: Props) {
  const [task, setTask] = useState(initialTask);
  const [level, setLevel] = useState<ResistanceLevel>('hard');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(task, level);
  };

  const handlePickExample = (t: string) => {
    setTask(t);
    onPickExample?.(t, level);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center px-4 pt-6 pb-2 text-center sm:pt-10">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200/60" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-lavender-200 shadow-inner">
            <Sparkles className="h-9 w-9 text-indigo-500" />
          </div>
        </div>
        <h2 className="mt-6 max-w-md text-2xl font-bold leading-snug text-slate-800 sm:text-3xl">
          Не намагайся зробити все й одразу.
        </h2>
        <p className="mt-2 max-w-md text-base leading-relaxed text-slate-700">
          Назви справу, обери рівень опору — і отримай кроки, підібрані під твій стан.
        </p>
      </div>

      <div className="mx-auto mt-2 max-w-xl rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-indigo-100 backdrop-blur sm:p-7">
        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-5">
          <div>
            <label
              htmlFor="task-input"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Яку справу ти постійно відкладаєш?
            </label>
            <input
              id="task-input"
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Наприклад: Прибирання в кімнаті"
              aria-invalid={!!error}
              aria-describedby={error ? 'task-error' : undefined}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            {error && (
              <p
                id="task-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-rose-500"
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby="resistance-description">
            <legend className="mb-2 block text-sm font-semibold text-slate-700">
              Рівень опору
            </legend>
            <div className="grid grid-cols-3 gap-2.5">
              {RESISTANCE_OPTIONS.map((opt) => {
                const active = level === opt.level;
                return (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setLevel(opt.level)}
                    aria-pressed={active}
                    aria-label={opt.label}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {opt.emoji}
                    </span>
                    <span
                      className={`text-xs font-semibold ${active ? 'text-indigo-700' : 'text-slate-600'}`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p
              id="resistance-description"
              aria-live="polite"
              className="mt-2 text-center text-xs text-slate-600"
            >
              {RESISTANCE_OPTIONS.find((o) => o.level === level)?.description}
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Розбиваю на кроки...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Розбий на кроки
              </>
            )}
          </button>
        </form>

        {onPickExample && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-center text-xs text-slate-600">
              Або спробуй приклад — кроки згенеруються для обраного рівня опору:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {EXAMPLE_TASKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handlePickExample(t)}
                  disabled={loading}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md disabled:opacity-50"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
