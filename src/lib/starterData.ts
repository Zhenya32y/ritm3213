import { Habit, HabitCategory, HabitIconKey, HabitLogMap } from '../types/habit';
import { formatDateKey, getDaysInMonth, getLogKey } from './dateUtils';

export interface StarterHabitTemplate {
  id: string;
  name: string;
  icon: HabitIconKey;
  category: HabitCategory;
  goalPerMonth: number;
  order: number;
}

export const STARTER_HABITS: StarterHabitTemplate[] = [
  { id: 'meditation', name: 'Медитация', icon: 'sparkles', category: 'mindfulness', goalPerMonth: 10, order: 0 },
  { id: 'drink_water', name: 'Пить воду', icon: 'droplet', category: 'health', goalPerMonth: 31, order: 1 },
  { id: 'ten_k_steps', name: '10 000 шагов', icon: 'footprints', category: 'sport', goalPerMonth: 31, order: 2 },
  { id: 'read_book', name: 'Читать книгу', icon: 'book-open', category: 'growth', goalPerMonth: 10, order: 3 },
  { id: 'healthy_food', name: 'Полезное питание', icon: 'apple', category: 'health', goalPerMonth: 31, order: 4 },
  { id: 'workout', name: 'Тренировка', icon: 'dumbbell', category: 'sport', goalPerMonth: 10, order: 5 },
  { id: 'sleep_23', name: 'Сон до 23:00', icon: 'moon', category: 'routine', goalPerMonth: 31, order: 6 },
  { id: 'journaling', name: 'Ведение дневника', icon: 'notebook-pen', category: 'mindfulness', goalPerMonth: 4, order: 7 },
  { id: 'self_care', name: 'Уход за собой', icon: 'heart', category: 'health', goalPerMonth: 15, order: 8 },
  { id: 'no_phone_hour', name: 'Час без телефона', icon: 'smartphone-off', category: 'routine', goalPerMonth: 31, order: 9 },
];

export function createGuestStarterHabits(): Habit[] {
  return STARTER_HABITS.map((item) => ({
    ...item,
    userId: 'guest',
    archived: false,
  }));
}

/**
 * Generates realistic, deterministic completion patterns for the current month and
 * previous 2 months so the tracker, 100% flame bars, streaks, and heatmap look rich immediately.
 */
export function createGuestStarterLogs(habits: Habit[]): HabitLogMap {
  const logs: HabitLogMap = {};
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const curDay = now.getDate();

  // Specific rich day-by-day pattern for the current month (including two 100% flame days!)
  const perfectDays = new Set([Math.max(1, Math.min(10, curDay)), Math.max(2, Math.min(12, curDay))]);

  // Habit-specific consistency rates to create realistic variation (200% down to 16%)
  const consistencyWeights: Record<string, number[]> = {
    meditation: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 22, 25, 27, 30, 31],
    drink_water: [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 18, 19, 20, 22, 30, 31],
    ten_k_steps: [3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 19, 21, 24, 30, 31],
    read_book: [5, 10, 12, 14, 18, 19, 24, 30, 31],
    healthy_food: [6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 19, 24, 31],
    workout: [7, 10, 11, 12, 16, 17, 22, 25, 28, 29, 30, 31],
    sleep_23: [10, 12, 24, 26, 28, 29],
    journaling: [5, 10, 12, 13, 14, 16, 24, 25, 26, 27],
    self_care: [7, 8, 9, 10, 12, 15, 16, 23, 26],
    no_phone_hour: [10, 12, 23, 24, 26],
  };

  // Populate current month up to today (plus keep pattern clean for days <= curDay)
  const daysInCur = getDaysInMonth(curYear, curMonth);
  const maxDay = Math.min(daysInCur, curDay);

  for (const h of habits) {
    const activeDays = new Set(consistencyWeights[h.id] ?? []);
    for (let d = 1; d <= maxDay; d++) {
      if (perfectDays.has(d) || activeDays.has(d)) {
        logs[getLogKey(h.id, formatDateKey(curYear, curMonth, d))] = true;
      }
    }
  }

  // Also seed previous 2 months for multi-month heatmap & history navigation
  for (let mOffset = 1; mOffset <= 2; mOffset++) {
    const target = new Date(curYear, curMonth - mOffset, 1);
    const y = target.getFullYear();
    const m = target.getMonth();
    const totalDays = getDaysInMonth(y, m);
    habits.forEach((h, hIdx) => {
      for (let d = 1; d <= totalDays; d++) {
        // Deterministic pseudo-random pattern weighted by habit index
        const hash = (d * 17 + hIdx * 31 + m * 13) % 10;
        const threshold = hIdx < 4 ? 6 : hIdx < 7 ? 4 : 3;
        if (hash < threshold || d === 9 || d === 18) {
          logs[getLogKey(h.id, formatDateKey(y, m, d))] = true;
        }
      }
    });
  }

  return logs;
}
