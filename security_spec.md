# Security Specification — Ритм (Habit Tracker)

## 1. Data Invariants

1. **Root Isolation (Owner-Only PII/Data)**: A user may ONLY read, list, create, update, or delete documents under `/users/{userId}` where `userId == request.auth.uid` and `request.auth.token.email_verified == true` for writes.
2. **Master Gate**: Every single-document operation (`get`, `create`, `update`, `delete`) on `/users/{userId}/habits/{habitId}` and `/users/{userId}/logs/{logId}` verifies that the parent `/users/{userId}` document exists and its `uid == request.auth.uid`.
3. **Referential Integrity**: A `HabitLog` document cannot be created unless its referenced parent `Habit` document at `/users/{userId}/habits/{habitId}` exists, and the log document ID matches `{habitId}_{date}`.
4. **Immutable Ownership & Timestamps**: `uid`, `userId`, `habitId`, and `createdAt` can never be mutated after creation. All `createdAt` and `updatedAt` timestamps must equal `request.time`.
5. **Strict Schema & Bounds**: No undeclared/shadow fields are allowed on create (`hasAll` + `hasOnly`) or update (`affectedKeys().hasOnly()`). All strings enforce `.size()` bounds and regex patterns; `goalPerMonth` is constrained to `1..31`; `order` is constrained to `0..1000`.
6. **Secure List Queries**: `allow list` on `habits` and `logs` explicitly enforces `resource.data.userId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Habit Create**: Authenticated as `userA`, attempt to create `/users/userA/habits/h1` with `userId: "userB"`. -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read**: Authenticated as `userA`, attempt to `get` `/users/userB/habits/h1`. -> `PERMISSION_DENIED`.
3. **Cross-Tenant List**: Authenticated as `userA`, attempt to `list` `/users/userB/habits`. -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Create a habit with an extra undocumented field `isAdmin: true` or `tier: "pro"`. -> `PERMISSION_DENIED`.
5. **Shadow Update Injection**: Update a habit including an extra unwhitelisted key `injected: "bad"`. -> `PERMISSION_DENIED`.
6. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a habit. -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Create a habit with a backdated client timestamp (`createdAt != request.time`). -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: Attempt to update `createdAt` or `userId` on an existing habit. -> `PERMISSION_DENIED`.
9. **Resource Exhaustion (1MB Name / Long ID)**: Attempt to create a habit with an 81+ character `name` or a 200-character document ID containing invalid characters (`../bad$id`). -> `PERMISSION_DENIED`.
10. **Goal Out-of-Bounds Poisoning**: Attempt to update `goalPerMonth` to `999` or `"thirty"` (invalid type/range). -> `PERMISSION_DENIED`.
11. **Orphaned Log Creation**: Attempt to create `/users/userA/logs/nonexistent_2026-11-22` referencing a `habitId` that does not exist in `/users/userA/habits/`. -> `PERMISSION_DENIED`.
12. **Log Mutation Attempt**: Attempt to `update` an existing `HabitLog` document instead of toggling via create/delete. -> `PERMISSION_DENIED`.
