import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  GitBranch,
  HelpCircle,
  Loader2,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Scissors,
  TimerOff,
  Trash2,
} from 'lucide-react';
import { useStepTimer, formatTime } from '@/hooks/useStepTimer';
import { StepEditor } from '@/components/StepEditor';
import type {
  Step,
  StepAdjustAction,
  StepBlocker,
  StepInput,
  StepTimerState,
} from '@/types';
import { playChime } from '@/lib/sound';

interface Props {
  step: Step;
  index: number;
  done: boolean;
  onToggleDone: () => void;
  onTimerChange?: (timer: StepTimerState) => void;
  onAdjust: (action: StepAdjustAction, blocker?: StepBlocker) => void;
  onEdit?: (input: StepInput) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canDelete?: boolean;
  adjusting?: boolean;
  adjustDisabled?: boolean;
}

const BLOCKER_OPTIONS: {
  value: StepBlocker;
  emoji: string;
  label: string;
}[] = [
  { value: 'fear', emoji: '😨', label: 'Страшно / тривожно' },
  { value: 'tired', emoji: '😴', label: 'Немає сил' },
  { value: 'unclear', emoji: '🤔', label: 'Не знаю, з чого почати' },
];

const ORIGIN_LABELS: Record<StepAdjustAction, string> = {
  'too-big': 'Подрібнено',
  'no-time': 'Скорочено',
  stuck: 'Адаптовано',
};

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-night-850 dark:text-ice-300/80 dark:ring-night-700 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200 dark:hover:ring-indigo-400/40';

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 dark:text-ice-300/70 ${
        danger
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300'
          : 'hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200'
      }`}
    >
      {children}
    </button>
  );
}

export function StepCard({
  step,
  index,
  done,
  onToggleDone,
  onTimerChange,
  onAdjust,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  canDelete = true,
  adjusting = false,
  adjustDisabled = false,
}: Props) {
  const { remaining, isRunning, toggle, reset, pause } = useStepTimer(
    step.durationSec,
    step.timer,
    onTimerChange
  );
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (done && isRunning) pause();
  }, [done, isRunning, pause]);
  const timeUp = remaining === 0;
  const adjustLocked = adjusting || adjustDisabled;
  const parentTitle =
    step.origin?.lineage[step.origin.lineage.length - 1] ?? '';

  const handleAdjust = (action: StepAdjustAction, blocker?: StepBlocker) => {
    setBlockerOpen(false);
    onAdjust(action, blocker);
  };

  if (editing) {
    return (
      <div className="rounded-2xl border-2 border-indigo-300 bg-white p-4 shadow-md sm:p-5 dark:border-indigo-400/40 dark:bg-night-900">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          Редагування кроку {index + 1}
        </p>
        <StepEditor
          initial={{
            title: step.title,
            description: step.description,
            durationSec: step.durationSec,
          }}
          defaultDurationSec={step.durationSec}
          submitLabel="Зберегти"
          onSubmit={(input) => {
            onEdit?.(input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      aria-busy={adjusting}
      className={`relative overflow-hidden rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300 sm:p-5 dark:bg-night-900 ${
        done
          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-400/40 dark:bg-emerald-500/10'
          : timeUp
            ? 'border-amber-300 ring-2 ring-amber-100 dark:border-amber-400/40 dark:ring-amber-400/20'
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-md dark:border-night-700 dark:hover:border-indigo-400/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            if (!done) {
              onToggleDone();
              playChime();
            } else {
              onToggleDone();
            }
          }}
          disabled={adjusting}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 text-transparent hover:border-indigo-400 dark:border-night-600 dark:hover:border-indigo-400'
          }`}
          aria-label={done ? 'Скасувати виконання' : 'Відзначити зробленим'}
        >
          <Check className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-300'}`}
            >
              Крок {index + 1}
            </span>
            {done && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Готово
              </span>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <ActionButton
                label={`Редагувати крок ${index + 1}`}
                disabled={adjusting}
                onClick={() => {
                  setConfirmDelete(false);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                label={`Перемістити крок ${index + 1} вгору`}
                disabled={!canMoveUp || adjusting}
                onClick={onMoveUp}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                label={`Перемістити крок ${index + 1} вниз`}
                disabled={!canMoveDown || adjusting}
                onClick={onMoveDown}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                label={`Видалити крок ${index + 1}`}
                disabled={!canDelete || adjusting}
                danger
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ActionButton>
            </div>
          </div>
          <h3
            className={`mt-0.5 text-base font-semibold leading-snug ${
              done ? 'text-slate-500 line-through dark:text-ice-300/50' : 'text-slate-900 dark:text-ice-100'
            }`}
          >
            {step.title}
          </h3>
          {step.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-ice-200">
              {step.description}
            </p>
          )}

          {step.origin && (
            <details className="group mt-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-100 dark:bg-night-850 dark:text-ice-300/80 dark:ring-night-700">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-indigo-400 dark:text-indigo-300" />
                <span className="truncate">
                  {ORIGIN_LABELS[step.origin.action]}
                  {parentTitle ? `: «${parentTitle}»` : ''}
                </span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-180 dark:text-ice-300/40" />
              </summary>
              <p className="mt-1.5 break-words leading-relaxed text-slate-500 dark:text-ice-300/60">
                {step.origin.lineage.join(' → ')}
              </p>
              {step.origin.source === 'mock' && (
                <p className="mt-1 text-slate-400 dark:text-ice-300/40">Локальний варіант</p>
              )}
            </details>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={done || timeUp || adjusting}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 ${
            done || timeUp || adjusting
              ? 'cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-night-800 dark:text-ice-300/60'
              : isRunning
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" /> Пауза
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Старт
            </>
          )}
        </button>

        <button
          onClick={reset}
          disabled={done || adjusting}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-ice-300/70 dark:hover:bg-night-800 dark:hover:text-ice-100"
          aria-label="Скинути таймер"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <div
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
            timeUp
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200'
              : isRunning
                ? 'text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-ice-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          {formatTime(remaining)}
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-400/30">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-200">
            Видалити цей крок?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.();
              }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95"
            >
              Видалити
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95 dark:bg-night-850 dark:text-ice-200 dark:ring-night-700 dark:hover:bg-night-800"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {timeUp && !done && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
          Час вийшов! Якщо зробив — відзнач чекбокс. Ні? Тоді продовжимо ще раз.
        </p>
      )}

      {!done && (
        <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-night-700">
          {adjusting ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Підбираю дрібніший крок…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-slate-500 dark:text-ice-300/60">
                  Не йде?
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjust('too-big')}
                  disabled={adjustLocked}
                  className={CHIP_CLASS}
                  title="Розбити крок на 2–3 менші дії"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Завеликий
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust('no-time')}
                  disabled={adjustLocked}
                  className={CHIP_CLASS}
                  title="Зробити крок коротшим — до 1 хвилини"
                >
                  <TimerOff className="h-3.5 w-3.5" />
                  Мало часу
                </button>
                <button
                  type="button"
                  onClick={() => setBlockerOpen((open) => !open)}
                  disabled={adjustLocked}
                  aria-expanded={blockerOpen}
                  className={CHIP_CLASS}
                  title="Підлаштувати крок під причину, чому не виходить"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Не виходить
                </button>
              </div>

              {blockerOpen && (
                <div className="mt-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-night-850 dark:ring-night-700">
                  <p className="text-xs font-semibold text-slate-700 dark:text-ice-200">
                    Що заважає найбільше?
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                    {BLOCKER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleAdjust('stuck', option.value)}
                        disabled={adjustLocked}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-left text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-night-800 dark:text-ice-200 dark:ring-night-700 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200 dark:hover:ring-indigo-400/40"
                      >
                        <span aria-hidden="true">{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockerOpen(false)}
                    className="mt-2 text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-ice-300/60 dark:hover:text-ice-100"
                  >
                    Скасувати
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
