import { useState } from 'react';
import { Plus } from 'lucide-react';
import { StepEditor } from '@/components/StepEditor';
import type { StepInput } from '@/types';

interface Props {
  defaultDurationSec: number;
  currentCount: number;
  maxSteps: number;
  onAdd: (input: StepInput) => void;
}

export function AddStepCard({
  defaultDurationSec,
  currentCount,
  maxSteps,
  onAdd,
}: Props) {
  const [open, setOpen] = useState(false);
  const canAdd = currentCount < maxSteps;

  if (!canAdd) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 px-4 py-3 text-center text-xs font-medium text-slate-500">
        Досягнуто максимум — {maxSteps} кроків
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-white/50 px-4 py-4 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50/60 active:scale-[.99]"
      >
        <Plus className="h-4 w-4" />
        Додати крок
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-white p-4 shadow-md sm:p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">
        Новий крок
      </p>
      <StepEditor
        defaultDurationSec={defaultDurationSec}
        submitLabel="Додати крок"
        onSubmit={(input) => {
          onAdd(input);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
