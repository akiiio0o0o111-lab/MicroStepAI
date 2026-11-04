import { useState } from 'react';
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
  'inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

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
      className={`grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? 'hover:bg-rose-50 hover:text-rose-600'
          : 'hover:bg-indigo-50 hover:text-indigo-600'
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
  const { remaining, isRunning, toggle, reset } = useStepTimer(
    step.durationSec,
    step.timer,
    onTimerChange
  );
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      <div className="rounded-2xl border-2 border-indigo-300 bg-white p-4 shadow-md sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">
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
      className={`relative overflow-hidden rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300 sm:p-5 ${
        done
          ? 'border-emerald-300 bg-emerald-50/60'
          : timeUp
            ? 'border-amber-300 ring-2 ring-amber-100'
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
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
              : 'border-slate-300 text-transparent hover:border-indigo-400'
          }`}
          aria-label={done ? 'Скасувати виконання' : 'Відзначити зробленим'}
        >
          <Check className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold ${done ? 'text-emerald-700' : 'text-indigo-600'}`}
            >
              Крок {index + 1}
            </span>
            {done && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
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
              done ? 'text-slate-500 line-through' : 'text-slate-900'
            }`}
          >
            {step.title}
          </h3>
          {step.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {step.description}
            </p>
          )}

          {step.origin && (
            <details className="group mt-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-100">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="truncate">
                  {ORIGIN_LABELS[step.origin.action]}
                  {parentTitle ? `: «${parentTitle}»` : ''}
                </span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-1.5 break-words leading-relaxed text-slate-500">
                {step.origin.lineage.join(' → ')}
              </p>
              {step.origin.source === 'mock' && (
                <p className="mt-1 text-slate-400">Локальний варіант</p>
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
              ? 'cursor-not-allowed bg-slate-100 text-slate-600'
              : isRunning
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
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
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          aria-label="Скинути таймер"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <div
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
            timeUp
              ? 'bg-amber-100 text-amber-700'
              : isRunning
                ? 'text-indigo-700'
                : 'text-slate-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          {formatTime(remaining)}
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-200">
          <span className="text-xs font-semibold text-rose-700">
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
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {timeUp && !done && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700">
          Час вийшов! Якщо зробив — відзнач чекбокс. Ні? Тоді продовжимо ще раз.
        </p>
      )}

      {!done && (
        <div className="mt-4 border-t border-slate-200/80 pt-3">
          {adjusting ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-700"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Підбираю дрібніший крок…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-slate-500">
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
                <div className="mt-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-700">
                    Що заважає найбільше?
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                    {BLOCKER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleAdjust('stuck', option.value)}
                        disabled={adjustLocked}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-left text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span aria-hidden="true">{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockerOpen(false)}
                    className="mt-2 text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
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
