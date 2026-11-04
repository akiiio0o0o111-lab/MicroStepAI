import { useEffect, useState } from 'react';
import { Settings, X, KeyRound, Sparkles, Check } from 'lucide-react';
import {
  AI_MODELS,
  getApiKey,
  getDefaultModel,
  getModelName,
  getSelectedModel,
  saveApiKey,
  saveSelectedModel,
} from '@/lib/ai';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-indigo-100 animate-[pop_.2s_ease-out]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Налаштування</h2>
              <p className="text-sm text-slate-700">Підключення OpenRouter AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <KeyRound className="h-4 w-4 text-indigo-500" />
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <p className="mt-2 text-xs text-slate-600">
              Зберігається лише у твоєму браузері (localStorage). Без ключа працює
              режим Mock-генерації — застосунок завжди видасть кроки.
            </p>
          </div>

          <div>
            <label
              htmlFor="ai-model"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Модель OpenRouter
            </label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (free)
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600">
              {AI_MODELS.find((m) => m.id === model)?.note}. Усі моделі безкоштовні;
              за замовчуванням — {getModelName(getDefaultModel())}.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[.98]"
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
      className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-indigo-100 backdrop-blur transition hover:bg-white hover:text-indigo-600"
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
