export type ResistanceLevel = 'light' | 'hard' | 'panic';

export type StepAdjustAction = 'too-big' | 'no-time' | 'stuck';

export type StepBlocker = 'fear' | 'tired' | 'unclear';

export interface StepOrigin {
  /** Ланцюжок назв кроків, з яких виник цей крок. */
  lineage: string[];
  /** Яка дія привела до цього кроку. */
  action: StepAdjustAction;
  /** Причина, обрана для дії «не виходить». */
  blocker?: StepBlocker;
  source: 'ai' | 'mock';
}

export interface StepTimerState {
  remainingSec: number;
  /** Час завершення таймера (ms). null — таймер на паузі. */
  endsAt: number | null;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  done: boolean;
  /** Збережений стан таймера для відновлення після перезавантаження. */
  timer?: StepTimerState;
  /** Звідки виник крок після подрібнення/адаптації. */
  origin?: StepOrigin;
}

/** Поля кроку, які користувач редагує вручну. */
export interface StepInput {
  title: string;
  description: string;
  durationSec: number;
}

export interface ResistanceOption {
  level: ResistanceLevel;
  emoji: string;
  label: string;
  description: string;
}

export const RESISTANCE_OPTIONS: ResistanceOption[] = [
  {
    level: 'light',
    emoji: '😌',
    label: 'Легкий ступор',
    description: 'Трошки не хочеться, але можу',
  },
  {
    level: 'hard',
    emoji: '😣',
    label: 'Важко почати',
    description: 'Не знаю, з чого почати',
  },
  {
    level: 'panic',
    emoji: '😱',
    label: 'Панічний страх',
    description: 'Зовсім страшно і тягне уникати',
  },
];

export const EXAMPLE_TASKS: string[] = [
  'Прибирання в кімнаті',
  'Презентація з історії',
  'Домашнє завдання з математики',
];
