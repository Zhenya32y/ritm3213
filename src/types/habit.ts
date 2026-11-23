export type HabitCategory =
  | 'health'
  | 'sport'
  | 'mindfulness'
  | 'growth'
  | 'routine'
  | 'other';

export type HabitIconKey =
  | 'sparkles'
  | 'droplet'
  | 'footprints'
  | 'book-open'
  | 'apple'
  | 'dumbbell'
  | 'moon'
  | 'notebook-pen'
  | 'heart'
  | 'smartphone-off'
  | 'sun'
  | 'coffee'
  | 'brain'
  | 'music'
  | 'target'
  | 'flame'
  | 'bike'
  | 'leaf';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: HabitIconKey;
  category: HabitCategory;
  goalPerMonth: number;
  order: number;
  archived: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  completed: boolean;
  createdAt?: unknown;
}

/** Map key: `${habitId}_${YYYY-MM-DD}` -> true */
export type HabitLogMap = Record<string, boolean>;

export interface WeekPalette {
  weekIndex: number; // 0..4
  label: string;
  headerBg: string;
  headerText: string;
  markColor: string;
  cellHoverBg: string;
  chartColor: string;
}

export const WEEK_PALETTES: WeekPalette[] = [
  {
    weekIndex: 0,
    label: '1 неделя',
    headerBg: '#FCE7D6',
    headerText: '#6F4726',
    markColor: '#C9844E',
    cellHoverBg: '#FDF3EA',
    chartColor: '#DDA06B',
  },
  {
    weekIndex: 1,
    label: '2 неделя',
    headerBg: '#DCE6F5',
    headerText: '#31496E',
    markColor: '#6084B8',
    cellHoverBg: '#EEF3FA',
    chartColor: '#7A9ED0',
  },
  {
    weekIndex: 2,
    label: '3 неделя',
    headerBg: '#DCECD9',
    headerText: '#325631',
    markColor: '#60985D',
    cellHoverBg: '#EFF7EE',
    chartColor: '#76B583',
  },
  {
    weekIndex: 3,
    label: '4 неделя',
    headerBg: '#E6DCF0',
    headerText: '#4C3663',
    markColor: '#8A6BA8',
    cellHoverBg: '#F4EFF9',
    chartColor: '#A184BE',
  },
  {
    weekIndex: 4,
    label: '5 неделя',
    headerBg: '#F6D8DE',
    headerText: '#753644',
    markColor: '#C76F82',
    cellHoverBg: '#FBEEF1',
    chartColor: '#D6899A',
  },
];

export const CATEGORY_META: Record<
  HabitCategory,
  { label: string; color: string; softBg: string }
> = {
  mindfulness: { label: 'Осознанность', color: '#8A6BA8', softBg: '#EFEAF6' },
  health: { label: 'Здоровье', color: '#60985D', softBg: '#E9F3E8' },
  sport: { label: 'Спорт', color: '#C9844E', softBg: '#FAF0E6' },
  growth: { label: 'Развитие', color: '#6084B8', softBg: '#EBF1FA' },
  routine: { label: 'Режим', color: '#C76F82', softBg: '#F9EBEE' },
  other: { label: 'Другое', color: '#78716C', softBg: '#F2F0EC' },
};

export const ICON_OPTIONS: { key: HabitIconKey; label: string }[] = [
  { key: 'sparkles', label: 'Медитация' },
  { key: 'droplet', label: 'Вода' },
  { key: 'footprints', label: 'Шаги' },
  { key: 'book-open', label: 'Чтение' },
  { key: 'apple', label: 'Питание' },
  { key: 'dumbbell', label: 'Тренировка' },
  { key: 'moon', label: 'Сон' },
  { key: 'notebook-pen', label: 'Дневник' },
  { key: 'heart', label: 'Уход за собой' },
  { key: 'smartphone-off', label: 'Детокс' },
  { key: 'sun', label: 'Утро' },
  { key: 'coffee', label: 'Кофеин' },
  { key: 'brain', label: 'Обучение' },
  { key: 'music', label: 'Творчество' },
  { key: 'target', label: 'Фокус' },
  { key: 'flame', label: 'Энергия' },
  { key: 'bike', label: 'Кардио' },
  { key: 'leaf', label: 'Природа' },
];

export const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const MONTHS_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const WEEKDAYS_SHORT_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
