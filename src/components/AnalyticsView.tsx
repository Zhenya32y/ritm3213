import React, { useMemo } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import {
  CATEGORY_META,
  Habit,
  HabitCategory,
  HabitLogMap,
  MONTHS_GENITIVE_RU,
  MONTHS_RU,
  WEEKDAYS_SHORT_RU,
} from '../types/habit';
import {
  buildActivityHeatmap,
  buildMonthDays,
  computeDailyCompletion,
  computeHabitMonthMetrics,
  computeWeekGroups,
  getLogKey,
  getProgressColor,
} from '../lib/dateUtils';
import { HabitIcon } from './HabitIcon';

interface AnalyticsViewProps {
  year: number;
  monthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  habits: Habit[];
  logMap: HabitLogMap;
  totalLogsCount: number;
  onOpenAddModal: () => void;
  onOpenResetStats: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  year,
  monthIndex,
  onPrevMonth,
  onNextMonth,
  habits,
  logMap,
  totalLogsCount,
  onOpenAddModal,
  onOpenResetStats,
}) => {
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const days = useMemo(() => buildMonthDays(year, monthIndex), [year, monthIndex]);

  // 1. Daily Dynamics + 7-Day Moving Average
  const dailyTrendData = useMemo(() => {
    const raw = days.map((d) => {
      const st = computeDailyCompletion(d, activeHabits, logMap);
      return {
        day: d.day,
        label: `${d.day}`,
        fullDate: `${d.day} ${MONTHS_GENITIVE_RU[monthIndex]} (${d.weekdayLabel})`,
        percent: st.percent,
        completed: st.completed,
        total: st.total,
      };
    });

    return raw.map((item, idx) => {
      const start = Math.max(0, idx - 6);
      const slice = raw.slice(start, idx + 1);
      const avg = Math.round(slice.reduce((acc, s) => acc + s.percent, 0) / slice.length);
      return { ...item, movingAvg: avg };
    });
  }, [days, activeHabits, logMap, monthIndex]);

  // 2. Weekly Comparison (Weeks 1-5)
  const weeklyData = useMemo(() => {
    const groups = computeWeekGroups(days, activeHabits, logMap);
    return groups.map((g) => ({
      name: g.palette.label,
      percent: g.percent,
      completed: g.completedCount,
      possible: g.totalPossible,
      color: g.palette.chartColor,
    }));
  }, [days, activeHabits, logMap]);

  // 3. Weekday Consistency (Mon-Sun Radar Chart)
  const weekdayData = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);

    for (const d of days) {
      const st = computeDailyCompletion(d, activeHabits, logMap);
      sums[d.weekdayIndex] += st.percent;
      counts[d.weekdayIndex] += 1;
    }

    return WEEKDAYS_SHORT_RU.map((wd, idx) => ({
      weekday: wd,
      avgPercent: counts[idx] > 0 ? Math.round(sums[idx] / counts[idx]) : 0,
    }));
  }, [days, activeHabits, logMap]);

  // 4. Per-Habit Fact vs Goal Ranking
  const habitPerformance = useMemo(() => {
    return activeHabits
      .map((h) => {
        const m = computeHabitMonthMetrics(h, days, logMap);
        return {
          habit: h,
          name: h.name,
          completed: m.totalCompleted,
          goal: m.goal,
          percent: m.progressPercent,
          clampedPercent: m.clampedPercent,
          bestStreak: m.bestStreak,
          color: getProgressColor(m.progressPercent),
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [activeHabits, days, logMap]);

  // 5. Category Distribution & Completion Breakdown
  const categoryData = useMemo(() => {
    const bucket = new Map<HabitCategory, { completed: number; goal: number; count: number }>();
    for (const h of activeHabits) {
      const m = computeHabitMonthMetrics(h, days, logMap);
      const cur = bucket.get(h.category) ?? { completed: 0, goal: 0, count: 0 };
      cur.completed += m.totalCompleted;
      cur.goal += m.goal;
      cur.count += 1;
      bucket.set(h.category, cur);
    }

    return Array.from(bucket.entries())
      .map(([cat, stats]) => ({
        category: cat,
        label: CATEGORY_META[cat].label,
        color: CATEGORY_META[cat].color,
        completed: stats.completed,
        goal: stats.goal,
        count: stats.count,
        rate: stats.goal > 0 ? Math.round((stats.completed / stats.goal) * 100) : 0,
      }))
      .sort((a, b) => b.completed - a.completed);
  }, [activeHabits, days, logMap]);

  // 6. Multi-Month Activity Heatmap (last 18 weeks)
  const heatmapWeeks = useMemo(
    () => buildActivityHeatmap(activeHabits, logMap, 20),
    [activeHabits, logMap]
  );

  // Top KPI Metrics
  const kpis = useMemo(() => {
    const totalChecks = habitPerformance.reduce((sum, h) => sum + h.completed, 0);
    const avgDailyPercent =
      dailyTrendData.length > 0
        ? Math.round(dailyTrendData.reduce((s, d) => s + d.percent, 0) / dailyTrendData.length)
        : 0;
    const bestStreak = habitPerformance.reduce((max, h) => Math.max(max, h.bestStreak), 0);
    const perfectDays = dailyTrendData.filter((d) => d.total > 0 && d.percent === 100).length;
    const leader = habitPerformance[0] ?? null;

    // Strongest weekday
    const bestWeekday = [...weekdayData].sort((a, b) => b.avgPercent - a.avgPercent)[0] ?? null;

    return {
      totalChecks,
      avgDailyPercent,
      bestStreak,
      perfectDays,
      leader,
      bestWeekday,
    };
  }, [habitPerformance, dailyTrendData, weekdayData]);

  // Cumulative completions chart across the month
  const cumulativeData = useMemo(() => {
    let running = 0;
    const totalGoal = activeHabits.reduce((s, h) => s + h.goalPerMonth, 0);
    return days.map((d, idx) => {
      for (const h of activeHabits) {
        if (logMap[getLogKey(h.id, d.dateKey)]) running++;
      }
      const idealPace = Math.round(((idx + 1) / days.length) * totalGoal);
      return {
        day: d.day,
        fullDate: `${d.day} ${MONTHS_GENITIVE_RU[monthIndex]}`,
        actual: running,
        targetPace: idealPace,
      };
    });
  }, [days, activeHabits, logMap, monthIndex]);

  if (activeHabits.length === 0) {
    return (
      <div className="bg-white border border-[#E5E2DA] rounded-xl py-20 px-6 text-center">
        <h2 className="text-lg font-semibold text-[#1C1B18] mb-2">
          Статистика появится после добавления привычек
        </h2>
        <p className="text-sm text-[#66625A] mb-6 max-w-md mx-auto">
          Добавьте привычки и начните отмечать их каждый день — здесь автоматически построятся
          графики динамики, радар по дням недели, рейтинг целей и тепловая карта.
        </p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1C1B18] hover:bg-[#33312C] rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Добавить первую привычку
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1B18] tracking-tight">
            Статистика и графики
          </h1>
          <p className="text-sm text-[#66625A] mt-0.5">
            Анализ стабильности, серий, дней недели и выполнения целей за {MONTHS_RU[monthIndex].toLowerCase()} {year}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E2DA] rounded-lg p-1">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Предыдущий месяц"
              className="w-8 h-8 flex items-center justify-center rounded-md text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#F4F2ED] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-[#1C1B18] min-w-[130px] text-center tabular-nums">
              {MONTHS_RU[monthIndex]} {year}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Следующий месяц"
              className="w-8 h-8 flex items-center justify-center rounded-md text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#F4F2ED] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={totalLogsCount === 0}
            onClick={onOpenResetStats}
            title={
              totalLogsCount === 0
                ? 'Нет отметок для сброса'
                : 'Полностью сбросить все отметки и статистику'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#B84A5E] bg-white border border-[#E8CFD4] hover:bg-[#F9EBEE] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить статистику
          </button>
        </div>
      </div>

      {/* KPI Strip (Single elevation, clean hairline dividers, zero pill boxes) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-[#E5E2DA] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#ECEAE4]">
        <div className="p-5">
          <div className="text-xs text-[#78746B]">Всего отметок</div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[#1C1B18] tabular-nums">
            {kpis.totalChecks}
          </div>
          <div className="mt-1 text-xs text-[#8C877C]">
            по {activeHabits.length} привычкам
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78746B]">Среднее в день</div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[#1C1B18] tabular-nums">
            {kpis.avgDailyPercent}%
          </div>
          <div className="mt-1 text-xs text-[#8C877C]">
            лучший день недели: {kpis.bestWeekday?.weekday ?? '—'}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78746B]">Лучшая серия</div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[#60985D] tabular-nums">
            {kpis.bestStreak} дн.
          </div>
          <div className="mt-1 text-xs text-[#8C877C]">подряд без пропусков</div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78746B]">Идеальные дни (100%)</div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[#C76F82] tabular-nums">
            {kpis.perfectDays}
          </div>
          <div className="mt-1 text-xs text-[#8C877C]">выполнены все привычки</div>
        </div>

        <div className="p-5 col-span-2 lg:col-span-1">
          <div className="text-xs text-[#78746B]">Лидер месяца</div>
          <div className="mt-1.5 text-base font-semibold text-[#1C1B18] truncate" title={kpis.leader?.name}>
            {kpis.leader ? kpis.leader.name : '—'}
          </div>
          <div className="mt-1 text-xs font-mono text-[#60985D] tabular-nums">
            {kpis.leader ? `${kpis.leader.percent}% (${kpis.leader.completed}/${kpis.leader.goal})` : 'Нет данных'}
          </div>
        </div>
      </div>

      {/* Row 1: Daily Dynamics + Cumulative Pace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Daily % Area + 7-Day Moving Average Line */}
        <div className="lg:col-span-7 bg-white border border-[#E5E2DA] rounded-xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#1C1B18]">
                Динамика выполнения по дням
              </h2>
              <p className="text-xs text-[#78746B] mt-0.5">
                Ежедневный процент и сглаженный 7-дневный тренд
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#66625A]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#D9B5B5]" />
                День (%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#4F8B5D]" />
                Тренд 7 дн.
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyTrendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyRoseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9B5B5" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#D9B5B5" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#78746B', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E5E2DA' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#78746B', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DA',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                  formatter={(value: unknown, name: unknown) => [
                    `${value}%`,
                    name === 'percent' ? 'Выполнено за день' : 'Среднее за 7 дн.',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="percent"
                  stroke="#C78A8A"
                  strokeWidth={2}
                  fill="url(#dailyRoseFill)"
                />
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="#4F8B5D"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative Pace vs Goal Line */}
        <div className="lg:col-span-5 bg-white border border-[#E5E2DA] rounded-xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#1C1B18]">
                Накопительный темп к цели
              </h2>
              <p className="text-xs text-[#78746B] mt-0.5">
                Сумма отметок против планового графика месяца
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#66625A]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#6084B8]" />
                Факт
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#BDB8AD]" />
                План
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulativeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumBlueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A9ED0" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#7A9ED0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#78746B', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E5E2DA' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78746B', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DA',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                  formatter={(value: unknown, name: unknown) => [
                    `${value} отм.`,
                    name === 'actual' ? 'Фактически' : 'Плановый темп',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="targetPace"
                  stroke="#BDB8AD"
                  strokeDasharray="4 4"
                  strokeWidth={1.75}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#6084B8"
                  strokeWidth={2.5}
                  fill="url(#cumBlueFill)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Weekly Bar Chart | Weekday Radar Chart | Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Weekly Comparison */}
        <div className="lg:col-span-4 bg-white border border-[#E5E2DA] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#1C1B18]">Сравнение по неделям</h2>
          <p className="text-xs text-[#78746B] mt-0.5 mb-5">
            Процент выполнения по 5 недельным интервалам
          </p>
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#5C5952' }}
                  axisLine={{ stroke: '#E5E2DA' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#78746B', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#FAF9F6' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DA',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown, _name: unknown, item: { payload?: { completed?: number; possible?: number } }) => [
                    `${value}% (${item.payload?.completed ?? 0} из ${item.payload?.possible ?? 0})`,
                    'Выполнение',
                  ]}
                />
                <Bar dataKey="percent" radius={[4, 4, 0, 0]} maxBarSize={42}>
                  {weeklyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Weekday Consistency Radar */}
        <div className="lg:col-span-4 bg-white border border-[#E5E2DA] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#1C1B18]">Эффективность по дням недели</h2>
          <p className="text-xs text-[#78746B] mt-0.5 mb-3">
            Средний процент выполнения в Пн–Вс
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="52%" outerRadius="72%" data={weekdayData}>
                <PolarGrid stroke="#E5E2DA" />
                <PolarAngleAxis
                  dataKey="weekday"
                  tick={{ fontSize: 12, fill: '#4A4740', fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9E998E', fontFamily: 'JetBrains Mono' }}
                  tickCount={4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DA',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [`${value}%`, 'Среднее выполнение']}
                />
                <Radar
                  name="Дни недели"
                  dataKey="avgPercent"
                  stroke="#8A6BA8"
                  fill="#B499CE"
                  fillOpacity={0.38}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Category Balance Donut */}
        <div className="lg:col-span-4 bg-white border border-[#E5E2DA] rounded-xl p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-[#1C1B18]">Баланс по категориям</h2>
          <p className="text-xs text-[#78746B] mt-0.5 mb-3">
            Распределение выполненных отметок
          </p>
          <div className="flex-1 flex items-center gap-4">
            <div className="w-[150px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E2DA',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown, _name: unknown, item: { payload?: { label?: string; rate?: number } }) => [
                      `${value} отм. (${item.payload?.rate ?? 0}% цели)`,
                      item.payload?.label ?? '',
                    ]}
                  />
                  <Pie
                    data={categoryData}
                    dataKey="completed"
                    nameKey="label"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {categoryData.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-[#3B3933] truncate">{cat.label}</span>
                  </div>
                  <span className="font-mono text-[#5C5952] tabular-nums shrink-0">
                    {cat.completed} <span className="text-[#9E998E]">({cat.rate}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Habit Performance Leaderboard & Annual/Multi-month Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 6: Per-Habit Goal Completion Bars */}
        <div className="lg:col-span-6 bg-white border border-[#E5E2DA] rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#1C1B18]">
                Рейтинг выполнения целей
              </h2>
              <p className="text-xs text-[#78746B] mt-0.5">
                Сортировка привычек по проценту достижения цели
              </p>
            </div>
            <span className="text-xs text-[#8C877C] font-mono">Факт / Цель</span>
          </div>

          <div className="space-y-3.5">
            {habitPerformance.map((item) => (
              <div key={item.habit.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#66625A] shrink-0">
                      <HabitIcon icon={item.habit.icon} className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium text-[#1C1B18] truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                    <span className="text-[#78746B]">
                      {item.completed}/{item.goal}
                    </span>
                    <span className="text-[#8C877C] text-[11px]">
                      серия {item.bestStreak}
                    </span>
                    <span className="font-semibold text-[#1C1B18] w-11 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-[#F2F0EB] rounded-[3px] overflow-hidden">
                  <div
                    style={{
                      width: `${item.clampedPercent}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full rounded-[3px] transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 7: Multi-month Activity Heatmap */}
        <div className="lg:col-span-6 bg-white border border-[#E5E2DA] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-[#1C1B18]">
                  Тепловая карта активности
                </h2>
                <p className="text-xs text-[#78746B] mt-0.5">
                  Последние 20 недель ежедневной регулярности
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#78746B]">
                <span>0%</span>
                <span className="w-3 h-3 rounded-[2px] bg-[#F1EFE9]" />
                <span className="w-3 h-3 rounded-[2px] bg-[#E8D5D5]" />
                <span className="w-3 h-3 rounded-[2px] bg-[#D9B5B5]" />
                <span className="w-3 h-3 rounded-[2px] bg-[#A4CEAC]" />
                <span className="w-3 h-3 rounded-[2px] bg-[#60985D]" />
                <span>100%</span>
              </div>
            </div>

            <div className="overflow-x-auto tracker-scroll pb-2">
              <div className="inline-flex gap-1.5">
                {/* Weekday labels */}
                <div className="flex flex-col justify-between py-0.5 pr-1 text-[10px] text-[#8C877C] font-mono">
                  {WEEKDAYS_SHORT_RU.map((wd) => (
                    <span key={wd} className="h-4 flex items-center">
                      {wd}
                    </span>
                  ))}
                </div>

                {/* Week columns */}
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1">
                    {week.map((cell) => {
                      let bg = '#F1EFE9';
                      if (cell.isFuture) {
                        bg = '#FAF9F6';
                      } else if (cell.percent === 100 && cell.total > 0) {
                        bg = '#60985D';
                      } else if (cell.percent >= 70) {
                        bg = '#A4CEAC';
                      } else if (cell.percent >= 40) {
                        bg = '#D9B5B5';
                      } else if (cell.percent > 0) {
                        bg = '#EBD9D9';
                      }

                      return (
                        <div
                          key={cell.dateKey}
                          title={
                            cell.isFuture
                              ? cell.dateKey
                              : `${cell.dateKey}: ${cell.completed} из ${cell.total} (${cell.percent}%)`
                          }
                          style={{ backgroundColor: bg }}
                          className={`w-4 h-4 rounded-[3px] transition-transform duration-150 hover:scale-110 ${
                            cell.isFuture ? 'border border-dashed border-[#E5E2DA]' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight Summary Footer inside Heatmap card */}
          <div className="mt-5 pt-4 border-t border-[#ECEAE4] grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-[#8C877C]">Активных привычек</div>
              <div className="font-mono font-semibold text-[#1C1B18] mt-0.5 tabular-nums">
                {activeHabits.length}
              </div>
            </div>
            <div>
              <div className="text-[#8C877C]">Выполнено на 100%+</div>
              <div className="font-mono font-semibold text-[#4F8B5D] mt-0.5 tabular-nums">
                {habitPerformance.filter((h) => h.percent >= 100).length} из {activeHabits.length}
              </div>
            </div>
            <div>
              <div className="text-[#8C877C]">Сильнейший день</div>
              <div className="font-mono font-semibold text-[#1C1B18] mt-0.5">
                {kpis.bestWeekday ? `${kpis.bestWeekday.weekday} (${kpis.bestWeekday.avgPercent}%)` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
