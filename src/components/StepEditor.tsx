import { useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { StepInput } from '@/types';

interface Props {
  initial?: StepInput;
  defaultDurationSec: number;
  submitLabel: string;
  onSubmit: (input: StepInput) => void;
  onCancel: () => void;
}

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 200;

function minutesFromSeconds(sec: number): string {
  const minutes = Math.round((sec / 60) * 10) / 10;
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
}

export function StepEditor({
  initial,
  defaultDurationSec,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const durationId = useId();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [minutes, setMinutes] = useState(
    minutesFromSeconds(initial?.durationSec ?? defaultDurationSec)
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError('Дай кроку коротку назву');
      return;
    }
    if (normalizedTitle.length > TITLE_MAX) {
      setError(`Назва — до ${TITLE_MAX} символів`);
      return;
    }

    const rawMinutes = minutes.replace(',', '.').trim();
    const parsedMinutes = Number(rawMinutes);
    if (
      !rawMinutes ||
      !Number.isFinite(parsedMinutes) ||
      parsedMinutes < 0.5 ||
      parsedMinutes > 120
    ) {
      setError('Тривалість — від 0.5 до 120 хвилин');
      return;
    }

    setError(null);
    onSubmit({
      title: normalizedTitle,
      description: description.trim(),
      durationSec: Math.round(parsedMinutes * 60),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="space-y-3"
    >
      <div>
        <label
          htmlFor={titleId}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Назва кроку
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          maxLength={TITLE_MAX}
          autoFocus
          placeholder="Наприклад: відкрити зошит"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label
          htmlFor={descriptionId}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Опис <span className="font-normal text-slate-500">(необов'язково)</span>
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={2}
          placeholder="Коротке тепле пояснення, навіщо це"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <label
            htmlFor={durationId}
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Хвилин
          </label>
          <input
            id={durationId}
            type="number"
            inputMode="decimal"
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value);
              if (error) setError(null);
            }}
            min={0.5}
            max={120}
            step={0.5}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
          >
            Скасувати
          </button>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-rose-500"
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
}
