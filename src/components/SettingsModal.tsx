import { useEffect, useState } from 'react';
import { Settings, X, KeyRound, Sparkles, Check, Moon, Sun } from 'lucide-react';
import {
  AI_MODELS,
  getApiKey,
  getDefaultModel,
  getModelName,
  getSelectedModel,
  saveApiKey,
  saveSelectedModel,
} from '@/lib/ai';
import type { Theme } from '@/lib/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'light', label: 'Світла', icon: Sun },
  { value: 'dark', label: 'Нічна', icon: Moon },
];

export function SettingsModal({ open, onClose, theme, onThemeChange }: Props) {
  const [key, setKey] = useState('');
  const [model, setModel] = useState(getSelectedModel);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(getApiKey() ?? '');
      setModel(getSelectedModel());
      setSaved(false);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    saveApiKey(key);
    saveSelectedModel(model);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-indigo-100 animate-[pop_.2s_ease-out] dark:bg-night-900 dark:ring-night-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-ice-100">
                Налаштування
              </h2>
              <p className="text-sm text-slate-700 dark:text-ice-200">
                Підключення OpenRouter AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-ice-300/70 dark:hover:bg-night-800 dark:hover:text-ice-100"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-ice-200">
              <KeyRound className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-night-700 dark:bg-night-850 dark:text-ice-100 dark:focus:border-indigo-400 dark:focus:bg-night-850 dark:focus:ring-indigo-500/20"
            />
            <p className="mt-2 text-xs text-slate-600 dark:text-ice-300/70">
              Зберігається лише у твоєму браузері (localStorage). Без ключа працює
              режим Mock-генерації — застосунок завжди видасть кроки.
            </p>
          </div>

          <div>
            <label
              htmlFor="ai-model"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-ice-200"
            >
              <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Модель OpenRouter
            </label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-night-700 dark:bg-night-850 dark:text-ice-100 dark:focus:border-indigo-400 dark:focus:bg-night-850 dark:focus:ring-indigo-500/20"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (free)
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600 dark:text-ice-300/70">
              {AI_MODELS.find((m) => m.id === model)?.note}. Усі моделі безкоштовні;
              за замовчуванням — {getModelName(getDefaultModel())}.
            </p>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-ice-200">
              <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Тема оформлення
            </span>
            <div role="group" aria-label="Тема оформлення" className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onThemeChange(value)}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-night-700 dark:bg-night-850 dark:text-ice-300/80 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-ice-300/70">
              Застосовується одразу та зберігається у браузері.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[.98] dark:shadow-black/40"
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Збережено
              </span>
            ) : (
              'Зберегти'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);
  return (
    <button
      onClick={() => {
        setHasKey(!!getApiKey());
        onClick();
      }}
      className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-indigo-100 backdrop-blur transition hover:bg-white hover:text-indigo-600 dark:bg-night-900/80 dark:text-ice-300/80 dark:ring-night-700 dark:hover:bg-night-800 dark:hover:text-indigo-200"
      aria-label="Налаштування"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline">Налаштування</span>
      {hasKey && (
        <span className="h-2 w-2 rounded-full bg-emerald-500" title="API ключ задано" />
      )}
    </button>
  );
}
