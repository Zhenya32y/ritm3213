import {
  Habit,
  HabitLogMap,
  MONTHS_GENITIVE_RU,
  WEEK_PALETTES,
  WEEKDAYS_SHORT_RU,
  WeekPalette,
} from '../types/habit';

export interface DayColumn {
  day: number; // 1..31
  dateKey: string; // YYYY-MM-DD
  weekdayIndex: number; // 0 (Mon) .. 6 (Sun)
  weekdayLabel: string; // Пн .. Вс
  weekIndex: number; // 0..4 (1-7, 8-14, 15-21, 22-28, 29-31)
  isToday: boolean;
  isWeekend: boolean;
}

export interface WeekGroup {
  weekIndex: number;
  palette: WeekPalette;
  days: DayColumn[];
  completedCount: number;
  totalPossible: number;
  percent: number;
}

export interface HabitMonthMetrics {
  habitId: string;
  totalCompleted: number;
  bestStreak: number;
  currentStreak: number;
  goal: number;
  progressPercent: number; // can exceed 100%, just like the reference (e.g. 200%, 250%)
  clampedPercent: number; // 0..100 for bar width
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getMonthKey(year: number, monthIndex: number): string {
  return `${year}-${pad2(monthIndex + 1)}`;
}

export function formatDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatTodayLabelRu(): string {
  const now = new Date();
  const weekdayIdx = (now.getDay() + 6) % 7;
  return `${WEEKDAYS_SHORT_RU[weekdayIdx]}, ${now.getDate()} ${MONTHS_GENITIVE_RU[now.getMonth()]}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns DayColumn[] for 1..daysInMonth.
 * Week grouping matches the 5-week spreadsheet layout: days 1-7, 8-14, 15-21, 22-28, 29-31.
 */
export function buildMonthDays(year: number, monthIndex: number): DayColumn[] {
  const totalDays = getDaysInMonth(year, monthIndex);
  const todayKey = getTodayDateKey();
  const days: DayColumn[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(year, monthIndex, d);
    const weekdayIndex = (dt.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const dateKey = formatDateKey(year, monthIndex, d);
    days.push({
      day: d,
      dateKey,
      weekdayIndex,
      weekdayLabel: WEEKDAYS_SHORT_RU[weekdayIndex],
      weekIndex: Math.min(4, Math.floor((d - 1) / 7)),
      isToday: dateKey === todayKey,
      isWeekend: weekdayIndex >= 5,
    });
  }
  return days;
}

/**
 * Builds Monday-first mini-calendar rows (each row has 7 slots: number | null).
 */
export function buildMiniCalendarRows(year: number, monthIndex: number): (number | null)[][] {
  const totalDays = getDaysInMonth(year, monthIndex);
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Mon=0..Sun=6
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function getLogKey(habitId: string, dateKey: string): string {
  return `${habitId}_${dateKey}`;
}

export function computeDailyCompletion(
  day: DayColumn,
  habits: Habit[],
  logMap: HabitLogMap
): { completed: number; total: number; percent: number } {
  const total = habits.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  let completed = 0;
  for (const h of habits) {
    if (logMap[getLogKey(h.id, day.dateKey)]) {
      completed++;
    }
  }
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function computeWeekGroups(
  days: DayColumn[],
  habits: Habit[],
  logMap: HabitLogMap
): WeekGroup[] {
  const grouped: Map<number, DayColumn[]> = new Map();
  for (const d of days) {
    const list = grouped.get(d.weekIndex) ?? [];
    list.push(d);
    grouped.set(d.weekIndex, list);
  }

  const result: WeekGroup[] = [];
  for (let w = 0; w < 5; w++) {
    const wDays = grouped.get(w);
    if (!wDays || wDays.length === 0) continue;
    let completedCount = 0;
    const totalPossible = wDays.length * habits.length;
    for (const d of wDays) {
      for (const h of habits) {
        if (logMap[getLogKey(h.id, d.dateKey)]) {
          completedCount++;
        }
      }
    }
    const percent = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;
    result.push({
      weekIndex: w,
      palette: WEEK_PALETTES[w],
      days: wDays,
      completedCount,
      totalPossible,
      percent,
    });
  }
  return result;
}

export function computeHabitMonthMetrics(
  habit: Habit,
  days: DayColumn[],
  logMap: HabitLogMap
): HabitMonthMetrics {
  let totalCompleted = 0;
  let bestStreak = 0;
  let running = 0;

  for (const d of days) {
    if (logMap[getLogKey(habit.id, d.dateKey)]) {
      totalCompleted++;
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  // Current active streak ending on today (or last day of the month if viewing a past month)
  const todayKey = getTodayDateKey();
  let lastIdx = days.length - 1;
  const todayIdx = days.findIndex((d) => d.dateKey === todayKey);
  if (todayIdx !== -1) {
    lastIdx = todayIdx;
  }
  let currentStreak = 0;
  for (let i = lastIdx; i >= 0; i--) {
    if (logMap[getLogKey(habit.id, days[i].dateKey)]) {
      currentStreak++;
    } else {
      break;
    }
  }

  const goal = Math.max(1, habit.goalPerMonth);
  const progressPercent = Math.round((totalCompleted / goal) * 100);
  const clampedPercent = Math.min(100, progressPercent);

  return {
    habitId: habit.id,
    totalCompleted,
    bestStreak,
    currentStreak,
    goal,
    progressPercent,
    clampedPercent,
  };
}

/**
 * Computes overall monthly completion percentage relative to total habit goals for the month
 * (matching how spreadsheet trackers show overall monthly completion).
 */
export function computeMonthlyOverallPercent(
  habits: Habit[],
  days: DayColumn[],
  logMap: HabitLogMap
): number {
  if (habits.length === 0) return 0;
  let totalCompleted = 0;
  let totalGoal = 0;
  for (const h of habits) {
    totalGoal += Math.max(1, h.goalPerMonth);
    for (const d of days) {
      if (logMap[getLogKey(h.id, d.dateKey)]) {
        totalCompleted++;
      }
    }
  }
  if (totalGoal === 0) return 0;
  return Math.min(100, Math.round((totalCompleted / totalGoal) * 100));
}

export function getProgressColor(percent: number): string {
  if (percent >= 80) return '#76B583'; // Sage green (matches reference)
  if (percent >= 40) return '#F0C869'; // Warm amber (matches reference)
  return '#E58A92'; // Soft rose (matches reference)
}

/**
 * Generates last 16 weeks (112 days) for the annual/multi-month activity heatmap.
 */
export interface HeatmapCell {
  dateKey: string;
  dayOfMonth: number;
  monthIndex: number;
  completed: number;
  total: number;
  percent: number;
  isFuture: boolean;
}

export function buildActivityHeatmap(
  habits: Habit[],
  logMap: HabitLogMap,
  weeksCount = 18
): HeatmapCell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWeekday = (today.getDay() + 6) % 7; // Mon=0 .. Sun=6

  // Find Sunday at the end of current week
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (6 - todayWeekday));

  const startMonday = new Date(endSunday);
  startMonday.setDate(endSunday.getDate() - weeksCount * 7 + 1);

  const columns: HeatmapCell[][] = [];
  const total = habits.length;

  const cursor = new Date(startMonday);
  for (let w = 0; w < weeksCount; w++) {
    const col: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = formatDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      const isFuture = cursor.getTime() > today.getTime();
      let completed = 0;
      if (!isFuture && total > 0) {
        for (const h of habits) {
          if (logMap[getLogKey(h.id, dateKey)]) completed++;
        }
      }
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      col.push({
        dateKey,
        dayOfMonth: cursor.getDate(),
        monthIndex: cursor.getMonth(),
        completed,
        total,
        percent,
        isFuture,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }
  return columns;
}
