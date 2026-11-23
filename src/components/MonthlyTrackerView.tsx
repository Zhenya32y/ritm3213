import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import {
  CATEGORY_META,
  Habit,
  HabitCategory,
  HabitLogMap,
  MONTHS_GENITIVE_RU,
  MONTHS_RU,
  WEEK_PALETTES,
  WEEKDAYS_SHORT_RU,
} from '../types/habit';
import {
  buildMiniCalendarRows,
  buildMonthDays,
  computeDailyCompletion,
  computeHabitMonthMetrics,
  computeMonthlyOverallPercent,
  computeWeekGroups,
  formatTodayLabelRu,
  getLogKey,
  getProgressColor,
  getTodayDateKey,
} from '../lib/dateUtils';
import { HabitIcon } from './HabitIcon';

interface MonthlyTrackerViewProps {
  year: number;
  monthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToToday: () => void;
  habits: Habit[];
  logMap: HabitLogMap;
  loading: boolean;
  onToggleLog: (habitId: string, dateKey: string) => void;
  onInlineGoalChange: (habitId: string, goal: number) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (habit: Habit) => void;
  onLoadStarterPack: () => void;
  onGoToAnalytics: () => void;
}

export const MonthlyTrackerView: React.FC<MonthlyTrackerViewProps> = ({
  year,
  monthIndex,
  onPrevMonth,
  onNextMonth,
  onJumpToToday,
  habits,
  logMap,
  loading,
  onToggleLog,
  onInlineGoalChange,
  onOpenAddModal,
  onOpenEditModal,
  onLoadStarterPack,
  onGoToAnalytics,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HabitCategory | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [editingGoalHabitId, setEditingGoalHabitId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState<string>('');

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const filteredHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
      if (searchQuery.trim() && !h.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [activeHabits, categoryFilter, searchQuery]);

  const days = useMemo(() => buildMonthDays(year, monthIndex), [year, monthIndex]);
  const miniCalRows = useMemo(() => buildMiniCalendarRows(year, monthIndex), [year, monthIndex]);

  // Metrics are computed against filteredHabits when filtered, or activeHabits normally
  const trackedHabits = filteredHabits;

  const dailyStats = useMemo(
    () => days.map((d) => ({ day: d, ...computeDailyCompletion(d, trackedHabits, logMap) })),
    [days, trackedHabits, logMap]
  );

  const weekGroups = useMemo(
    () => computeWeekGroups(days, trackedHabits, logMap),
    [days, trackedHabits, logMap]
  );

  const habitMetricsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeHabitMonthMetrics>>();
    for (const h of trackedHabits) {
      map.set(h.id, computeHabitMonthMetrics(h, days, logMap));
    }
    return map;
  }, [trackedHabits, days, logMap]);

  const monthlyOverallPercent = useMemo(
    () => computeMonthlyOverallPercent(trackedHabits, days, logMap),
    [trackedHabits, days, logMap]
  );

  const todayKey = getTodayDateKey();
  const todayCompletedCount = useMemo(() => {
    let count = 0;
    for (const h of activeHabits) {
      if (logMap[getLogKey(h.id, todayKey)]) count++;
    }
    return count;
  }, [activeHabits, logMap, todayKey]);

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex;
  const totalCompletionsInMonth = useMemo(() => {
    let sum = 0;
    habitMetricsMap.forEach((m) => {
      sum += m.totalCompleted;
    });
    return sum;
  }, [habitMetricsMap]);

  const perfectDaysCount = useMemo(
    () => dailyStats.filter((d) => d.total > 0 && d.percent === 100).length,
    [dailyStats]
  );

  const startEditingGoal = (habit: Habit) => {
    setEditingGoalHabitId(habit.id);
    setEditingGoalValue(String(habit.goalPerMonth));
  };

  const commitGoalEdit = (habitId: string) => {
    const parsed = Math.round(Number(editingGoalValue));
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 31) {
      onInlineGoalChange(habitId, parsed);
    }
    setEditingGoalHabitId(null);
  };

  const activeHighlightDay = hoveredDay ?? selectedDay;

  // CSS grid template synchronized across top chart, weekly bands, and daily matrix
  const gridColsStyle: React.CSSProperties = {
    gridTemplateColumns: `192px 48px repeat(${days.length}, minmax(26px, 1fr)) 52px 48px 66px 132px`,
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E5E2DA] rounded-xl p-6 space-y-4">
        <div className="h-32 bg-[#F4F2ED] rounded-lg animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-[#F7F5F0] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Workspace Toolbar: Search & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C877C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск привычки..."
              aria-label="Поиск привычки"
              className="pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E5E2DA] rounded-lg text-[#1C1B18] placeholder:text-[#9E998E] focus:outline-none focus:border-[#1C1B18] w-48 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C877C] hover:text-[#1C1B18] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-0.5 p-0.5 bg-[#F1EFE9] rounded-lg overflow-x-auto max-w-full"
            role="tablist"
            aria-label="Фильтр по категориям"
          >
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white text-[#1C1B18] shadow-xs'
                  : 'text-[#66625A] hover:text-[#1C1B18]'
              }`}
            >
              Все
            </button>
            {(Object.keys(CATEGORY_META) as HabitCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-[#1C1B18] shadow-xs'
                    : 'text-[#66625A] hover:text-[#1C1B18]'
                }`}
              >
                {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#66625A] tabular-nums">
          <span>
            Отметок за месяц: <strong className="text-[#1C1B18] font-semibold">{totalCompletionsInMonth}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Идеальных дней: <strong className="text-[#4F8B5D] font-semibold">{perfectDaysCount}</strong>
          </span>
          <button
            type="button"
            onClick={onGoToAnalytics}
            className="inline-flex items-center gap-1.5 text-[#1C1B18] font-medium hover:underline cursor-pointer whitespace-nowrap"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Все графики
          </button>
        </div>
      </div>

      {/* Main Spreadsheet-Inspired Monthly Sheet Canvas */}
      <section
        aria-label="Ежемесячная сетка привычек"
        className="bg-white border border-[#E5E2DA] rounded-xl overflow-hidden"
      >
        {activeHabits.length === 0 ? (
          <div className="py-20 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[#F4F2ED] text-[#4A4740] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-[#1C1B18] mb-2">
              Ваш трекер привычек пока пуст
            </h2>
            <p className="text-sm text-[#66625A] leading-relaxed mb-6">
              Добавьте первую привычку вручную или загрузите базовый набор из 10 популярных
              ежедневных привычек, чтобы сразу начать отмечать прогресс.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1C1B18] hover:bg-[#33312C] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Добавить привычку
              </button>
              <button
                type="button"
                onClick={onLoadStarterPack}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1C1B18] bg-[#F4F2ED] hover:bg-[#EAE7DF] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Загрузить базовый набор (10)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto tracker-scroll">
            <div className="min-w-[1260px] p-5 pb-4">
              {/* TOP HERO BAND: Title/Month | Aligned Daily Vertical Bar Chart | Mini Calendar */}
              <div className="grid items-end pb-3" style={gridColsStyle}>
                {/* Zone 1: Title & Month Navigation (spans Habit + Goal = 2 cols) */}
                <div className="col-span-2 pr-4 self-start pt-1">
                  <h1 className="text-sm font-bold tracking-[0.06em] text-[#2E2C27] uppercase">
                    Трекер привычек
                  </h1>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={onPrevMonth}
                      aria-label="Предыдущий месяц"
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-[#E5E2DA] text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#FAF9F6] transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-1.5 text-center min-w-[126px]">
                      <span className="text-sm font-semibold text-[#1C1B18] whitespace-nowrap tabular-nums">
                        {MONTHS_RU[monthIndex]} {year}
                      </span>
                      <span className="text-sm text-[#8C877C] mx-1">·</span>
                      <span className="text-sm font-mono font-semibold text-[#4F8B5D] tabular-nums">
                        {monthlyOverallPercent}%
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onNextMonth}
                      aria-label="Следующий месяц"
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-[#E5E2DA] text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#FAF9F6] transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[#78746B]">
                    {!isCurrentMonth && (
                      <button
                        type="button"
                        onClick={onJumpToToday}
                        className="text-[#1C1B18] font-medium underline underline-offset-2 hover:text-[#4F8B5D] cursor-pointer"
                      >
                        Вернуться к сегодня
                      </button>
                    )}
                    {selectedDay !== null && (
                      <button
                        type="button"
                        onClick={() => setSelectedDay(null)}
                        className="text-[#8C877C] hover:text-[#1C1B18] cursor-pointer"
                      >
                        Сбросить день ({selectedDay})
                      </button>
                    )}
                  </div>

                  {/* Active hovered/selected day readout */}
                  <div className="mt-4 text-xs text-[#66625A] min-h-[32px]">
                    {activeHighlightDay !== null ? (
                      (() => {
                        const st = dailyStats[activeHighlightDay - 1];
                        if (!st) return null;
                        return (
                          <div className="tabular-nums">
                            <div className="font-medium text-[#1C1B18]">
                              {st.day.day} {MONTHS_GENITIVE_RU[monthIndex]}, {st.day.weekdayLabel}
                            </div>
                            <div className="text-[#78746B]">
                              Выполнено {st.completed} из {st.total} ({st.percent}%)
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-[#9E998E] leading-snug">
                        Нажмите на ячейку дня, чтобы отметить выполнение привычки
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone 2: Aligned Daily Bar Chart (1 column per day, aligned 1:1 with matrix below!) */}
                {dailyStats.map(({ day, completed, total, percent }) => {
                  const isPerfect = total > 0 && percent === 100;
                  const isHighlighted = activeHighlightDay === day.day;
                  const barHeightPx = Math.max(percent > 0 ? 4 : 2, Math.round((percent / 100) * 110));

                  return (
                    <div
                      key={day.dateKey}
                      onMouseEnter={() => setHoveredDay(day.day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() =>
                        setSelectedDay((prev) => (prev === day.day ? null : day.day))
                      }
                      title={`${day.day} ${MONTHS_GENITIVE_RU[monthIndex]}: ${completed} из ${total} (${percent}%)`}
                      className={`flex flex-col items-center justify-end cursor-pointer select-none px-[2px] rounded-t transition-colors ${
                        isHighlighted ? 'bg-[#FAF7F2]' : ''
                      }`}
                    >
                      {/* Flame marker on 100% days */}
                      <div className="h-5 flex items-center justify-center">
                        {isPerfect && (
                          <Flame
                            className="w-3.5 h-3.5 text-[#D95B7A] fill-[#F4A5B8]"
                            aria-label="100% идеальный день"
                          />
                        )}
                      </div>

                      {/* Bar Track */}
                      <div className="h-[112px] w-full flex items-end justify-center">
                        <div
                          style={{
                            height: `${barHeightPx}px`,
                            backgroundColor:
                              percent === 0
                                ? '#ECEAE4'
                                : isPerfect
                                ? '#76B583'
                                : isHighlighted
                                ? '#C99898'
                                : '#D9B5B5',
                          }}
                          className="w-[78%] max-w-[20px] rounded-t-[2px] transition-all duration-150"
                        />
                      </div>

                      {/* Percentage label right beneath the bar */}
                      <span
                        className={`mt-1 text-[9px] font-mono tabular-nums leading-none ${
                          isPerfect
                            ? 'text-[#3F7B4E] font-semibold'
                            : percent > 0
                            ? 'text-[#7A756C]'
                            : 'text-[#C2BEB5]'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                  );
                })}

                {/* Zone 3: Mini Calendar (spans the 4 right summary columns = 298px) */}
                <div className="col-span-4 pl-5 self-start">
                  <div className="border border-[#ECEAE4] rounded-lg overflow-hidden bg-[#FDFCFA]">
                    <div className="px-3 py-1.5 bg-[#F5F3EE] border-b border-[#ECEAE4] text-center text-[11px] font-semibold tracking-wider text-[#4A4740] uppercase">
                      {MONTHS_RU[monthIndex]} {year}
                    </div>
                    <div className="p-2">
                      <div className="grid grid-cols-7 text-center mb-1">
                        {WEEKDAYS_SHORT_RU.map((wd, idx) => (
                          <span
                            key={wd}
                            className={`text-[10px] font-medium ${
                              idx >= 5 ? 'text-[#A07A82]' : 'text-[#8C877C]'
                            }`}
                          >
                            {wd.toLowerCase()}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        {miniCalRows.map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-7 text-center">
                            {row.map((dNum, cIdx) => {
                              if (dNum === null) {
                                return <span key={cIdx} className="h-5" />;
                              }
                              const st = dailyStats[dNum - 1];
                              const isToday = st?.day.isToday;
                              const isSel = selectedDay === dNum;
                              const isPerf = st && st.total > 0 && st.percent === 100;
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDay((prev) => (prev === dNum ? null : dNum))
                                  }
                                  className={`h-5 w-6 mx-auto flex items-center justify-center rounded text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                                    isSel
                                      ? 'bg-[#1C1B18] text-white font-semibold'
                                      : isToday
                                      ? 'ring-1 ring-[#1C1B18] text-[#1C1B18] font-semibold bg-[#F4F2ED]'
                                      : isPerf
                                      ? 'bg-[#DCECD9] text-[#2F5B35] font-medium'
                                      : 'text-[#4A4740] hover:bg-[#EFECE5]'
                                  }`}
                                >
                                  {dNum}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WEEKLY PASTEL HEADER BANDS + RIGHT COLUMN LABELS */}
              <div className="grid items-stretch" style={gridColsStyle}>
                {/* Habit col header */}
                <div className="flex items-end pb-2 pr-2 text-[11px] font-semibold tracking-wider text-[#78746B] uppercase border-b border-[#E5E2DA]">
                  Привычка
                </div>

                {/* Goal col header */}
                <div className="flex items-end justify-center gap-0.5 pb-2 text-[10px] font-semibold tracking-wider text-[#5C5952] uppercase border-b border-[#E5E2DA]">
                  <Target className="w-3 h-3 text-[#8C877C] shrink-0" />
                  <span>Цель</span>
                </div>

                {/* 5 Pastel Week Group Banners */}
                {weekGroups.map((wg) => (
                  <div
                    key={wg.weekIndex}
                    style={{
                      gridColumn: `span ${wg.days.length} / span ${wg.days.length}`,
                      backgroundColor: wg.palette.headerBg,
                      color: wg.palette.headerText,
                    }}
                    className="flex items-center justify-center h-7 text-[11px] font-semibold tracking-tight border-r border-white/70 last:border-r-0 select-none tabular-nums"
                  >
                    <span className="truncate px-1">
                      {wg.days.length <= 2
                        ? `${wg.weekIndex + 1}н · ${wg.percent}%`
                        : `${wg.palette.label} · ${wg.percent}%`}
                    </span>
                  </div>
                ))}

                {/* Right Summary Column Headers */}
                <div className="flex items-end justify-center pb-2 text-[10px] font-semibold tracking-wider text-[#5C5952] uppercase border-b border-[#E5E2DA]">
                  Итого
                </div>
                <div className="flex items-end justify-center pb-2 text-[10px] font-semibold tracking-wider text-[#5C5952] uppercase border-b border-[#E5E2DA]">
                  Серия
                </div>
                <div className="flex items-end justify-center pb-2 text-[10px] font-semibold tracking-wider text-[#5C5952] uppercase border-b border-[#E5E2DA]">
                  Факт
                </div>
                <div className="flex items-end justify-center gap-1 pb-2 text-[10px] font-semibold tracking-wider text-[#5C5952] uppercase border-b border-[#E5E2DA]">
                  <Trophy className="w-3 h-3 text-[#8C877C]" />
                  <span>Прогресс</span>
                </div>
              </div>

              {/* DAY NUMBERS & WEEKDAYS SUBHEADER ROW */}
              <div className="grid items-center border-b border-[#E5E2DA] bg-[#FCFBF9]" style={gridColsStyle}>
                <div className="h-10" />
                <div className="h-10" />
                {days.map((day) => {
                  const isHighlighted = activeHighlightDay === day.day;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() =>
                        setSelectedDay((prev) => (prev === day.day ? null : day.day))
                      }
                      className={`h-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-[#F2EFE8]'
                          : day.isToday
                          ? 'bg-[#EEF5ED]'
                          : ''
                      }`}
                    >
                      <span
                        className={`text-[11px] font-mono tabular-nums leading-tight ${
                          day.isToday
                            ? 'font-bold text-[#2F6839]'
                            : 'font-medium text-[#3B3933]'
                        }`}
                      >
                        {day.day}
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${
                          day.isToday
                            ? 'text-[#3F7B4E] font-semibold'
                            : day.isWeekend
                            ? 'text-[#A07A82]'
                            : 'text-[#8C877C]'
                        }`}
                      >
                        {day.weekdayLabel}
                      </span>
                    </button>
                  );
                })}
                <div className="h-10" />
                <div className="h-10" />
                <div className="h-10" />
                <div className="h-10" />
              </div>

              {/* HABIT ROWS */}
              {filteredHabits.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#78746B]">
                  По выбранному фильтру привычек не найдено.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="text-[#1C1B18] font-medium underline cursor-pointer"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#F0EEE8]">
                  {filteredHabits.map((habit) => {
                    const metrics = habitMetricsMap.get(habit.id)!;
                    const barColor = getProgressColor(metrics.progressPercent);
                    const isEditingGoal = editingGoalHabitId === habit.id;

                    return (
                      <div
                        key={habit.id}
                        style={gridColsStyle}
                        className="grid items-center h-[38px] hover:bg-[#FAF9F5] transition-colors group"
                      >
                        {/* Habit Icon + Name + Edit trigger */}
                        <div className="flex items-center justify-between gap-1.5 pr-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[#5C5952] shrink-0">
                              <HabitIcon icon={habit.icon} className="w-3.5 h-3.5" />
                            </span>
                            <span
                              className="text-[13px] font-medium text-[#24231F] truncate"
                              title={habit.name}
                            >
                              {habit.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(habit)}
                            aria-label={`Редактировать привычку ${habit.name}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-[#8C877C] hover:text-[#1C1B18] hover:bg-[#ECEAE4] transition-opacity cursor-pointer shrink-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Monthly Goal (click to edit inline) */}
                        <div className="flex items-center justify-center">
                          {isEditingGoal ? (
                            <input
                              type="number"
                              min={1}
                              max={31}
                              autoFocus
                              value={editingGoalValue}
                              onChange={(e) => setEditingGoalValue(e.target.value)}
                              onBlur={() => commitGoalEdit(habit.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitGoalEdit(habit.id);
                                if (e.key === 'Escape') setEditingGoalHabitId(null);
                              }}
                              aria-label={`Изменить цель для ${habit.name}`}
                              className="w-10 h-6 text-center text-xs font-mono bg-white border border-[#1C1B18] rounded tabular-nums focus:outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingGoal(habit)}
                              title="Нажмите, чтобы изменить цель на месяц"
                              className="px-1.5 py-0.5 text-xs font-mono text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#ECEAE4] rounded tabular-nums transition-colors cursor-pointer"
                            >
                              {habit.goalPerMonth}
                            </button>
                          )}
                        </div>

                        {/* Daily 1..31 Interactive Cells */}
                        {days.map((day) => {
                          const completed = Boolean(logMap[getLogKey(habit.id, day.dateKey)]);
                          const palette = WEEK_PALETTES[day.weekIndex];
                          const isHighlighted = activeHighlightDay === day.day;

                          return (
                            <button
                              key={day.dateKey}
                              type="button"
                              onClick={() => onToggleLog(habit.id, day.dateKey)}
                              onMouseEnter={() => setHoveredDay(day.day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              aria-pressed={completed}
                              aria-label={`${habit.name}, ${day.day} ${MONTHS_GENITIVE_RU[monthIndex]} — ${
                                completed ? 'выполнено' : 'не выполнено'
                              }`}
                              style={{
                                backgroundColor: isHighlighted
                                  ? palette.cellHoverBg
                                  : day.isToday
                                  ? '#F4F9F3'
                                  : undefined,
                              }}
                              className="h-full w-full flex items-center justify-center border-r border-[#F5F3EE] last:border-r-0 hover:bg-[#F3F1EC] focus-visible:outline-2 focus-visible:outline-[#1C1B18] focus-visible:-outline-offset-2 transition-colors cursor-pointer select-none"
                            >
                              {completed ? (
                                <span
                                  style={{ color: palette.markColor }}
                                  className="text-[13px] font-semibold leading-none transition-transform duration-150 scale-100"
                                >
                                  ×
                                </span>
                              ) : (
                                <span className="w-1 h-1 rounded-full bg-transparent group-hover:bg-[#E5E2DA]/60 transition-colors" />
                              )}
                            </button>
                          );
                        })}

                        {/* Summary: ИТОГО */}
                        <div className="text-center text-xs font-mono font-medium text-[#2E2C27] tabular-nums">
                          {metrics.totalCompleted}
                        </div>

                        {/* Summary: СЕРИЯ */}
                        <div className="text-center text-xs font-mono text-[#5C5952] tabular-nums">
                          {metrics.bestStreak}
                        </div>

                        {/* Summary: ВЫПОЛНЕНО (fact/goal) */}
                        <div className="text-center text-xs font-mono text-[#5C5952] tabular-nums">
                          {metrics.totalCompleted}/{metrics.goal}
                        </div>

                        {/* Summary: ПРОГРЕСС (% + horizontal bar) */}
                        <div className="flex items-center justify-end gap-2 pl-1">
                          <span className="text-xs font-mono font-medium text-[#2E2C27] tabular-nums w-10 text-right shrink-0">
                            {metrics.progressPercent}%
                          </span>
                          <div className="flex-1 h-3.5 bg-[#F2F0EB] rounded-[2px] overflow-hidden">
                            <div
                              style={{
                                width: `${metrics.clampedPercent}%`,
                                backgroundColor: barColor,
                              }}
                              className="h-full rounded-[2px] transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Quick Add Row */}
              <div className="mt-3 pt-3 border-t border-[#ECEAE4] flex items-center justify-between">
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5952] hover:text-[#1C1B18] py-1 px-2 -ml-2 rounded-md hover:bg-[#F4F2ED] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить привычку
                </button>
                <div className="flex items-center gap-4 text-[11px] text-[#78746B]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[2px] bg-[#76B583] inline-block" />
                    Цель ≥ 80%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[2px] bg-[#F0C869] inline-block" />
                    40–79%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[2px] bg-[#E58A92] inline-block" />
                    &lt; 40%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Today's Rapid Check-In Strip */}
      {activeHabits.length > 0 && (
        <section
          aria-label="Быстрые отметки за сегодня"
          className="bg-white border border-[#E5E2DA] rounded-xl p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-sm font-semibold text-[#1C1B18]">
                Сегодня · {formatTodayLabelRu()}
              </h2>
              <span className="text-xs text-[#66625A] font-mono tabular-nums">
                {todayCompletedCount} из {activeHabits.length} выполнено
              </span>
            </div>
            <div className="w-40 h-2 bg-[#F2F0EB] rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    activeHabits.length > 0
                      ? Math.round((todayCompletedCount / activeHabits.length) * 100)
                      : 0
                  }%`,
                  backgroundColor:
                    todayCompletedCount === activeHabits.length ? '#76B583' : '#C9844E',
                }}
                className="h-full transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {activeHabits.map((habit) => {
              const done = Boolean(logMap[getLogKey(habit.id, todayKey)]);
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => onToggleLog(habit.id, todayKey)}
                  aria-pressed={done}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer min-h-[42px] ${
                    done
                      ? 'bg-[#EEF6EE] border-[#BBD9BC] text-[#284D2A]'
                      : 'bg-[#FAF9F6] border-[#E8E5DD] text-[#3B3933] hover:bg-[#F3F1EC]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      done
                        ? 'bg-[#60985D] border-[#60985D] text-white'
                        : 'bg-white border-[#CFCBC1]'
                    }`}
                  >
                    {done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </span>
                  <span className="text-xs font-medium truncate">{habit.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
