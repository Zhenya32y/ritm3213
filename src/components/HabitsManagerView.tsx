import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CATEGORY_META, Habit, HabitLogMap } from '../types/habit';
import { buildMonthDays, computeHabitMonthMetrics, getProgressColor } from '../lib/dateUtils';
import { HabitIcon } from './HabitIcon';

interface HabitsManagerViewProps {
  year: number;
  monthIndex: number;
  habits: Habit[];
  logMap: HabitLogMap;
  totalLogsCount: number;
  onOpenAddModal: () => void;
  onOpenEditModal: (habit: Habit) => void;
  onMoveHabit: (index: number, direction: 'up' | 'down') => void;
  onToggleArchive: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
  onLoadStarterPack: () => void;
  onOpenResetStats: () => void;
}

export const HabitsManagerView: React.FC<HabitsManagerViewProps> = ({
  year,
  monthIndex,
  habits,
  logMap,
  totalLogsCount,
  onOpenAddModal,
  onOpenEditModal,
  onMoveHabit,
  onToggleArchive,
  onDeleteHabit,
  onLoadStarterPack,
  onOpenResetStats,
}) => {
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const days = useMemo(() => buildMonthDays(year, monthIndex), [year, monthIndex]);
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.archived), [habits]);

  const displayed = showArchived ? archivedHabits : activeHabits;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1B18] tracking-tight">
            Управление привычками
          </h1>
          <p className="text-sm text-[#66625A] mt-0.5">
            Настраивайте цели на месяц, порядок строк в таблице и категории
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {totalLogsCount > 0 && (
            <button
              type="button"
              onClick={onOpenResetStats}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#B84A5E] bg-white border border-[#E8CFD4] hover:bg-[#F9EBEE] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить статистику
            </button>
          )}
          {activeHabits.length === 0 && (
            <button
              type="button"
              onClick={onLoadStarterPack}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1B18] bg-white border border-[#E5E2DA] hover:bg-[#F4F2ED] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Загрузить базовый набор (10)
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1C1B18] hover:bg-[#33312C] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Новая привычка
          </button>
        </div>
      </div>

      {/* Segmented switch: Active / Archived */}
      <div className="flex items-center gap-1 p-1 bg-[#F1EFE9] rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setShowArchived(false)}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            !showArchived
              ? 'bg-white text-[#1C1B18] shadow-xs'
              : 'text-[#66625A] hover:text-[#1C1B18]'
          }`}
        >
          Активные ({activeHabits.length})
        </button>
        <button
          type="button"
          onClick={() => setShowArchived(true)}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            showArchived
              ? 'bg-white text-[#1C1B18] shadow-xs'
              : 'text-[#66625A] hover:text-[#1C1B18]'
          }`}
        >
          Архив ({archivedHabits.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E2DA] rounded-xl overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 px-6 text-center text-sm text-[#78746B]">
            {showArchived
              ? 'В архиве пока нет привычек.'
              : 'У вас пока нет активных привычек. Создайте первую, чтобы начать отслеживание.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEAE4] bg-[#FCFBF9] text-[11px] font-semibold uppercase tracking-wider text-[#78746B]">
                  <th className="py-3 px-5">Привычка</th>
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4 text-right">Цель / мес.</th>
                  <th className="py-3 px-4 text-right">Выполнено</th>
                  <th className="py-3 px-4 text-right">Лучшая серия</th>
                  <th className="py-3 px-5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8] text-sm">
                {displayed.map((habit, idx) => {
                  const metrics = computeHabitMonthMetrics(habit, days, logMap);
                  const barColor = getProgressColor(metrics.progressPercent);
                  const isDeleting = pendingDeleteId === habit.id;

                  return (
                    <tr key={habit.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-[#F4F2ED] text-[#4A4740] flex items-center justify-center shrink-0">
                            <HabitIcon icon={habit.icon} className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-medium text-[#1C1B18]">{habit.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#66625A]">
                        {CATEGORY_META[habit.category].label}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-[#2E2C27] tabular-nums">
                        {habit.goalPerMonth} дн.
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <span className="font-mono text-xs text-[#2E2C27] tabular-nums">
                            {metrics.totalCompleted}/{metrics.goal} ({metrics.progressPercent}%)
                          </span>
                          <span className="w-12 h-2 bg-[#F2F0EB] rounded-xs overflow-hidden inline-block">
                            <span
                              style={{
                                width: `${metrics.clampedPercent}%`,
                                backgroundColor: barColor,
                              }}
                              className="block h-full"
                            />
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-[#5C5952] tabular-nums">
                        {metrics.bestStreak} дн.
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {!showArchived && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => onMoveHabit(idx, 'up')}
                                title="Поднять выше"
                                aria-label="Поднять выше"
                                className="p-1.5 rounded text-[#78746B] hover:text-[#1C1B18] hover:bg-[#ECEAE4] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === displayed.length - 1}
                                onClick={() => onMoveHabit(idx, 'down')}
                                title="Опустить ниже"
                                aria-label="Опустить ниже"
                                className="p-1.5 rounded text-[#78746B] hover:text-[#1C1B18] hover:bg-[#ECEAE4] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(habit)}
                            title="Редактировать"
                            aria-label="Редактировать"
                            className="p-1.5 rounded text-[#78746B] hover:text-[#1C1B18] hover:bg-[#ECEAE4] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleArchive(habit)}
                            title={habit.archived ? 'Восстановить' : 'В архив'}
                            aria-label={habit.archived ? 'Восстановить' : 'В архив'}
                            className="p-1.5 rounded text-[#78746B] hover:text-[#1C1B18] hover:bg-[#ECEAE4] cursor-pointer"
                          >
                            {habit.archived ? (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {!isDeleting ? (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(habit.id)}
                              title="Удалить"
                              aria-label="Удалить"
                              className="p-1.5 rounded text-[#9E7880] hover:text-[#B84A5E] hover:bg-[#F9EBEE] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteHabit(habit);
                                  setPendingDeleteId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-white bg-[#B84A5E] rounded hover:bg-[#9E3C4E] cursor-pointer whitespace-nowrap"
                              >
                                Удалить
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="px-1.5 py-1 text-[11px] text-[#66625A] hover:text-[#1C1B18] cursor-pointer"
                              >
                                Отмена
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
