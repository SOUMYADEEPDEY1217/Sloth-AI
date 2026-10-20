/**
 * Firestore Security Rules Verification Specification (Dirty Dozen Test Suite)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  authUid: string | null;
  emailVerified?: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write to User Profile',
    operation: 'create',
    path: '/users/user_1',
    authUid: null,
    payload: { ownerId: 'user_1', displayName: 'Anon' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant Profile Read',
    operation: 'get',
    path: '/users/victim_uid',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Owner Spoofing on Create',
    operation: 'create',
    path: '/users/attacker_uid',
    authUid: 'attacker_uid',
    emailVerified: true,
    payload: { ownerId: 'victim_uid', displayName: 'Spoofer' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create (isAdmin: true)',
    operation: 'create',
    path: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_1',
      displayName: 'User 1',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Update (role: superuser)',
    operation: 'update',
    path: '/users/user_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      role: 'superuser',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable Field Mutation (ownerId)',
    operation: 'update',
    path: '/users/user_1/tasks/task_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Field Mutation (createdAt)',
    operation: 'update',
    path: '/users/user_1/tasks/task_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Client Timestamp on Create',
    operation: 'create',
    path: '/users/user_1/tasks/task_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_1',
      title: 'Valid Title',
      createdAt: '2099-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Orphaned Subcollection Write Without Parent User Profile',
    operation: 'create',
    path: '/users/nonexistent_user/tasks/task_1',
    authUid: 'nonexistent_user',
    emailVerified: true,
    payload: {
      ownerId: 'nonexistent_user',
      title: 'Orphan Task',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: '/users/user_1/tasks/bad$id!@#',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_1',
      title: 'Bad ID Task',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning / Oversized Title String',
    operation: 'update',
    path: '/users/user_1/tasks/task_1',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      title: 'x'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Cross-Tenant Subcollection List',
    operation: 'list',
    path: '/users/victim_uid/tasks',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
];
