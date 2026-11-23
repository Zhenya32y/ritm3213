/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Maps each adversarial payload from security_spec.md to expected PERMISSION_DENIED assertions.
 * Run with @firebase/rules-unit-testing against Firebase Emulator when testing locally.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Habit Create',
    operation: 'create',
    path: '/users/userA/habits/habit_1',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userB',
      name: 'Медитация',
      icon: 'sparkles',
      category: 'mindfulness',
      goalPerMonth: 20,
      order: 0,
      archived: false,
      createdAt: '__SERVER_TIME__',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant Read',
    operation: 'get',
    path: '/users/userB/habits/habit_1',
    auth: { uid: 'userA', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Tenant List',
    operation: 'list',
    path: '/users/userB/habits',
    auth: { uid: 'userA', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    operation: 'create',
    path: '/users/userA/habits/habit_shadow',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userA',
      name: 'Пить воду',
      icon: 'droplet',
      category: 'health',
      goalPerMonth: 30,
      order: 1,
      archived: false,
      isAdmin: true,
      createdAt: '__SERVER_TIME__',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Update Injection',
    operation: 'update',
    path: '/users/userA/habits/habit_1',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      name: 'Обновлено',
      ghostField: 'exploit',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/users/userA/habits/habit_unverified',
    auth: { uid: 'userA', email_verified: false },
    payload: {
      userId: 'userA',
      name: 'Бег',
      icon: 'footprints',
      category: 'sport',
      goalPerMonth: 15,
      order: 0,
      archived: false,
      createdAt: '__SERVER_TIME__',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Timestamp Forgery',
    operation: 'create',
    path: '/users/userA/habits/habit_forged_time',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userA',
      name: 'Чтение',
      icon: 'book-open',
      category: 'growth',
      goalPerMonth: 10,
      order: 2,
      archived: false,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Tampering',
    operation: 'update',
    path: '/users/userA/habits/habit_1',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userB',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Resource Exhaustion / Invalid ID Poisoning',
    operation: 'create',
    path: '/users/userA/habits/invalid$id..with..chars',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userA',
      name: 'A'.repeat(200),
      icon: 'sparkles',
      category: 'other',
      goalPerMonth: 10,
      order: 0,
      archived: false,
      createdAt: '__SERVER_TIME__',
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Goal Out-of-Bounds Value Poisoning',
    operation: 'update',
    path: '/users/userA/habits/habit_1',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      goalPerMonth: 999,
      updatedAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned Log Creation',
    operation: 'create',
    path: '/users/userA/logs/nonexistent_2026-11-22',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      userId: 'userA',
      habitId: 'nonexistent',
      date: '2026-11-22',
      monthKey: '2026-11',
      completed: true,
      createdAt: '__SERVER_TIME__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Log Mutation Attempt',
    operation: 'update',
    path: '/users/userA/logs/habit_1_2026-11-22',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      completed: false,
    },
    expected: 'PERMISSION_DENIED',
  },
];
