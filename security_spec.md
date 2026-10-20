# SlothAI Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Tenant Isolation (`users/{userId}` Master Gate)**:
   - Every user profile document at `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId` and where `incoming().ownerId == userId`.
   - Every subcollection document (`/users/{userId}/tasks/{taskId}`, `/users/{userId}/stagedFiles/{fileId}`, `/users/{userId}/activities/{activityId}`) requires:
     - `request.auth != null`
     - `request.auth.uid == userId`
     - Parent workspace profile `/users/$(userId)` exists (`exists(/databases/$(database)/documents/users/$(userId))`) and is owned by `request.auth.uid`.
2. **PII Isolation**:
   - No email addresses, phone numbers, or street addresses are stored in `/users/{userId}` or any subcollection.
   - All reads (`get` and `list`) are strictly restricted to the owner (`request.auth.uid == userId && resource.data.ownerId == request.auth.uid`). No blanket `isSignedIn()` reads exist anywhere.
3. **Immutable & Server-Timestamped Fields**:
   - `ownerId` and `createdAt` are immutable across all updates (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
   - `createdAt` on `create` and `updatedAt` on `create`/`update` must equal `request.time`.
4. **Strict Key & Volumetric Boundaries**:
   - Every `create` checks `hasAll` and `hasOnly` for exact schema keys.
   - Every `update` invokes `isValid[Entity](incoming(), userId)` first and restricts modified keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
   - Every string field enforces explicit `.size()` bounds matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: Creating `/users/user_1` with `auth == null`.
2. **Cross-Tenant Profile Read (PII/Tenant Leak)**: User `attacker_uid` attempting `get` on `/users/victim_uid`.
3. **Owner Spoofing on Create**: User `attacker_uid` creating `/users/attacker_uid` with `ownerId: "victim_uid"`.
4. **Shadow Field Injection on Create**: Creating `/users/user_1` with extra key `"isAdmin": true`.
5. **Shadow Field Injection on Update**: Updating `/users/user_1` with extra key `"role": "superuser"`.
6. **Immutable Field Mutation (`ownerId`)**: Updating `/users/user_1/tasks/task_1` to change `ownerId`.
7. **Immutable Field Mutation (`createdAt`)**: Updating `/users/user_1/tasks/task_1` to alter `createdAt`.
8. **Forged Client Timestamp**: Creating `/users/user_1/tasks/task_1` with a past/future `createdAt != request.time`.
9. **Orphaned Subcollection Write**: Creating `/users/user_1/tasks/task_1` when parent `/users/user_1` does not exist.
10. **Path Variable ID Poisoning**: Creating `/users/user_1/tasks/invalid$id!@#` with non-alphanumeric path ID.
11. **Value Poisoning / Oversized Payload**: Updating `/users/user_1/tasks/task_1` with a 5,000-character `title` (exceeding `maxLength: 300`).
12. **Unauthorized Cross-Tenant Subcollection List**: User `attacker_uid` attempting `list` on `/users/victim_uid/tasks`.
