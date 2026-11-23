import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Cloud, CloudOff, LogIn, LogOut, Plus, Upload } from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import {
  createHabitInFirestore,
  deleteHabitAndLogsInFirestore,
  ensureUserProfile,
  generateSafeHabitId,
  importStarterHabitsToFirestore,
  migrateGuestDataToFirestore,
  resetAllLogsInFirestore,
  setHabitArchivedInFirestore,
  subscribeHabits,
  subscribeLogs,
  swapHabitOrdersInFirestore,
  toggleHabitLogInFirestore,
  updateHabitDetailsInFirestore,
  updateHabitGoalInFirestore,
} from './lib/habitService';
import { createGuestStarterHabits, createGuestStarterLogs, STARTER_HABITS } from './lib/starterData';
import { Habit, HabitCategory, HabitIconKey, HabitLogMap } from './types/habit';
import { getLogKey } from './lib/dateUtils';
import { MonthlyTrackerView } from './components/MonthlyTrackerView';
import { AnalyticsView } from './components/AnalyticsView';
import { HabitsManagerView } from './components/HabitsManagerView';
import { HabitModal } from './components/HabitModal';
import { ResetStatsModal } from './components/ResetStatsModal';

type ActiveTab = 'tracker' | 'analytics' | 'habits';

const GUEST_HABITS_KEY = 'ritm_guest_habits_v1';
const GUEST_LOGS_KEY = 'ritm_guest_logs_v1';

function loadGuestHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(GUEST_HABITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to starter
  }
  const starter = createGuestStarterHabits();
  try {
    localStorage.setItem(GUEST_HABITS_KEY, JSON.stringify(starter));
  } catch {
    // ignore storage errors
  }
  return starter;
}

function loadGuestLogs(initialHabits: Habit[]): HabitLogMap {
  try {
    const raw = localStorage.getItem(GUEST_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as HabitLogMap;
    }
  } catch {
    // fallback to starter
  }
  const starterLogs = createGuestStarterLogs(initialHabits);
  try {
    localStorage.setItem(GUEST_LOGS_KEY, JSON.stringify(starterLogs));
  } catch {
    // ignore storage errors
  }
  return starterLogs;
}

export default function App() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Data state
  const [guestHabits, setGuestHabits] = useState<Habit[]>(() => loadGuestHabits());
  const [guestLogs, setGuestLogs] = useState<HabitLogMap>(() => loadGuestLogs(loadGuestHabits()));

  const [cloudHabits, setCloudHabits] = useState<Habit[]>([]);
  const [cloudLogs, setCloudLogs] = useState<HabitLogMap>({});
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const [cloudMigrating, setCloudMigrating] = useState<boolean>(false);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);

  // Throw Firestore listener errors into ErrorBoundary if fatal
  if (runtimeError) {
    throw runtimeError;
  }

  // Persist guest data locally
  useEffect(() => {
    try {
      localStorage.setItem(GUEST_HABITS_KEY, JSON.stringify(guestHabits));
    } catch {
      // ignore
    }
  }, [guestHabits]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_LOGS_KEY, JSON.stringify(guestLogs));
    } catch {
      // ignore
    }
  }, [guestLogs]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Attach Firestore listeners ONLY when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !user) {
      setCloudHabits([]);
      setCloudLogs({});
      setCloudLoading(false);
      return;
    }

    let cancelled = false;
    let unsubHabits: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;

    setCloudLoading(true);
    setAuthNotice(null);

    ensureUserProfile(user)
      .then(() => {
        if (cancelled) return;
        let habitsLoaded = false;
        let logsLoaded = false;
        const markReady = () => {
          if (habitsLoaded && logsLoaded) setCloudLoading(false);
        };

        unsubHabits = subscribeHabits(
          user.uid,
          (list) => {
            setCloudHabits(list);
            habitsLoaded = true;
            markReady();
          },
          (err) => setRuntimeError(err)
        );

        unsubLogs = subscribeLogs(
          user.uid,
          (map) => {
            setCloudLogs(map);
            logsLoaded = true;
            markReady();
          },
          (err) => setRuntimeError(err)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setCloudLoading(false);
          setRuntimeError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
      if (unsubHabits) unsubHabits();
      if (unsubLogs) unsubLogs();
    };
  }, [authReady, user]);

  const habits = user ? cloudHabits : guestHabits;
  const logMap = user ? cloudLogs : guestLogs;

  // Month navigation
  const handlePrevMonth = useCallback(() => {
    setMonthIndex((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthIndex((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleJumpToToday = useCallback(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
  }, []);

  // Auth actions
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setAuthNotice('Не удалось выполнить вход через Google. Попробуйте ещё раз.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthNotice(null);
    } catch {
      setAuthNotice('Не удалось выйти из аккаунта.');
    }
  };

  // Habit CRUD handlers (seamlessly dispatch to Firestore when signed in, or local guest state)
  const handleToggleLog = useCallback(
    async (habitId: string, dateKey: string) => {
      const key = getLogKey(habitId, dateKey);
      const currentlyCompleted = Boolean(logMap[key]);

      if (!user) {
        setGuestLogs((prev) => {
          const next = { ...prev };
          if (currentlyCompleted) {
            delete next[key];
          } else {
            next[key] = true;
          }
          return next;
        });
        return;
      }

      // Optimistic cloud update for zero-latency feel
      setCloudLogs((prev) => {
        const next = { ...prev };
        if (currentlyCompleted) {
          delete next[key];
        } else {
          next[key] = true;
        }
        return next;
      });

      try {
        await toggleHabitLogInFirestore(user.uid, habitId, dateKey, currentlyCompleted);
      } catch (err) {
        // Revert optimistic toggle on error
        setCloudLogs((prev) => {
          const next = { ...prev };
          if (currentlyCompleted) {
            next[key] = true;
          } else {
            delete next[key];
          }
          return next;
        });
        setRuntimeError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [user, logMap]
  );

  const handleSaveHabit = async (data: {
    name: string;
    icon: HabitIconKey;
    category: HabitCategory;
    goalPerMonth: number;
  }) => {
    if (!user) {
      if (editingHabit) {
        setGuestHabits((prev) =>
          prev.map((h) => (h.id === editingHabit.id ? { ...h, ...data } : h))
        );
      } else {
        const nextOrder =
          guestHabits.length > 0 ? Math.max(...guestHabits.map((h) => h.order)) + 1 : 0;
        setGuestHabits((prev) => [
          ...prev,
          {
            id: generateSafeHabitId(),
            userId: 'guest',
            ...data,
            order: nextOrder,
            archived: false,
          },
        ]);
      }
      return;
    }

    if (editingHabit) {
      await updateHabitDetailsInFirestore(user.uid, editingHabit.id, data);
    } else {
      const nextOrder =
        cloudHabits.length > 0 ? Math.max(...cloudHabits.map((h) => h.order)) + 1 : 0;
      await createHabitInFirestore(user.uid, { ...data, order: nextOrder });
    }
  };

  const handleInlineGoalChange = async (habitId: string, goal: number) => {
    if (!user) {
      setGuestHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, goalPerMonth: goal } : h))
      );
      return;
    }
    try {
      await updateHabitGoalInFirestore(user.uid, habitId, goal);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteHabit = async (habit: Habit) => {
    if (!user) {
      setGuestHabits((prev) => prev.filter((h) => h.id !== habit.id));
      setGuestLogs((prev) => {
        const next: HabitLogMap = {};
        const prefix = `${habit.id}_`;
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(prefix)) next[k] = v;
        }
        return next;
      });
      return;
    }
    await deleteHabitAndLogsInFirestore(user.uid, habit.id);
  };

  const handleToggleArchive = async (habit: Habit) => {
    if (!user) {
      setGuestHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, archived: !h.archived } : h))
      );
      return;
    }
    try {
      await setHabitArchivedInFirestore(user.uid, habit.id, !habit.archived);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleMoveHabit = async (activeIndex: number, direction: 'up' | 'down') => {
    const activeList = habits.filter((h) => !h.archived);
    const targetIdx = direction === 'up' ? activeIndex - 1 : activeIndex + 1;
    if (targetIdx < 0 || targetIdx >= activeList.length) return;

    const a = activeList[activeIndex];
    const b = activeList[targetIdx];
    const orderA = a.order === b.order ? activeIndex : a.order;
    const orderB = a.order === b.order ? targetIdx : b.order;

    if (!user) {
      setGuestHabits((prev) => {
        const next = prev.map((h) => {
          if (h.id === a.id) return { ...h, order: orderB };
          if (h.id === b.id) return { ...h, order: orderA };
          return h;
        });
        return next.sort((x, y) => x.order - y.order);
      });
      return;
    }

    try {
      await swapHabitOrdersInFirestore(
        user.uid,
        { id: a.id, order: orderA },
        { id: b.id, order: orderB }
      );
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleLoadStarterPack = async () => {
    if (!user) {
      const nextOrder =
        guestHabits.length > 0 ? Math.max(...guestHabits.map((h) => h.order)) + 1 : 0;
      const added: Habit[] = STARTER_HABITS.map((tpl, idx) => ({
        id: generateSafeHabitId(),
        userId: 'guest',
        name: tpl.name,
        icon: tpl.icon,
        category: tpl.category,
        goalPerMonth: tpl.goalPerMonth,
        order: nextOrder + idx,
        archived: false,
      }));
      setGuestHabits((prev) => [...prev, ...added]);
      return;
    }

    try {
      const nextOrder =
        cloudHabits.length > 0 ? Math.max(...cloudHabits.map((h) => h.order)) + 1 : 0;
      await importStarterHabitsToFirestore(user.uid, nextOrder);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleMigrateGuestToCloud = async () => {
    if (!user || guestHabits.length === 0) return;
    setCloudMigrating(true);
    try {
      await migrateGuestDataToFirestore(user.uid, guestHabits, guestLogs);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setCloudMigrating(false);
    }
  };

  const handleResetAllStats = async () => {
    if (!user) {
      setGuestLogs({});
      try {
        localStorage.setItem(GUEST_LOGS_KEY, JSON.stringify({}));
      } catch {
        // ignore storage errors
      }
      return;
    }

    await resetAllLogsInFirestore(user.uid);
    setCloudLogs({});
  };

  const totalLogsCount = Object.keys(logMap).length;

  const openAddModal = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1B18] flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Primary CTA */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E5E2DA]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className="text-lg font-bold tracking-tight text-[#1C1B18] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ритм
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium" aria-label="Основная навигация">
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'tracker'
                  ? 'border-[#1C1B18] text-[#1C1B18] font-semibold'
                  : 'border-transparent text-[#66625A] hover:text-[#1C1B18]'
              }`}
            >
              Трекер
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-[#1C1B18] text-[#1C1B18] font-semibold'
                  : 'border-transparent text-[#66625A] hover:text-[#1C1B18]'
              }`}
            >
              Статистика
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'habits'
                  ? 'border-[#1C1B18] text-[#1C1B18] font-semibold'
                  : 'border-transparent text-[#66625A] hover:text-[#1C1B18]'
              }`}
            >
              Привычки
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1C1B18] hover:bg-[#33312C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Привычка
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Workspace Cloud Sync Bar (lives inside workspace below header) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 bg-white border border-[#E5E2DA] rounded-lg text-xs">
          {!authReady ? (
            <span className="text-[#8C877C]">Проверка авторизации...</span>
          ) : user ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[#5C5952]">
                <Cloud className="w-3.5 h-3.5 text-[#5A8D63] shrink-0" />
                <span className="font-medium text-[#1C1B18]">
                  {user.displayName || user.email}
                </span>
                <span aria-hidden="true">·</span>
                <span>Облачная синхронизация активна</span>
              </div>
              <div className="flex items-center gap-3">
                {!cloudLoading && cloudHabits.length === 0 && guestHabits.length > 0 && (
                  <button
                    type="button"
                    disabled={cloudMigrating}
                    onClick={handleMigrateGuestToCloud}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#1C1B18] bg-[#EEF6EE] hover:bg-[#DCECD9] rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {cloudMigrating ? 'Перенос...' : 'Перенести локальные привычки в облако'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 text-[#66625A] hover:text-[#1C1B18] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[#5C5952]">
                <CloudOff className="w-3.5 h-3.5 text-[#9E998E] shrink-0" />
                <span>Локальный режим с примером данных</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#78746B]">
                  Войдите через Google для синхронизации между устройствами
                </span>
              </div>
              <button
                type="button"
                disabled={authLoading}
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C1B18] bg-[#F4F2ED] hover:bg-[#E9E6DE] border border-[#DDD9D0] rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                {authLoading ? 'Вход...' : 'Войти через Google'}
              </button>
            </>
          )}
        </div>

        {authNotice && (
          <div className="text-xs text-[#B84A5E] bg-[#F9EBEE] border border-[#EFCFD6] rounded-lg px-4 py-2.5">
            {authNotice}
          </div>
        )}

        {/* Active View */}
        {activeTab === 'tracker' && (
          <MonthlyTrackerView
            year={year}
            monthIndex={monthIndex}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onJumpToToday={handleJumpToToday}
            habits={habits}
            logMap={logMap}
            loading={Boolean(user) && cloudLoading}
            onToggleLog={handleToggleLog}
            onInlineGoalChange={handleInlineGoalChange}
            onOpenAddModal={openAddModal}
            onOpenEditModal={openEditModal}
            onLoadStarterPack={handleLoadStarterPack}
            onGoToAnalytics={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            year={year}
            monthIndex={monthIndex}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            habits={habits}
            logMap={logMap}
            totalLogsCount={totalLogsCount}
            onOpenAddModal={openAddModal}
            onOpenResetStats={() => setResetModalOpen(true)}
          />
        )}

        {activeTab === 'habits' && (
          <HabitsManagerView
            year={year}
            monthIndex={monthIndex}
            habits={habits}
            logMap={logMap}
            totalLogsCount={totalLogsCount}
            onOpenAddModal={openAddModal}
            onOpenEditModal={openEditModal}
            onMoveHabit={handleMoveHabit}
            onToggleArchive={handleToggleArchive}
            onDeleteHabit={handleDeleteHabit}
            onLoadStarterPack={handleLoadStarterPack}
            onOpenResetStats={() => setResetModalOpen(true)}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 border-t border-[#ECEAE4] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8C877C]">
        <span>Ритм — личный трекер ежедневных привычек</span>
        <span>Нажмите на любую ячейку дня, чтобы отметить или снять выполнение</span>
      </footer>

      {/* Add / Edit Habit Modal */}
      <HabitModal
        isOpen={modalOpen}
        editingHabit={editingHabit}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />

      {/* Reset All Statistics Extra-Confirmation Modal */}
      <ResetStatsModal
        isOpen={resetModalOpen}
        totalLogsCount={totalLogsCount}
        habitsCount={habits.length}
        onClose={() => setResetModalOpen(false)}
        onConfirmReset={handleResetAllStats}
      />
    </div>
  );
}
