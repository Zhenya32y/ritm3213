import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Habit,
  HabitCategory,
  HabitIconKey,
  HabitLogMap,
  ICON_OPTIONS,
} from '../types/habit';
import { STARTER_HABITS } from './starterData';

const VALID_ICON_SET = new Set<string>(ICON_OPTIONS.map((o) => o.key));
const VALID_CATEGORY_SET = new Set<string>([
  'health',
  'sport',
  'mindfulness',
  'growth',
  'routine',
  'other',
]);

// Verbatim synchronization with firebase-blueprint.json constraints
const MAX_HABIT_NAME_LEN = 80;
const MAX_DISPLAY_NAME_LEN = 100;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeHabitName(raw: string): string {
  return raw.trim().slice(0, MAX_HABIT_NAME_LEN);
}

export function sanitizeGoal(raw: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 15;
  return Math.max(1, Math.min(31, n));
}

export function sanitizeOrder(raw: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1000, n));
}

export function sanitizeIcon(icon: string): HabitIconKey {
  return VALID_ICON_SET.has(icon) ? (icon as HabitIconKey) : 'target';
}

export function sanitizeCategory(category: string): HabitCategory {
  return VALID_CATEGORY_SET.has(category) ? (category as HabitCategory) : 'other';
}

export function generateSafeHabitId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `habit_${ts}_${rand}`;
}

/**
 * Ensures the parent `/users/{uid}` document exists (required by Master Gate in firestore.rules).
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Пользователь')
      .trim()
      .slice(0, MAX_DISPLAY_NAME_LEN);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: displayName || 'Пользователь',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data()?.displayName !== displayName && displayName.length > 0) {
      await updateDoc(ref, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeHabits(
  userId: string,
  onData: (habits: Habit[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `users/${userId}/habits`;
  const q = query(collection(db, path), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Habit[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId ?? userId),
          name: String(data.name ?? ''),
          icon: sanitizeIcon(String(data.icon ?? 'target')),
          category: sanitizeCategory(String(data.category ?? 'other')),
          goalPerMonth: sanitizeGoal(Number(data.goalPerMonth ?? 15)),
          order: sanitizeOrder(Number(data.order ?? 0)),
          archived: Boolean(data.archived),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      list.sort((a, b) => a.order - b.order);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function subscribeLogs(
  userId: string,
  onData: (logMap: HabitLogMap) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `users/${userId}/logs`;
  const q = query(collection(db, path), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const map: HabitLogMap = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.completed && typeof data.habitId === 'string' && typeof data.date === 'string') {
          map[`${data.habitId}_${data.date}`] = true;
        }
      });
      onData(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export interface CreateHabitInput {
  name: string;
  icon: HabitIconKey;
  category: HabitCategory;
  goalPerMonth: number;
  order: number;
}

export async function createHabitInFirestore(
  userId: string,
  input: CreateHabitInput
): Promise<string> {
  const habitId = generateSafeHabitId();
  const path = `users/${userId}/habits/${habitId}`;
  const cleanName = sanitizeHabitName(input.name);
  if (!cleanName) {
    throw new Error('Название привычки не может быть пустым.');
  }

  try {
    await setDoc(doc(db, 'users', userId, 'habits', habitId), {
      userId,
      name: cleanName,
      icon: sanitizeIcon(input.icon),
      category: sanitizeCategory(input.category),
      goalPerMonth: sanitizeGoal(input.goalPerMonth),
      order: sanitizeOrder(input.order),
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return habitId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHabitDetailsInFirestore(
  userId: string,
  habitId: string,
  input: {
    name: string;
    icon: HabitIconKey;
    category: HabitCategory;
    goalPerMonth: number;
  }
): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  const cleanName = sanitizeHabitName(input.name);
  if (!cleanName) {
    throw new Error('Название привычки не может быть пустым.');
  }
  try {
    await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
      name: cleanName,
      icon: sanitizeIcon(input.icon),
      category: sanitizeCategory(input.category),
      goalPerMonth: sanitizeGoal(input.goalPerMonth),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateHabitGoalInFirestore(
  userId: string,
  habitId: string,
  goalPerMonth: number
): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
      goalPerMonth: sanitizeGoal(goalPerMonth),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setHabitArchivedInFirestore(
  userId: string,
  habitId: string,
  archived: boolean
): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
      archived: Boolean(archived),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function swapHabitOrdersInFirestore(
  userId: string,
  habitA: { id: string; order: number },
  habitB: { id: string; order: number }
): Promise<void> {
  const path = `users/${userId}/habits`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId, 'habits', habitA.id), {
      order: sanitizeOrder(habitB.order),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', userId, 'habits', habitB.id), {
      order: sanitizeOrder(habitA.order),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHabitAndLogsInFirestore(
  userId: string,
  habitId: string
): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  try {
    const logsPath = `users/${userId}/logs`;
    const logsQuery = query(collection(db, logsPath), where('userId', '==', userId));
    const snap = await getDocs(logsQuery);

    // Filter matching habitId in memory to avoid needing a composite index
    const docs = snap.docs.filter((d) => d.data()?.habitId === habitId);
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function resetAllLogsInFirestore(userId: string): Promise<void> {
  const logsPath = `users/${userId}/logs`;
  try {
    const logsQuery = query(collection(db, logsPath), where('userId', '==', userId));
    const snap = await getDocs(logsQuery);
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, logsPath);
  }
}

export async function toggleHabitLogInFirestore(
  userId: string,
  habitId: string,
  dateKey: string,
  currentlyCompleted: boolean
): Promise<void> {
  if (!DATE_REGEX.test(dateKey) || !SAFE_ID_REGEX.test(habitId)) {
    throw new Error('Некорректный формат даты или идентификатора привычки.');
  }
  const logId = `${habitId}_${dateKey}`;
  const path = `users/${userId}/logs/${logId}`;
  const ref = doc(db, 'users', userId, 'logs', logId);

  try {
    if (currentlyCompleted) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        userId,
        habitId,
        date: dateKey,
        monthKey: dateKey.slice(0, 7),
        completed: true,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentlyCompleted ? OperationType.DELETE : OperationType.CREATE,
      path
    );
  }
}

export async function importStarterHabitsToFirestore(
  userId: string,
  startingOrder: number
): Promise<void> {
  const path = `users/${userId}/habits`;
  try {
    const batch = writeBatch(db);
    STARTER_HABITS.forEach((tpl, idx) => {
      const habitId = `starter_${tpl.id}_${Date.now().toString(36).slice(-4)}`;
      batch.set(doc(db, 'users', userId, 'habits', habitId), {
        userId,
        name: sanitizeHabitName(tpl.name),
        icon: sanitizeIcon(tpl.icon),
        category: sanitizeCategory(tpl.category),
        goalPerMonth: sanitizeGoal(tpl.goalPerMonth),
        order: sanitizeOrder(startingOrder + idx),
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Migrates guest habits & logs into Firestore in two stages so habit documents exist
 * before log creation rules check exists(/users/{uid}/habits/{habitId}).
 */
export async function migrateGuestDataToFirestore(
  userId: string,
  guestHabits: Habit[],
  guestLogs: HabitLogMap
): Promise<void> {
  const habitsPath = `users/${userId}/habits`;
  const logsPath = `users/${userId}/logs`;
  const idMap = new Map<string, string>();

  try {
    // Stage 1: Commit habits first
    const habitBatch = writeBatch(db);
    guestHabits.forEach((h, idx) => {
      const newId = generateSafeHabitId();
      idMap.set(h.id, newId);
      habitBatch.set(doc(db, 'users', userId, 'habits', newId), {
        userId,
        name: sanitizeHabitName(h.name),
        icon: sanitizeIcon(h.icon),
        category: sanitizeCategory(h.category),
        goalPerMonth: sanitizeGoal(h.goalPerMonth),
        order: sanitizeOrder(idx),
        archived: Boolean(h.archived),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await habitBatch.commit();

    // Stage 2: Commit logs in chunks (habits now exist in Firestore)
    const entries: { newHabitId: string; dateKey: string }[] = [];
    for (const [key, val] of Object.entries(guestLogs)) {
      if (!val) continue;
      // Key format is `${habitId}_${YYYY-MM-DD}` (date is always last 10 chars)
      const dateKey = key.slice(-10);
      const oldHabitId = key.slice(0, -11);
      const newHabitId = idMap.get(oldHabitId);
      if (newHabitId && DATE_REGEX.test(dateKey)) {
        entries.push({ newHabitId, dateKey });
      }
    }

    for (let i = 0; i < entries.length; i += 400) {
      const logBatch = writeBatch(db);
      entries.slice(i, i + 400).forEach(({ newHabitId, dateKey }) => {
        const logId = `${newHabitId}_${dateKey}`;
        logBatch.set(doc(db, 'users', userId, 'logs', logId), {
          userId,
          habitId: newHabitId,
          date: dateKey,
          monthKey: dateKey.slice(0, 7),
          completed: true,
          createdAt: serverTimestamp(),
        });
      });
      await logBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${habitsPath} | ${logsPath}`);
  }
}
