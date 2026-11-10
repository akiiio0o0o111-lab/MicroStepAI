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

/** Модель за замовчуванням — NVIDIA Nemotron 3.5 Super VL (free). */
const DEFAULT_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
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

  return `Ти — обережний помічник проти прокрастинації. Користувач відкладає справу: "${task}".

КРИТИЧНО:
- Використовуй ТІЛЬКИ реальні, загальновживані українські слова. ЗАБОРОНЕНО вигадувати слова, терміни, назви предметів, нісенітницю або випадкові набори літер.
- Кожен крок має стосуватися САМЕ задачі "${task}". ЗАБОРОНЕНО додавати випадкові предмети/дії, яких немає в цій задачі.
- Якщо задача спеціалізована або ризикована (дах, висота, електрика, газ, конструкції, авто, медицина) — давай лише безпечні загальні мікро-кроки: оцінити з безпечного місця, сфотографувати/записати, підготувати інформацію, знайти/звернутися до фахівця. Не вигадуй інструменти, матеріали чи технічні деталі.
- Якщо не впевнений у деталі — напиши просту загальну дію зрозумілою мовою.

Оціни запит:
- Шкідливий/небезпечний/незаконний запит або заподіяння шкоди → ТІЛЬКИ JSON: {"refused":true,"message":"коротке тепле пояснення українською"}.
- Незрозумілий запит без змісту → ТІЛЬКИ JSON: {"refused":true,"message":"Опиши, будь ласка, конкретну безпечну справу, яку хочеш зробити — і я розіб'ю її на маленькі кроки."}.
- Інакше створи рівно 3 реалістичні мікро-кроки.

Рівень опору: ${cfg.promptInstruction}
Тривалість орієнтовно: ${durations}.

Формат відповіді — ТІЛЬКИ валідний JSON без markdown:
{"steps":[{"title":"конкретна дія з дієсловом, до 50 символів","description":"тепле пояснення українською, до 120 символів"},{"title":"...","description":"..."},{"title":"...","description":"..."}]}`;
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
Кроки мають бути конкретними, практичними й безпечними. Не вигадуй неіснуючі слова, випадкові предмети чи небезпечні інструкції; для спеціалізованих/ризикованих робіт (висота, дах, електрика, газ тощо) пропонуй безпечні дії: оцінка з безпечного місця, фото/нотатки, звернення до фахівця. Якщо запит шкідливий/небезпечний, поверни ТІЛЬКИ JSON: {"refused":true,"message":"коротке тепле пояснення українською"}.

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

function mockFloorCleaning(_task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: 'Прибери дрібне з підлоги', description: 'Забери речі, які заважають мити. Швидко і конкретно — ти вже почав.' },
      { title: 'Помий невелику ділянку', description: 'Почни з одного кута або смуги підлоги. Не треба все одразу.' },
      { title: 'Майже кінець! Домий решту', description: 'Пройдися по решті ділянки. Ти молодець — майже готово!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Підготуй те, що потрібно', description: 'Візьми швабру, ганчірку або відро — лише підготовка. Ви вже почали!' },
      { title: 'Помий одну невелику ділянку', description: 'Лише один кут або одна смуга. Це вже справжній прогрес.' },
      { title: 'Зроби ще трохи, якщо є сили', description: 'Продовж ще одну ділянку або зупинись тут. Обидва варіанти — нормально.' },
    ];
  }
  return [
    { title: 'Просто підійди до місця', description: 'Лише підійди туди, де треба помити підлогу. Не роби більше — цього достатньо.' },
    { title: 'Підготуй одну річ', description: 'Візьми швабру або ганчірку. Одна дія — вже великий крок.' },
    { title: 'Протри зовсім маленьку ділянку', description: 'Лише маленький шматочок підлоги. На сьогодні цього достатньо. Ви молодець!' },
  ];
}

function mockCleaning(_task: string, level: ResistanceLevel): AIStep[] {
  if (level === 'light') {
    return [
      { title: 'Поверни одну річ на своє місце', description: 'Просто одну річ. Це легко і швидко — ти вже почав.' },
      { title: 'Прибери 5 речей', description: 'Знайди 5 речей не на місці й поверни їх. Чітко і конкретно.' },
      { title: 'Майже кінець! Наведи лад на одній поверхні', description: 'Стіл, полиця або підлога — одна зона. Ти молодець!' },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Підійди до місця прибирання', description: 'Всього одна дія — і ти вже почав. Це найважча частина.' },
      { title: 'Збери кілька речей у купу', description: 'Не розкладаючи все ідеально — просто зібрати разом. Уже прогрес.' },
      { title: 'Прибери одну невелику зону', description: 'Один кут, одна поверхня або кілька речей на місце. Ти молодець!' },
    ];
  }
  return [
    { title: 'Просто підійди до місця', description: 'Лише підійди туди, де хочеш прибрати. Можна просто постояти. Все добре.' },
    { title: 'Візьми одну річ у руки', description: 'Одна річ — і більше нічого. Це вже крок.' },
    { title: 'Поклади її на місце', description: 'Остання дія на сьогодні. Ти молодець — цього достатньо.' },
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
  const label = shorten(task, 48);
  if (level === 'light') {
    return [
      { title: 'Зроби першу конкретну дію', description: `Почни з найпростішої частини: ${label}. Одна дія — і ти вже в процесі.` },
      { title: 'Продовж кількома діями', description: `Зроби 2–3 невеликі дії для: ${label}. Конкретно і по суті.` },
      { title: 'Заверши основну частину', description: `Зроби головне для: ${label}. Ти молодець — це вже реальний прогрес.` },
    ];
  }
  if (level === 'hard') {
    return [
      { title: 'Підготуйся до першої дії', description: `Лише підготовка для: ${label}. Це вже початок — і найважче позаду.` },
      { title: 'Зроби перший простий крок', description: `Одна невелика дія для: ${label}. Ти вже рухаєшся.` },
      { title: 'Зроби ще одну частину', description: `Невелика, але реальна частина: ${label}. Ти молодець.` },
    ];
  }
  return [
    { title: 'Просто наблизься до справи', description: `Лише опинись поруч із тим, що потрібно для: ${label}. Більше зараз не треба.` },
    { title: 'Зроби одну крихітну дію', description: `Щось зовсім маленьке для: ${label}. Це вже великий крок.` },
    { title: 'Зупинись і похвали себе', description: `На сьогодні достатньо. Ти зробив(-ла) крок у бік: ${label}.` },
  ];
}

export function mockSteps(task: string, level: ResistanceLevel): Step[] {
  const refusal = assessTaskRequest(task);
  if (refusal) {
    return toSteps(
      [
        {
          title: 'Оберіть безпечну справу',
          description: refusal,
        },
      ],
      level
    );
  }
  let steps: AIStep[];
  if (isCleaningTask(task)) {
    steps = isFloorTask(task) ? mockFloorCleaning(task, level) : mockCleaning(task, level);
  } else if (isPresentationTask(task)) {
    steps = mockPresentation(task, level);
  } else if (isHomeworkTask(task)) {
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
  /** М'яка відмова, якщо запит шкідливий або не є безпечною справою для кроків. */
  refusal?: string;
}

export interface AdjustResult {
  steps: Step[];
  source: 'ai' | 'mock';
  fallbackReason?: FallbackReason;
  errorDetail?: string;
  refusal?: string;
}

interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AiStepsResponse = { steps: AIStep[] } | { refused: string };

function normalizeAiSteps(rawSteps: unknown, limit: number): AIStep[] {
  if (!Array.isArray(rawSteps)) return [];
  return rawSteps
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title.trim().slice(0, 80) : '',
      description: typeof s.description === 'string' ? s.description.trim().slice(0, 200) : '',
    }))
    .filter((s) => s.title.length >= 2)
    .slice(0, limit);
}

function stepsLookPlausible(steps: AIStep[], expectedMin: number): boolean {
  if (steps.length < expectedMin) return false;
  const titles = steps.map((s) => s.title.toLowerCase());
  if (new Set(titles).size < Math.min(2, titles.length)) return false;
  return steps.every((s) => /[\p{L}\p{N}]/u.test(s.title));
}

async function requestAiSteps(
  messages: AiMessage[],
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<AiStepsResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const modelOption = AI_MODELS.find((m) => m.id === model);

  const payloadBase = {
    model,
    messages,
    max_tokens: maxTokens,
    ...(modelOption?.disableReasoning ? { reasoning: { enabled: false } } : {}),
  };

  try {
    let res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'MicroStep AI',
      },
      body: JSON.stringify({
        ...payloadBase,
        temperature: 0.2,
        top_p: 0.9,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok && (res.status === 400 || res.status === 422)) {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'MicroStep AI',
        },
        body: JSON.stringify({ ...payloadBase, temperature: 0.2, top_p: 0.9 }),
        signal: controller.signal,
      });
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (typeof window !== 'undefined' && content) {
      console.debug('[MicroStepAI] AI response (truncated):', content.slice(0, 500));
    }
    const trimmed = content.trim();
    let parsed: unknown;
    try {
      parsed = trimmed.startsWith('{') ? JSON.parse(trimmed) : JSON.parse((trimmed.match(/\{[\s\S]*\}/) ?? [])[0] ?? '');
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');
      parsed = JSON.parse(match[0]);
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { refused?: unknown; message?: unknown; steps?: unknown };
      if (obj.refused === true) {
        const message =
          typeof obj.message === 'string' && obj.message.trim()
            ? obj.message.trim()
            : 'Я можу допомогти лише з безпечними, реалістичними справами.';
        return { refused: message };
      }
      const rawSteps = obj.steps;
      const aiSteps = normalizeAiSteps(rawSteps, 3);
      if (aiSteps.length === 0) throw new Error('No valid steps');
      return { steps: aiSteps };
    }
    throw new Error('No valid JSON object');
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

const HARM_ACTION =
  /(зламати|пошкодити|поранити|скалічити|вбити|вбив|суїцид|самогуб|порізати себе|завдати шкоди|підірвати|бомб|отрут|пограбув|пограб|вкрасти|зламати(?!\s+звичк)|підпал|зґвалт|катув)/i;
const SAFETY_CONTEXT =
  /(не\s+|уник|запобіг|захист|безпек|лікув|допомог|перша допомог|що робити якщо|як\s+(не|уник|лікув|допомогти)|після того як|коли вже)/i;

function assessTaskRequest(task: string): string | null {
  const normalized = task.trim();
  if (!normalized) return null;
  if (HARM_ACTION.test(normalized) && !SAFETY_CONTEXT.test(normalized)) {
    return 'Я можу допомогти лише з безпечними справами та звичками. Якщо тобі зараз погано або небезпечно — звернися по підтримку до близьких або спеціалістів.';
  }
  return null;
}

function isCleaningTask(text: string): boolean {
  return /(прибир|помит|підлог|витерти|пил|порозклад|посуд|прибиран|поприбира)/i.test(text);
}

function isFloorTask(text: string): boolean {
  return /(підлог|помести|підмести|вимести|швабр)/i.test(text);
}

function isPresentationTask(text: string): boolean {
  return /(презент|істор|слайд|доповід|виступ)/i.test(text);
}

function isHomeworkTask(text: string): boolean {
  return /(математ|домашн|завдан|задач|вправ|конспект|урок|екзамен)/i.test(text);
}

export async function generateSteps(
  task: string,
  level: ResistanceLevel,
  apiKey: string | null,
  model: string = getSelectedModel()
): Promise<GenerateResult> {
  const refusal = assessTaskRequest(task);
  if (refusal) {
    return { steps: [], source: 'mock', refusal };
  }

  if (!apiKey || !apiKey.trim()) {
    return { steps: mockSteps(task, level), source: 'mock', fallbackReason: 'no-key' };
  }

  try {
    const system = {
      role: 'system' as const,
      content:
        'Ти обережний помічник проти прокрастинації. Допомагаєш лише з безпечними, реалістичними справами. Повертаєш тільки валідний JSON. Використовуй лише реальні загальновживані українські слова; ніколи не вигадуй слова, назви чи випадкові предмети. Ніколи не підміняй слова на схожі за звучанням, але нерелевантні (наприклад, не плутай "крок" і "килим").',
    };
    const baseMessages: AiMessage[] = [system, { role: 'user', content: buildPrompt(task, level) }];
    let response = await requestAiSteps(baseMessages, apiKey.trim(), model, 700);
    if ('refused' in response) {
      return { steps: [], source: 'ai', refusal: response.refused };
    }
    if (stepsLookPlausible(response.steps, 2)) {
      // Перевірка на семантичні галюцинації/підміни слів: просимо модель виправити, якщо є помилки.
      try {
        const checked = await requestAiSteps(
          [
            system,
            {
              role: 'user',
              content:
                `Задача користувача: "${task}". Перевір кроки нижче: кожен крок має стосуватися саме цієї задачі, містити лише реальні загальновживані українські слова, без вигаданих слів і без нерелевантних підмін (не плутати схожі слова). Якщо все добре — поверни їх як є. Якщо є помилки — виправ і поверни 3 правильні кроки.\n\nКроки:\n${JSON.stringify({ steps: response.steps }, null, 2)}\n\nПоверни ТІЛЬКИ JSON: {"steps":[{"title":"...","description":"..."},...]}`,
            },
          ],
          apiKey.trim(),
          model,
          700
        );
        if (!('refused' in checked) && stepsLookPlausible(checked.steps, 2)) {
          response = checked;
        }
      } catch {
        /* ignore verification failure, keep original plausible steps */
      }
    } else {
      response = await requestAiSteps(
        [
          ...baseMessages,
          { role: 'assistant', content: JSON.stringify({ steps: response.steps }) },
          {
            role: 'user',
            content:
              `Попередня відповідь неприйнятна. Перепиши 3 кроки для задачі "${task}": тільки реальні загальновживані українські слова, жодних вигаданих слів/термінів/предметів, жодної нісенітниці, жодних нерелевантних підмін слів. Кроки мають бути конкретними, безпечними і стосуватися саме цієї задачі. Поверни ТІЛЬКИ JSON.`,
          },
        ],
        apiKey.trim(),
        model,
        700
      );
      if ('refused' in response) {
        return { steps: [], source: 'ai', refusal: response.refused };
      }
    }
    if (!stepsLookPlausible(response.steps, 2)) {
      return {
        steps: mockSteps(task, level),
        source: 'mock',
        fallbackReason: 'error',
        errorDetail: 'AI повернув нерелевантні або некоректні кроки',
      };
    }
    return { steps: toSteps(response.steps.slice(0, 3), level), source: 'ai' };
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
  const refusal = assessTaskRequest(task);
  if (refusal) {
    return { steps: [], source: 'mock', refusal };
  }

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
    const response = await requestAiSteps(
      [
        {
          role: 'system',
          content:
            'Ти обережний помічник проти прокрастинації. Допомагаєш лише з безпечними, реалістичними справами. Повертаєш тільки валідний JSON. Використовуй лише реальні загальновживані українські слова; ніколи не вигадуй слова, назви чи випадкові предмети.',
        },
        { role: 'user', content: buildAdjustPrompt(task, step, level, action, blocker) },
      ],
      apiKey.trim(),
      model,
      600
    );
    if ('refused' in response) {
      return { steps: [], source: 'ai', refusal: response.refused };
    }
    const limit = action === 'too-big' ? 3 : action === 'stuck' ? 2 : 1;
    const minNeeded = action === 'too-big' ? 2 : 1;
    const selected = response.steps.slice(0, limit);
    if (!stepsLookPlausible(selected, minNeeded)) {
      throw new Error('AI returned irrelevant steps for adjustment');
    }
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
