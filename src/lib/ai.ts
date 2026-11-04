import type {
  ResistanceLevel,
  Step,
  StepAdjustAction,
  StepBlocker,
} from '@/types';

export interface AiModelOption {
  id: string;
  name: string;
  note: string;
  /** Для reasoning-моделей: не витрачати ліміт токенів на «думки». */
  disableReasoning?: boolean;
}

/** Безкоштовні моделі OpenRouter, перевірені через /api/v1/models/{id}/endpoints. */
export const AI_MODELS: AiModelOption[] = [
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5 Lightning',
    note: 'Швидка текстова модель — оптимальна для генерації кроків',
    disableReasoning: true,
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'NVIDIA Nemotron 3.5 Super VL',
    note: 'Мультимодальна (текст + зображення + відео)',
    disableReasoning: true,
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots Studio Dots3-Note Preview',
    note: 'Довгий контекст до 512K токенів',
    disableReasoning: true,
  },
  {
    id: 'xingchen-agi/xing4.0-29b-a4b:free',
    name: 'XingChen Xing4.0 29B A4B',
    note: 'Контекст до 262K токенів',
    disableReasoning: true,
  },
];

const DEFAULT_MODEL = AI_MODELS[0].id;
const STORAGE_KEY = 'microstep_openrouter_key';
const MODEL_STORAGE_KEY = 'microstep_openrouter_model';
const AI_TIMEOUT_MS = 15000;

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getDefaultModel(): string {
  return DEFAULT_MODEL;
}

export function getSelectedModel(): string {
  try {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved && AI_MODELS.some((m) => m.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODEL;
}

export function saveSelectedModel(modelId: string): void {
  try {
    if (AI_MODELS.some((m) => m.id === modelId)) {
      localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    }
  } catch {
    /* ignore */
  }
}

export function getModelName(modelId: string): string {
  return AI_MODELS.find((m) => m.id === modelId)?.name ?? modelId;
}

interface AIStep {
  title: string;
  description: string;
}

interface LevelConfig {
  durationSec: number[];
  promptInstruction: string;
}

const LEVEL_CONFIG: Record<ResistanceLevel, LevelConfig> = {
  light: {
    durationSec: [300, 300, 300],
    promptInstruction:
      'ЛЕГКИЙ ОПІР — людина може більше. Кроки одразу починаються з ДІЙ, а не з підходу чи підготовки. ' +
      'Перший крок — проста конкретна дія (наприклад, «повернути одну річ на місце»). ' +
      'Другий крок — більша дія (наприклад, «прибрати 5 речей з підлоги»). ' +
      'Третій крок — найбільший, об\'ємна дія з кількома частинами (наприклад, «прибрати усе зайве зі столу та розкласти на свої місця»). ' +
      'Описи короткі, ділові, без зайвих емоцій. Легке заохочення в кінці.',
  },
  hard: {
    durationSec: [180, 180, 300],
    promptInstruction:
      'СЕРЕДНІЙ ОПІР — важко рушити. Перший крок — майже символічна дія, щоб просто почати (наприклад, «підійдіть до кімнати» — всього одна дія і найважча частина зроблена). ' +
      'Другий крок — проста конкретна дія, але вже реальна (наприклад, «застеліть ліжко — дві секунди і зовсім інший вигляд»). ' +
      'Третій крок — помірна об\'ємна дія (наприклад, «приберіть усі зайві речі зі столу чи підлоги»). ' +
      'Тепле підбадьорення у кожному описі: «ви молодець!», «ви вже почали!».',
  },
  panic: {
    durationSec: [60, 120, 180],
    promptInstruction:
      'ВИСОКИЙ ОПІР — панічний страх. Кроки ДІЙСНО крихітні, настільки малі що не викликають страху. ' +
      'Перший крок — навіть не дія, а присутність (наприклад, «просто підійдіть до кімнати і постійте біля дверей»). ' +
      'Другий крок — одна проста дія (наприклад, «підійдіть до ліжка і заправте його»). ' +
      'Третій крок — буквально одна річ (наприклад, «одну річ поверніть на своє місце — і ви закінчили на сьогодні»). ' +
      'Тривалість: 1, 2, 3 хвилини (НЕ 5). ' +
      'Заспокійливий, дуже теплий тон: «все буде добре», «дозвольте собі просто постояти», «ви не мусите робити все», «ви впораєтесь».',
  },
};

function buildPrompt(task: string, level: ResistanceLevel): string {
  const cfg = LEVEL_CONFIG[level];
  const durations = cfg.durationSec.map((d) => `${d} сек`).join(', ');

  return `Ти — добрий помічник проти прокрастинації. Користувач відкладає справу: "${task}".

Рівень опору та інструкція: ${cfg.promptInstruction}

Створи РОВНО 3 мікро-кроки з тривалістю ${durations}. КРИТИЧНО ВАЖЛИВО: складність, обсяг і характер кроків МАЮТЬ РІЗНИТИСЯ залежно від рівня опору. ' +
      'Приклад для задачі «Прибирання в кімнаті»:\n' +
      'ЛЕГКИЙ: 1) Повернути одну річ на своє місце  2) Прибрати 5 речей з підлоги  3) Прибрати усе зайве зі столу та розкласти на свої місця\n' +
      'ВАЖКО: 1) Підійдіть до кімнати (просто підійти — і найважче позаду)  2) Застеліть ліжко  3) Приберіть усі зайві речі зі столу чи підлоги\n' +
      'ПАНІКА: 1) Просто підійдіть до кімнати і постійте біля дверей  2) Заправте ліжко  3) Одну річ поверніть на своє місце\n' +
      'Видно різницю? Легкий — одразу діяти. Важко — спочатку підійти. Паніка — просто постояти, потім одну річ. ' +
      'НЕ копіюй приклад дослівно — адаптуй кроки до конкретної справи користувача.

Поверни ТІЛЬКИ валідний JSON без markdown-обгортки у форматі:
{"steps":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}

title — коротка дія (до 50 символів). description — тепле коротке пояснення (до 120 символів). Мовою користувача (українською).`;
}

// ─── Adaptive step adjustment ───────────────────────────────────────────────

const LEVEL_NOTE: Record<ResistanceLevel, string> = {
  light: 'Людина може діяти — кроки конкретні, без зайвих емоцій.',
  hard: 'Людині важко рушити — почни з найпростішої підготовки або присутності.',
  panic:
    'Людина дуже тривожна — кроки максимально крихітні, заспокійливі, без тиску.',
};

const ACTION_INSTRUCTION: Record<StepAdjustAction, string> = {
  'too-big':
    'Крок завеликий. Розбий його на 2–3 послідовні крихітні дії. Кожна має бути меншою за поточний крок і починатися з простої конкретної дії.',
  'no-time':
    'Людина має дуже мало часу. Зроби ОДИН короткий крок до 60 секунд, який зберігає суть поточного кроку.',
  stuck:
    'Людина застрягла і не може почати. Зроби 1–2 крихітні кроки, які знімають саме цю перешкоду.',
};

const BLOCKER_TEXT: Record<StepBlocker, string> = {
  fear: 'страшно, тривожно, хочеться уникати',
  tired: 'немає сил, втома, виснаження',
  unclear: 'незрозуміло, з чого саме почати',
};

const STEPS_COUNT: Record<StepAdjustAction, string> = {
  'too-big': '2 або 3',
  'no-time': 'рівно 1',
  stuck: '1 або 2',
};

function buildAdjustPrompt(
  task: string,
  step: Step,
  level: ResistanceLevel,
  action: StepAdjustAction,
  blocker?: StepBlocker
): string {
  const blockerNote =
    action === 'stuck' && blocker
      ? `\nПричина, чому не виходить: ${BLOCKER_TEXT[blocker]}.`
      : '';

  return `Ти — добрий помічник проти прокрастинації. Загальна справа: "${task}".

Поточний крок: "${step.title}".
Опис: "${step.description}".
Запланована тривалість: ${step.durationSec} сек.
Рівень опору: ${LEVEL_NOTE[level]}${blockerNote}

Що потрібно: ${ACTION_INSTRUCTION[action]}

Поверни ТІЛЬКИ валідний JSON без markdown-обгортки у форматі:
{"steps":[{"title":"...","description":"..."}]}

Кількість кроків: ${STEPS_COUNT[action]}. title — коротка конкретна дія (до 50 символів). description — тепле коротке пояснення (до 120 символів). Мовою користувача (українською). Не повторюй поточний крок дослівно.`;
}

function adjustedDurations(
  action: StepAdjustAction,
  level: ResistanceLevel
): number[] {
  if (action === 'no-time') return [60];
  if (action === 'stuck') return level === 'panic' ? [60, 60] : [60, 90];
  return level === 'panic' ? [60, 60, 90] : [90, 90, 120];
}

function toAdjustedSteps(
  aiSteps: AIStep[],
  step: Step,
  level: ResistanceLevel,
  action: StepAdjustAction
): Step[] {
  const durations = adjustedDurations(action, level);
  return aiSteps.map((s, i) => ({
    id: makeId(),
    title: s.title,
    description: s.description,
    durationSec: Math.max(
      30,
      Math.min(durations[i] ?? durations[durations.length - 1], step.durationSec)
    ),
    done: false,
  }));
}

function shorten(text: string, max = 42): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function mockAdjustedIdeas(
  step: Step,
  action: StepAdjustAction,
  blocker?: StepBlocker
): AIStep[] {
  const title = shorten(step.title);

  if (action === 'too-big') {
    return [
      {
        title: 'Підготуй усе необхідне',
        description: `Для кроку «${title}» — лише підготуй потрібне. Це вже початок, і це зовсім не страшно.`,
      },
      {
        title: 'Зроби першу маленьку дію',
        description: `Почни з найпростішої частини «${title}». Дві хвилини — і ти вже в процесі.`,
      },
      {
        title: 'Продовж ще трохи',
        description: `Зроби ще одну невелику частину «${title}». Ти вже рухаєшся — це головне.`,
      },
    ];
  }

  if (action === 'no-time') {
    return [
      {
        title: 'Зроби найменшу частину',
        description: `Одна дія для «${title}» за одну хвилину. Більше зараз не потрібно.`,
      },
    ];
  }

  if (blocker === 'fear') {
    return [
      {
        title: 'Просто підійди до справи',
        description: `Не роби нічого — лише подивись на «${title}». Страх стає меншим, коли наближаєшся.`,
      },
    ];
  }

  if (blocker === 'tired') {
    return [
      {
        title: 'Зроби одну крихітну дію',
        description: `Навіть без сил — одна маленька дія для «${title}». Більше сьогодні не треба.`,
      },
    ];
  }

  return [
    {
      title: 'Випиши першу дію',
      description: `Не виконуй — просто напиши одним рядком, з чого почнеш «${title}».`,
    },
  ];
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function toSteps(aiSteps: AIStep[], level: ResistanceLevel): Step[] {
  const durations = LEVEL_CONFIG[level].durationSec;
  return aiSteps.map((s, i) => ({
    id: makeId(),
    title: s.title,
    description: s.description,
    durationSec: durations[i] ?? durations[durations.length - 1],
    done: false,
  }));
}

// ─── Mock generators per level ─────────────────────────────────────────────

function mockCleaning(task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: 'Поверни одну річ на своє місце', description: 'Просто одну річ. Це легко і швидко — ти вже почав.' },
      { title: 'Прибери 5 речей з підлоги', description: 'Знайди 5 речей на підлозі і поверни їх на місце. Чітко і конкретно.' },
      { title: 'Майже кінець! Прибери все зайве зі столу', description: 'Прибери все зайве зі столу та розклади на свої місця. Ти молодець — майже все!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Підійдіть до кімнати', description: 'Всього одна дія — і ви вже виконали найважчу частину. Ви молодець!' },
      { title: 'Застеліть ліжко', description: 'Дві секунди і зовсім інший вигляд кімнати! Ви вже робите справу.' },
      { title: 'Приберіть усі зайві речі зі столу чи підлоги', description: 'Збери все зайве. Це вже серйозний крок — ви майже закінчили!' },
    ];
  }
  // panic
  return [
    { title: 'Просто підійдіть до кімнати', description: 'Це лише одна дія. Дозвольте собі просто постояти біля дверей якийсь час. Все буде добре.' },
    { title: 'Заправте ліжко', description: 'Важко, проте це вже великий крок. Ви впораєтесь, обіцяю.' },
    { title: 'Одну річ поверніть на місце', description: 'Остання дія і ви закінчите з цим на сьогодні. Ви молодець!' },
  ];
}

function mockPresentation(task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: 'Напиши заголовок презентації', description: 'Просто напиши заголовок. Це швидко — і скелет вже є.' },
      { title: 'Запиши 3 ключові ідеї для слайдів', description: 'Три головні думки своїми словами. Конкретно і по суті.' },
      { title: 'Майже кінець! Створи перший слайд з текстом', description: 'Створи слайд з заголовком і текстом. Ти молодець — майже готово!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Відкрийте файл для презентації', description: 'Просто відкрийте файл. Нічого не пишете — лише відкрийте. Ви вже почали!' },
      { title: 'Напишіть заголовок', description: 'Одне речення — заголовок. Дві секунди і скелет вже є! Ви молодець.' },
      { title: 'Запишіть 3 ідеї для слайдів', description: 'Три ключові думки своїми словами. Ви вже робите презентацію!' },
    ];
  }
  return [
    { title: 'Просто відкрийте файл', description: 'Це лише одна дія. Дозвольте собі просто подивитись на порожній файл. Все буде добре.' },
    { title: 'Напишіть лише заголовок', description: 'Одне слово — назву. Важко, проте це вже великий крок.' },
    { title: 'Запишіть одну ідею', description: 'Одну думку про що буде слайд. Остання дія і ви закінчите на сьогодні. Ви молодець!' },
  ];
}

function mockHomework(task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: 'Прочитай умову задачі', description: 'Просто прочитай умову. Це швидко — і ти вже знаєш, що робити.' },
      { title: 'Запиши, що дано і що знайти', description: 'Випиши всі дані на аркуш. Конкретно і по суті.' },
      { title: 'Майже кінець! Зроби перші 2-3 дії розв\'язку', description: 'Зроби перші кроки розв\'язку з розрахунками. Ти молодець — майже готово!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Відкрийте зошит і підпишіть дату', description: 'Лише відкрийте зошит і напишіть дату. Ви вже виконали найважчу частину!' },
      { title: 'Прочитайте умову задачі', description: 'Просто повільно прочитайте. Не треба нічого розв\'язувати. Ви молодець!' },
      { title: 'Запишіть, що дано і що знайти', description: 'Випишіть дані задачі. Ви вже в процесі — майже все!' },
    ];
  }
  return [
    { title: 'Просто відкрийте підручник', description: 'Це лише одна дія. Дозвольте собі просто відкрити книжку. Все буде добре.' },
    { title: 'Прочитайте умову задачі', description: 'Лише прочитайте. Важко, проте це вже великий крок. Ви впораєтесь.' },
    { title: 'Запишіть номер задачі у зошит', description: 'Остання дія і ви закінчите на сьогодні. Ви молодець!' },
  ];
}

function mockGeneric(task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: `Зроби першу малу дію для "${task}"`, description: 'Просто одну конкретну дію. Це швидко — і ти вже почав.' },
      { title: `Виконай більшу частину "${task}"`, description: 'Зроби кілька дій підряд. Конкретно і по суті.' },
      { title: `Майже кінець! Заверши основну частину "${task}"`, description: 'Зроби основну частину роботи. Ти молодець — майже все!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: `Підійдіть до "${task}"`, description: 'Просто підійдіть. Всього одна дія — і ви вже виконали найважчу частину!' },
      { title: `Зробіть перший простий крок`, description: 'Один невеликий крок. Ви вже робите справу — ви молодець!' },
      { title: `Виконайте основну частину "${task}"`, description: 'Зробіть помірну частину роботи. Ви вже майже закінчили!' },
    ];
  }
  return [
    { title: `Просто подивіться на "${task}"`, description: 'Це лише одна дія. Дозвольте собі просто постояти поруч. Все буде добре.' },
    { title: `Зробіть одну малесеньку дію`, description: 'Щось зовсім незначне. Важко, проте це вже великий крок.' },
    { title: `Зробіть ще одну малу дію`, description: 'Остання дія і ви закінчите на сьогодні. Ви молодець!' },
  ];
}

export function mockSteps(task: string, level: ResistanceLevel): Step[] {
  const base = task.trim().toLowerCase();
  let steps: AIStep[];
  if (base.includes('прибир')) {
    steps = mockCleaning(task, level);
  } else if (base.includes('презент') || base.includes('істор')) {
    steps = mockPresentation(task, level);
  } else if (base.includes('математ') || base.includes('домашн') || base.includes('завдан')) {
    steps = mockHomework(task, level);
  } else {
    steps = mockGeneric(task, level);
  }
  return toSteps(steps, level);
}

export type FallbackReason = 'no-key' | 'error';

export interface GenerateResult {
  steps: Step[];
  source: 'ai' | 'mock';
  /** Чому використано mock-кроки. Відсутнє, якщо source === 'ai'. */
  fallbackReason?: FallbackReason;
  /** Технічна причина збою — для діагностики, не для показу користувачу. */
  errorDetail?: string;
}

export interface AdjustResult {
  steps: Step[];
  source: 'ai' | 'mock';
  fallbackReason?: FallbackReason;
  errorDetail?: string;
}

interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

async function requestAiSteps(
  messages: AiMessage[],
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<AIStep[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const modelOption = AI_MODELS.find((m) => m.id === model);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'MicroStep AI',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        ...(modelOption?.disableReasoning ? { reasoning: { enabled: false } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    const aiSteps: AIStep[] = parsed.steps;
    if (!Array.isArray(aiSteps) || aiSteps.length === 0) throw new Error('No steps');
    return aiSteps;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function errorDetail(err: unknown): string {
  if (err instanceof Error) {
    return err.name === 'AbortError'
      ? `Таймаут ${AI_TIMEOUT_MS / 1000} с`
      : err.message;
  }
  return String(err);
}

export async function generateSteps(
  task: string,
  level: ResistanceLevel,
  apiKey: string | null,
  model: string = getSelectedModel()
): Promise<GenerateResult> {
  if (!apiKey || !apiKey.trim()) {
    return { steps: mockSteps(task, level), source: 'mock', fallbackReason: 'no-key' };
  }

  try {
    const aiSteps = await requestAiSteps(
      [
        {
          role: 'system',
          content:
            'Ти добрий помічник проти прокрастинації. Завжди повертаєш валідний JSON.',
        },
        { role: 'user', content: buildPrompt(task, level) },
      ],
      apiKey.trim(),
      model,
      700
    );
    return { steps: toSteps(aiSteps.slice(0, 3), level), source: 'ai' };
  } catch (err) {
    // Graceful fallback to mock, але з причиною — щоб UI не вводив в оману
    return {
      steps: mockSteps(task, level),
      source: 'mock',
      fallbackReason: 'error',
      errorDetail: errorDetail(err),
    };
  }
}

export async function adjustStep(
  task: string,
  step: Step,
  level: ResistanceLevel,
  action: StepAdjustAction,
  blocker: StepBlocker | undefined,
  apiKey: string | null,
  model: string = getSelectedModel()
): Promise<AdjustResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      steps: toAdjustedSteps(
        mockAdjustedIdeas(step, action, blocker),
        step,
        level,
        action
      ),
      source: 'mock',
      fallbackReason: 'no-key',
    };
  }

  try {
    const aiSteps = await requestAiSteps(
      [
        {
          role: 'system',
          content:
            'Ти добрий помічник проти прокрастинації. Завжди повертаєш валідний JSON.',
        },
        { role: 'user', content: buildAdjustPrompt(task, step, level, action, blocker) },
      ],
      apiKey.trim(),
      model,
      600
    );
    const limit = action === 'too-big' ? 3 : action === 'stuck' ? 2 : 1;
    const selected = aiSteps.slice(0, limit);
    if (action === 'too-big' && selected.length < 2) {
      throw new Error('AI returned too few steps for split');
    }
    return {
      steps: toAdjustedSteps(selected, step, level, action),
      source: 'ai',
    };
  } catch (err) {
    return {
      steps: toAdjustedSteps(
        mockAdjustedIdeas(step, action, blocker),
        step,
        level,
        action
      ),
      source: 'mock',
      fallbackReason: 'error',
      errorDetail: errorDetail(err),
    };
  }
}
