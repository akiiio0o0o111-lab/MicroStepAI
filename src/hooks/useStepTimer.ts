import { useCallback, useEffect, useRef, useState } from 'react';
import type { StepTimerState } from '@/types';

interface TimerState {
  remaining: number;
  isRunning: boolean;
  deadline: number | null;
}

function getInitialState(
  durationSec: number,
  persisted?: StepTimerState
): TimerState {
  if (persisted && typeof persisted.remainingSec === 'number') {
    if (persisted.endsAt) {
      const remaining = Math.max(
        0,
        Math.ceil((persisted.endsAt - Date.now()) / 1000)
      );
      return {
        remaining,
        isRunning: remaining > 0,
        deadline: remaining > 0 ? persisted.endsAt : null,
      };
    }
    const remaining = Math.max(
      0,
      Math.min(durationSec, Math.round(persisted.remainingSec))
    );
    return { remaining, isRunning: false, deadline: null };
  }
  return { remaining: durationSec, isRunning: false, deadline: null };
}

export function useStepTimer(
  durationSec: number,
  persisted?: StepTimerState,
  onChange?: (timer: StepTimerState) => void
) {
  const [state, setState] = useState<TimerState>(() =>
    getInitialState(durationSec, persisted)
  );
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const commit = useCallback((next: TimerState) => {
    stateRef.current = next;
    setState(next);
    onChangeRef.current?.({
      remainingSec: next.remaining,
      endsAt: next.deadline,
    });
  }, []);

  // Якщо користувач змінив тривалість кроку — перезапускаємо таймер
  // з нового значення (але не чіпаємо відновлений таймер при монтуванні).
  const prevDurationRef = useRef(durationSec);
  useEffect(() => {
    if (prevDurationRef.current === durationSec) return;
    prevDurationRef.current = durationSec;
    commit({ remaining: durationSec, isRunning: false, deadline: null });
  }, [durationSec, commit]);

  useEffect(() => {
    if (!state.isRunning || state.deadline == null) return;

    const tick = () => {
      setState((prev) => {
        if (!prev.isRunning || prev.deadline == null) return prev;
        const left = Math.max(
          0,
          Math.ceil((prev.deadline - Date.now()) / 1000)
        );
        if (left <= 0) {
          return { remaining: 0, isRunning: false, deadline: null };
        }
        if (left === prev.remaining) return prev;
        return { ...prev, remaining: left };
      });
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state.isRunning, state.deadline]);

  // Зберігаємо момент, коли таймер природно дійшов до нуля.
  useEffect(() => {
    if (state.remaining === 0 && state.deadline === null) {
      onChangeRef.current?.({ remainingSec: 0, endsAt: null });
    }
  }, [state.remaining, state.deadline]);

  const start = useCallback(() => {
    const prev = stateRef.current;
    if (prev.isRunning || prev.remaining <= 0) return;
    const deadline = Date.now() + prev.remaining * 1000;
    commit({ remaining: prev.remaining, isRunning: true, deadline });
  }, [commit]);

  const pause = useCallback(() => {
    const prev = stateRef.current;
    if (!prev.isRunning) return;
    const remaining = prev.deadline
      ? Math.max(0, Math.ceil((prev.deadline - Date.now()) / 1000))
      : prev.remaining;
    commit({ remaining, isRunning: false, deadline: null });
  }, [commit]);

  const reset = useCallback(() => {
    commit({ remaining: durationSec, isRunning: false, deadline: null });
  }, [commit, durationSec]);

  const toggle = useCallback(() => {
    if (stateRef.current.isRunning) pause();
    else start();
  }, [pause, start]);

  return {
    remaining: state.remaining,
    isRunning: state.isRunning,
    start,
    pause,
    reset,
    toggle,
  };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
