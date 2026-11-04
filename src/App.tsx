import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Brain, RotateCcw, CheckCircle2, Heart } from 'lucide-react';
import { TaskForm } from '@/components/TaskForm';
import { StepCard } from '@/components/StepCard';
import { AddStepCard } from '@/components/AddStepCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Confetti } from '@/components/Confetti';
import { SettingsModal, SettingsButton } from '@/components/SettingsModal';
import { HistoryModal, HistoryButton } from '@/components/HistoryModal';
import { ResumeCard } from '@/components/ResumeCard';
import { generateSteps, adjustStep, getApiKey, getModelName, getSelectedModel } from '@/lib/ai';
import { playFinishFanfare } from '@/lib/sound';
import {
  addHistoryEntry,
  clearStoredSession,
  createSessionId,
  createStepId,
  getStreak,
  loadHistory,
  loadSession,
  removeHistoryEntry,
  saveSession,
  type HistoryEntry,
  type StoredSession,
} from '@/lib/storage';
import type {
  ResistanceLevel,
  Step,
  StepAdjustAction,
  StepBlocker,
  StepInput,
  StepOrigin,
  StepTimerState,
} from '@/types';

type Phase = 'empty' | 'steps';

const MAX_STEPS = 15;

function stepsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'крок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'кроки';
  return 'кроків';
}

function defaultDurationForLevel(level: ResistanceLevel): number {
  if (level === 'panic') return 60;
  if (level === 'hard') return 180;
  return 300;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('empty');
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'mock' | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [finished, setFinished] = useState(false);
  const [level, setLevel] = useState<ResistanceLevel>('hard');
  const [resumeSession, setResumeSession] = useState<StoredSession | null>(() =>
    loadSession()
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adjustingStepId, setAdjustingStepId] = useState<string | null>(null);
  const [adjustNotice, setAdjustNotice] = useState<string | null>(null);
  const adjustingRef = useRef<string | null>(null);
  const celebratedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const recordedSessionRef = useRef<string | null>(null);

  const doneCount = steps.filter((s) => s.done).length;
  const progress = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);
  const streak = useMemo(() => getStreak(history), [history]);
  const prevDoneRef = useRef(
    resumeSession?.steps.filter((s) => s.done).length ?? 0
  );

  const handleGenerate = useCallback(
    async (rawTask: string, lvl: ResistanceLevel) => {
      const t = rawTask.trim();
      if (t.length < 3) {
        setError('Будь ласка, введи назву справи, з якою важко впоратися');
        return;
      }
      setError(null);
      setLoading(true);
      celebratedRef.current = false;
      setFinished(false);
      setAdjustNotice(null);
      setAdjustingStepId(null);
      setLevel(lvl);
      setResumeSession(null);

      const key = getApiKey();
      const model = getSelectedModel();
      const result = await generateSteps(t, lvl, key, model);
      setSteps(result.steps);
      setSource(result.source);
      setUsedModel(model);
      if (result.source === 'mock' && result.fallbackReason === 'error') {
        console.warn('AI generation failed:', result.errorDetail);
        const detail = result.errorDetail ?? '';
        let message =
          'AI не відповів, тому показано базові кроки. Перевірте API-ключ у налаштуваннях або спробуйте ще раз.';
        if (detail.includes('429')) {
          message =
            'Перевищено ліміт запитів OpenRouter або модель тимчасово недоступна. Показано базові кроки — спробуйте пізніше або оберіть іншу модель.';
        } else if (detail.includes('401') || detail.includes('403')) {
          message =
            'API-ключ не прийнято OpenRouter. Перевірте його в налаштуваннях — показано базові кроки.';
        } else if (detail.includes('Таймаут')) {
          message =
            'AI не відповів вчасно. Показано базові кроки — спробуйте ще раз або оберіть іншу модель.';
        }
        setFallbackError(message);
      } else {
        setFallbackError(null);
      }
      setTask(t);
      sessionIdRef.current = createSessionId();
      sessionStartedAtRef.current = Date.now();
      recordedSessionRef.current = null;
      prevDoneRef.current = 0;
      setLoading(false);
      setPhase('steps');
    },
    []
  );

  const toggleDone = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }, []);

  const updateTimer = useCallback((id: string, timer: StepTimerState) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, timer } : s))
    );
  }, []);

  const addStep = useCallback((input: StepInput) => {
    setSteps((prev) =>
      prev.length >= MAX_STEPS
        ? prev
        : [...prev, { id: createStepId(), ...input, done: false }]
    );
  }, []);

  const updateStep = useCallback((id: string, input: StepInput) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const durationChanged = s.durationSec !== input.durationSec;
        if (!durationChanged) {
          return { ...s, title: input.title, description: input.description };
        }
        // Нова тривалість — старий таймер більше не актуальний.
        return { ...s, ...input, timer: undefined };
      })
    );
  }, []);

  const deleteStep = useCallback((id: string) => {
    setSteps((prev) =>
      prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)
    );
  }, []);

  const moveStep = useCallback((id: string, direction: -1 | 1) => {
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const handleAdjust = useCallback(
    async (stepId: string, action: StepAdjustAction, blocker?: StepBlocker) => {
      if (adjustingRef.current) return;
      const step = steps.find((s) => s.id === stepId);
      if (!step || step.done) return;

      const sessionId = sessionIdRef.current;
      adjustingRef.current = stepId;
      setAdjustingStepId(stepId);
      setAdjustNotice(null);

      const result = await adjustStep(
        task,
        step,
        level,
        action,
        blocker,
        getApiKey(),
        getSelectedModel()
      );

      if (sessionIdRef.current !== sessionId) {
        adjustingRef.current = null;
        setAdjustingStepId(null);
        return;
      }

      const origin: StepOrigin = {
        lineage: [...(step.origin?.lineage ?? []), step.title],
        action,
        ...(blocker ? { blocker } : {}),
        source: result.source,
      };
      const derivedSteps = result.steps.map((s) => ({ ...s, origin }));

      setSteps((prev) => {
        const current = prev.find((s) => s.id === stepId);
        if (!current || current.done) return prev;
        return prev.flatMap((s) => (s.id === stepId ? derivedSteps : [s]));
      });

      if (result.source === 'mock' && result.fallbackReason === 'error') {
        const detail = result.errorDetail ?? '';
        let message = 'AI не зміг підлаштувати крок — показано локальний варіант.';
        if (detail.includes('429')) {
          message =
            'AI тимчасово недоступний (ліміт запитів) — крок спрощено локально.';
        } else if (detail.includes('401') || detail.includes('403')) {
          message = 'API-ключ не прийнято — крок спрощено локально.';
        } else if (detail.includes('Таймаут')) {
          message = 'AI не відповів вчасно — крок спрощено локально.';
        }
        setAdjustNotice(message);
      }

      setAdjustingStepId(null);
      adjustingRef.current = null;
    },
    [steps, task, level]
  );

  const handleResume = useCallback(() => {
    if (!resumeSession) return;
    const session = resumeSession;
    const completed =
      session.steps.length > 0 && session.steps.every((s) => s.done);

    sessionIdRef.current = session.id;
    sessionStartedAtRef.current = session.startedAt;
    recordedSessionRef.current = completed ? session.id : null;
    celebratedRef.current = completed;
    prevDoneRef.current = session.steps.filter((s) => s.done).length;

    setTask(session.task);
    setLevel(session.level);
    setSteps(session.steps);
    setSource(session.source);
    setUsedModel(session.usedModel);
    setError(null);
    setFallbackError(null);
    setAdjustNotice(null);
    setAdjustingStepId(null);
    adjustingRef.current = null;
    setFinished(completed);
    setResumeSession(null);
    setPhase('steps');
  }, [resumeSession]);

  const discardResume = useCallback(() => {
    clearStoredSession();
    setResumeSession(null);
  }, []);

  const reset = useCallback(() => {
    clearStoredSession();
    sessionIdRef.current = null;
    sessionStartedAtRef.current = Date.now();
    recordedSessionRef.current = null;
    celebratedRef.current = false;
    prevDoneRef.current = 0;
    setResumeSession(null);
    setLevel('hard');
    setPhase('empty');
    setSteps([]);
    setTask('');
    setError(null);
    setSource(null);
    setUsedModel(null);
    setFallbackError(null);
    setAdjustNotice(null);
    setAdjustingStepId(null);
    adjustingRef.current = null;
    setFinished(false);
  }, []);

  // Зберігаємо поточну сесію після кожної зміни кроків, позначок або таймерів.
  useEffect(() => {
    if (phase !== 'steps' || steps.length === 0) return;
    const id = sessionIdRef.current ?? createSessionId();
    sessionIdRef.current = id;
    saveSession({
      version: 1,
      id,
      task,
      level,
      source: source ?? 'mock',
      usedModel,
      steps,
      startedAt: sessionStartedAtRef.current,
      updatedAt: Date.now(),
    });
  }, [phase, steps, task, level, source, usedModel]);

  // Невелике конфеті за кожен новий виконаний крок.
  useEffect(() => {
    const done = steps.filter((s) => s.done).length;
    if (done > prevDoneRef.current) {
      setConfettiTrigger((c) => c + 1);
    }
    prevDoneRef.current = done;
  }, [steps]);

  // Завершення справи фіксуємо в історії; зняття позначки — прибираємо запис.
  useEffect(() => {
    if (phase !== 'steps' || steps.length === 0) return;
    const id = sessionIdRef.current;
    if (!id) return;
    const allDone = steps.every((s) => s.done);

    if (!allDone) {
      if (recordedSessionRef.current === id) {
        recordedSessionRef.current = null;
        setHistory(removeHistoryEntry(id));
      }
      if (celebratedRef.current) {
        celebratedRef.current = false;
        setFinished(false);
      }
      return;
    }

    if (celebratedRef.current) return;
    celebratedRef.current = true;
    recordedSessionRef.current = id;
    setFinished(true);
    setConfettiTrigger((c) => c + 10000);
    playFinishFanfare();
    setHistory(
      addHistoryEntry({
        id,
        task,
        level,
        source: source ?? 'mock',
        startedAt: sessionStartedAtRef.current,
        completedAt: Date.now(),
        steps: steps.map((s) => ({
          title: s.title,
          durationSec: s.durationSec,
          ...(s.origin ? { origin: s.origin } : {}),
        })),
        totalDurationSec: steps.reduce((sum, s) => sum + s.durationSec, 0),
      })
    );
  }, [phase, steps, task, level, source]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-indigo-50/40 to-emerald-50/30">
      <Confetti trigger={confettiTrigger} />

      <header className="sticky top-0 z-30 border-b border-indigo-100/60 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Brain className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold text-slate-800 sm:text-lg">
                MicroStep AI
              </h1>
              <p className="text-[11px] text-slate-600 sm:text-xs">Мій маленький крок</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HistoryButton onClick={() => setHistoryOpen(true)} streak={streak} />
            <SettingsButton onClick={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {phase === 'empty' && (
          <div className="space-y-6">
            {resumeSession && (
              <ResumeCard
                session={resumeSession}
                onResume={handleResume}
                onDiscard={discardResume}
              />
            )}
            <TaskForm
              onSubmit={handleGenerate}
              onPickExample={(t, lvl) => handleGenerate(t, lvl)}
              loading={loading}
              error={error}
            />
          </div>
        )}

        {phase === 'steps' && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-indigo-100 backdrop-blur sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Ти працюєш над
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                    {task}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {steps.length} {stepsWord(steps.length)} · {doneCount} виконано
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Нова справа</span>
                </button>
              </div>

              <div className="mt-5">
                <ProgressBar value={progress} />
              </div>

              {source && (
                <p className="mt-3 text-xs text-slate-600">
                  {source === 'ai' ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Кроки згенеровано через OpenRouter AI
                      {usedModel && (
                        <span className="text-slate-500"> · {getModelName(usedModel)}</span>
                      )}
                    </span>
                  ) : fallbackError ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Базові кроки: AI недоступний
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Режим Mock-генерації (без API ключа)
                    </span>
                  )}
                </p>
              )}

              {fallbackError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-800 ring-1 ring-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{fallbackError}</span>
                </div>
              )}
            </div>

            {adjustNotice && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-800 ring-1 ring-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{adjustNotice}</span>
              </div>
            )}

            <div className="space-y-3">
              {steps.map((step, i) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={i}
                  done={step.done}
                  onToggleDone={() => toggleDone(step.id)}
                  onTimerChange={(timer) => updateTimer(step.id, timer)}
                  onAdjust={(action, blocker) =>
                    handleAdjust(step.id, action, blocker)
                  }
                  onEdit={(input) => updateStep(step.id, input)}
                  onDelete={() => deleteStep(step.id)}
                  onMoveUp={() => moveStep(step.id, -1)}
                  onMoveDown={() => moveStep(step.id, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < steps.length - 1}
                  canDelete={steps.length > 1}
                  adjusting={adjustingStepId === step.id}
                  adjustDisabled={adjustingStepId !== null}
                />
              ))}

              <AddStepCard
                defaultDurationSec={defaultDurationForLevel(level)}
                currentCount={steps.length}
                maxSteps={MAX_STEPS}
                onAdd={addStep}
              />
            </div>

            {finished && (
              <div className="animate-[pop_.3s_ease-out] rounded-3xl bg-gradient-to-br from-emerald-50 to-indigo-50 p-6 text-center shadow-sm ring-1 ring-emerald-100">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-800">
                  Ти зробив це!
                </h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-700">
                  Крихітні кроки — а велика справа вже рушила. Похвали себе,
                  ти заслужив.
                </p>
                <button
                  onClick={reset}
                  className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 active:scale-[.98]"
                >
                  Взяти нову справу
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-indigo-100/60 bg-white/50 py-5 backdrop-blur">
        <p className="mx-auto flex max-w-2xl items-center justify-center gap-1.5 px-4 text-center text-xs text-slate-600">
          <Heart className="h-3.5 w-3.5 text-rose-500" />
          Маленькі кроки — великі зміни. Будь ласка до себе.
        </p>
      </footer>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={history}
      />
    </div>
  );
}
