import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0-100
}

export function ProgressBar({ value }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDisplay(value), 50);
    return () => window.clearTimeout(id);
  }, [value]);

  const rounded = Math.round(display);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Твій прогрес</span>
        <span
          className={`text-lg font-bold tabular-nums transition-colors ${
            rounded === 100 ? 'text-emerald-600' : 'text-indigo-600'
          }`}
        >
          {rounded}%
        </span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            rounded === 100
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
          }`}
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  );
}
