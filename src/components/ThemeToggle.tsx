import { Moon, Sun } from 'lucide-react';
import type { Theme } from '@/lib/theme';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  const dark = theme === 'dark';
  const label = dark ? 'Увімкнути світлу тему' : 'Увімкнути нічну тему';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={dark}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-indigo-100 backdrop-blur transition hover:bg-white hover:text-indigo-600 dark:bg-night-900/80 dark:text-ice-300/80 dark:ring-night-700 dark:hover:bg-night-800 dark:hover:text-indigo-200"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
