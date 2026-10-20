import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ActivityEntry,
  AppSettings,
  BriefingResult,
  ExtractedTask,
  FileOrganizeItem,
  SummaryResult,
} from '../types';

// Initialize Firebase using the provisioned firebase-applet-config.json
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Blueprint volumetric & regex constants (synchronized with firebase-blueprint.json & firestore.rules)
export const BLUEPRINT_LIMITS = {
  ID_MAX_LEN: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MAX: 120,
  BACKEND_URL_MAX: 300,
  OLLAMA_URL_MAX: 300,
  MODEL_NAME_MAX: 120,
  TASK_TITLE_MAX: 300,
  TASK_DESC_MAX: 2000,
  TASK_DEADLINE_MAX: 160,
  TASK_EVIDENCE_MAX: 600,
  FILE_NAME_MAX: 260,
  FILE_REL_PATH_MAX: 400,
  FILE_EXT_MAX: 32,
  FILE_CAT_MAX: 100,
  FILE_FOLDER_MAX: 260,
  FILE_REASON_MAX: 600,
  SUMMARY_TITLE_MAX: 300,
  SUMMARY_EXEC_MAX: 5000,
  SUMMARY_POINTS_MAX: 4000,
  SUMMARY_TERMS_MAX: 1000,
  SUMMARY_NOTES_MAX: 1000,
  BRIEFING_SUMMARY_MAX: 4000,
  BRIEFING_INFO_MAX: 4000,
  BRIEFING_ACTIONS_MAX: 4000,
  BRIEFING_DEADLINES_MAX: 2000,
  BRIEFING_QUESTIONS_MAX: 2000,
  ACTIVITY_DESC_MAX: 1000,
  ACTIVITY_TS_MAX: 64,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function sanitizeDocId(rawId: string): string {
  const cleaned = rawId
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, BLUEPRINT_LIMITS.ID_MAX_LEN);
  return cleaned || `doc_${Date.now()}`;
}

function clampString(
  val: string | undefined | null,
  maxLen: number,
  minLen = 0,
  fallback = ''
): string {
  const str = (val ?? '').trim();
  if (str.length < minLen) {
    return fallback.slice(0, maxLen);
  }
  return str.slice(0, maxLen);
}

// Authentication methods
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  return credential.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  const cleanName = clampString(
    displayName,
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
    1,
    email.split('@')[0] || 'SlothAI User'
  );
  await updateProfile(credential.user, { displayName: cleanName });
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

// Ensure /users/{userId} profile exists in Firestore before subcollection writes (Master Gate invariant)
export async function ensureUserWorkspaceProfile(
  user: User,
  defaultSettings: AppSettings
): Promise<AppSettings> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        backendUrl:
          typeof data.backendUrl === 'string'
            ? data.backendUrl
            : defaultSettings.backendUrl,
        ollamaBaseUrl:
          typeof data.ollamaBaseUrl === 'string' && data.ollamaBaseUrl
            ? data.ollamaBaseUrl
            : defaultSettings.ollamaBaseUrl,
        modelName:
          typeof data.modelName === 'string' && data.modelName
            ? data.modelName
            : defaultSettings.modelName,
        theme: data.theme === 'light' ? 'light' : 'dark',
        defaultSummaryLength:
          data.defaultSummaryLength === 'short' ||
          data.defaultSummaryLength === 'detailed'
            ? data.defaultSummaryLength
            : 'balanced',
        retainActivityLog:
          typeof data.retainActivityLog === 'boolean'
            ? data.retainActivityLog
            : defaultSettings.retainActivityLog,
        maxActivityEntries:
          typeof data.maxActivityEntries === 'number'
            ? Math.max(10, Math.min(500, data.maxActivityEntries))
            : defaultSettings.maxActivityEntries,
      };
    }

    const displayName = clampString(
      user.displayName || user.email?.split('@')[0] || 'SlothAI User',
      BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
      1,
      'SlothAI User'
    );

    await setDoc(userRef, {
      ownerId: uid,
      displayName,
      backendUrl: clampString(
        defaultSettings.backendUrl,
        BLUEPRINT_LIMITS.BACKEND_URL_MAX
      ),
      ollamaBaseUrl: clampString(
        defaultSettings.ollamaBaseUrl,
        BLUEPRINT_LIMITS.OLLAMA_URL_MAX,
        1,
        'http://127.0.0.1:11434'
      ),
      modelName: clampString(
        defaultSettings.modelName,
        BLUEPRINT_LIMITS.MODEL_NAME_MAX,
        1,
        'qwen3:4b'
      ),
      theme: defaultSettings.theme === 'light' ? 'light' : 'dark',
      defaultSummaryLength: defaultSettings.defaultSummaryLength || 'balanced',
      retainActivityLog: Boolean(defaultSettings.retainActivityLog),
      maxActivityEntries: Math.max(
        10,
        Math.min(500, Number(defaultSettings.maxActivityEntries) || 100)
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return defaultSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function saveUserSettingsToFirestore(
  user: User,
  settings: AppSettings
): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  const displayName = clampString(
    user.displayName || user.email?.split('@')[0] || 'SlothAI User',
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
    1,
    'SlothAI User'
  );

  try {
    await updateDoc(userRef, {
      displayName,
      backendUrl: clampString(
        settings.backendUrl,
        BLUEPRINT_LIMITS.BACKEND_URL_MAX
      ),
      ollamaBaseUrl: clampString(
        settings.ollamaBaseUrl,
        BLUEPRINT_LIMITS.OLLAMA_URL_MAX,
        1,
        'http://127.0.0.1:11434'
      ),
      modelName: clampString(
        settings.modelName,
        BLUEPRINT_LIMITS.MODEL_NAME_MAX,
        1,
        'qwen3:4b'
      ),
      theme: settings.theme === 'light' ? 'light' : 'dark',
      defaultSummaryLength: settings.defaultSummaryLength || 'balanced',
      retainActivityLog: Boolean(settings.retainActivityLog),
      maxActivityEntries: Math.max(
        10,
        Math.min(500, Number(settings.maxActivityEntries) || 100)
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// Tasks Firestore persistence
export async function createUserTaskInFirestore(
  userId: string,
  task: ExtractedTask
): Promise<void> {
  const uid = userId;
  const taskId = sanitizeDocId(task.id);
  const path = `users/${uid}/tasks/${taskId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'tasks', taskId), {
      ownerId: uid,
      title: clampString(
        task.title,
        BLUEPRINT_LIMITS.TASK_TITLE_MAX,
        1,
        'Untitled Task'
      ),
      description: clampString(task.description, BLUEPRINT_LIMITS.TASK_DESC_MAX),
      deadline: clampString(task.deadline, BLUEPRINT_LIMITS.TASK_DEADLINE_MAX),
      priority: ['high', 'medium', 'low', 'unspecified'].includes(task.priority)
        ? task.priority
        : 'unspecified',
      prioritySource: ['explicit', 'inferred', 'none'].includes(
        task.prioritySource || 'none'
      )
        ? task.prioritySource || 'none'
        : 'none',
      sourceEvidence: clampString(
        task.sourceEvidence,
        BLUEPRINT_LIMITS.TASK_EVIDENCE_MAX
      ),
      completed: Boolean(task.completed),
      sourceOrigin: ['live-ollama', 'manual', 'demo-sample'].includes(
        task.sourceOrigin
      )
        ? task.sourceOrigin
        : 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleUserTaskCompletionInFirestore(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const uid = userId;
  const cleanTaskId = sanitizeDocId(taskId);
  const path = `users/${uid}/tasks/${cleanTaskId}`;

  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', cleanTaskId), {
      completed: Boolean(completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserTaskDetailsInFirestore(
  userId: string,
  task: ExtractedTask,
  updates: Partial<
    Pick<ExtractedTask, 'title' | 'description' | 'deadline' | 'priority'>
  >
): Promise<void> {
  const uid = userId;
  const cleanTaskId = sanitizeDocId(task.id);
  const path = `users/${uid}/tasks/${cleanTaskId}`;

  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', cleanTaskId), {
      title: clampString(
        updates.title ?? task.title,
        BLUEPRINT_LIMITS.TASK_TITLE_MAX,
        1,
        'Untitled Task'
      ),
      description: clampString(
        updates.description ?? task.description,
        BLUEPRINT_LIMITS.TASK_DESC_MAX
      ),
      deadline: clampString(
        updates.deadline !== undefined ? updates.deadline : task.deadline,
        BLUEPRINT_LIMITS.TASK_DEADLINE_MAX
      ),
      priority: ['high', 'medium', 'low', 'unspecified'].includes(
        updates.priority ?? task.priority
      )
        ? updates.priority ?? task.priority
        : 'unspecified',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserTaskFromFirestore(
  userId: string,
  taskId: string
): Promise<void> {
  const uid = userId;
  const cleanTaskId = sanitizeDocId(taskId);
  const path = `users/${uid}/tasks/${cleanTaskId}`;

  try {
    await deleteDoc(doc(db, 'users', uid, 'tasks', cleanTaskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Staged Files Firestore persistence
export async function createUserStagedFileInFirestore(
  userId: string,
  item: FileOrganizeItem
): Promise<void> {
  const uid = userId;
  const fileId = sanitizeDocId(item.id);
  const path = `users/${uid}/stagedFiles/${fileId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'stagedFiles', fileId), {
      ownerId: uid,
      originalName: clampString(
        item.originalName,
        BLUEPRINT_LIMITS.FILE_NAME_MAX,
        1,
        'file.txt'
      ),
      sourceRelativePath: clampString(
        item.sourceRelativePath || item.originalName,
        BLUEPRINT_LIMITS.FILE_REL_PATH_MAX,
        1,
        'file.txt'
      ),
      extension: clampString(item.extension, BLUEPRINT_LIMITS.FILE_EXT_MAX),
      sizeBytes: Math.max(0, Number(item.sizeBytes) || 0),
      suggestedCategory: clampString(
        item.suggestedCategory,
        BLUEPRINT_LIMITS.FILE_CAT_MAX,
        1,
        'General'
      ),
      suggestedFolder: clampString(
        item.suggestedFolder,
        BLUEPRINT_LIMITS.FILE_FOLDER_MAX,
        1,
        'organized'
      ),
      suggestedFilename: clampString(
        item.suggestedFilename,
        BLUEPRINT_LIMITS.FILE_NAME_MAX,
        1,
        'file.txt'
      ),
      reasoning: clampString(item.reasoning, BLUEPRINT_LIMITS.FILE_REASON_MAX),
      approved: Boolean(item.approved),
      status: ['pending', 'preview-validated', 'applied'].includes(item.status)
        ? item.status
        : 'pending',
      isDemoData: Boolean(item.isDemoData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserStagedFileInFirestore(
  userId: string,
  item: FileOrganizeItem
): Promise<void> {
  const uid = userId;
  const fileId = sanitizeDocId(item.id);
  const path = `users/${uid}/stagedFiles/${fileId}`;

  try {
    await updateDoc(doc(db, 'users', uid, 'stagedFiles', fileId), {
      approved: Boolean(item.approved),
      status: ['pending', 'preview-validated', 'applied'].includes(item.status)
        ? item.status
        : 'pending',
      suggestedFolder: clampString(
        item.suggestedFolder,
        BLUEPRINT_LIMITS.FILE_FOLDER_MAX,
        1,
        'organized'
      ),
      suggestedFilename: clampString(
        item.suggestedFilename,
        BLUEPRINT_LIMITS.FILE_NAME_MAX,
        1,
        'file.txt'
      ),
      sourceRelativePath: clampString(
        item.sourceRelativePath || item.originalName,
        BLUEPRINT_LIMITS.FILE_REL_PATH_MAX,
        1,
        'file.txt'
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserStagedFileFromFirestore(
  userId: string,
  fileId: string
): Promise<void> {
  const uid = userId;
  const cleanId = sanitizeDocId(fileId);
  const path = `users/${uid}/stagedFiles/${cleanId}`;

  try {
    await deleteDoc(doc(db, 'users', uid, 'stagedFiles', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Summaries Firestore persistence
export async function createUserSummaryInFirestore(
  userId: string,
  summary: SummaryResult
): Promise<void> {
  const uid = userId;
  const summaryId = sanitizeDocId(summary.id);
  const path = `users/${uid}/summaries/${summaryId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'summaries', summaryId), {
      ownerId: uid,
      title: clampString(
        summary.title,
        BLUEPRINT_LIMITS.SUMMARY_TITLE_MAX,
        1,
        'Document Summary'
      ),
      executiveSummary: clampString(
        summary.executiveSummary,
        BLUEPRINT_LIMITS.SUMMARY_EXEC_MAX,
        1,
        'Summary generated.'
      ),
      keyPointsText: clampString(
        summary.keyPoints.join('\n'),
        BLUEPRINT_LIMITS.SUMMARY_POINTS_MAX
      ),
      notableTermsText: clampString(
        summary.NotableTerms.join('\n'),
        BLUEPRINT_LIMITS.SUMMARY_TERMS_MAX
      ),
      uncertaintyNotes: clampString(
        summary.uncertaintyNotes,
        BLUEPRINT_LIMITS.SUMMARY_NOTES_MAX
      ),
      length: ['short', 'balanced', 'detailed'].includes(summary.length)
        ? summary.length
        : 'balanced',
      sourceWordCount: Math.max(0, Number(summary.sourceWordCount) || 0),
      summaryWordCount: Math.max(0, Number(summary.summaryWordCount) || 0),
      sourceType:
        summary.sourceType === 'sample-preview'
          ? 'sample-preview'
          : 'live-ollama',
      modelUsed: clampString(
        summary.modelUsed,
        BLUEPRINT_LIMITS.MODEL_NAME_MAX,
        1,
        'qwen3:4b'
      ),
      generatedAt: clampString(
        summary.generatedAt,
        BLUEPRINT_LIMITS.ACTIVITY_TS_MAX,
        1,
        new Date().toISOString()
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserSummaryFromFirestore(
  userId: string,
  summaryId: string
): Promise<void> {
  const uid = userId;
  const cleanId = sanitizeDocId(summaryId);
  const path = `users/${uid}/summaries/${cleanId}`;

  try {
    await deleteDoc(doc(db, 'users', uid, 'summaries', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Daily Briefings Firestore persistence
export async function createUserBriefingInFirestore(
  userId: string,
  briefing: BriefingResult
): Promise<void> {
  const uid = userId;
  const briefingId = sanitizeDocId(briefing.id);
  const path = `users/${uid}/briefings/${briefingId}`;

  const deadlinesFormatted = briefing.explicitDeadlines
    .map((d) => `${d.deadlineText}:::${d.item}`)
    .join('\n');

  try {
    await setDoc(doc(db, 'users', uid, 'briefings', briefingId), {
      ownerId: uid,
      conciseSummary: clampString(
        briefing.conciseSummary,
        BLUEPRINT_LIMITS.BRIEFING_SUMMARY_MAX,
        1,
        'Daily Briefing'
      ),
      importantInfoText: clampString(
        briefing.importantInformation.join('\n'),
        BLUEPRINT_LIMITS.BRIEFING_INFO_MAX
      ),
      actionItemsText: clampString(
        briefing.actionItems.join('\n'),
        BLUEPRINT_LIMITS.BRIEFING_ACTIONS_MAX
      ),
      deadlinesText: clampString(
        deadlinesFormatted,
        BLUEPRINT_LIMITS.BRIEFING_DEADLINES_MAX
      ),
      questionsText: clampString(
        briefing.followUpQuestions.join('\n'),
        BLUEPRINT_LIMITS.BRIEFING_QUESTIONS_MAX
      ),
      sourceMode:
        briefing.sourceMode === 'demo-sample' ? 'demo-sample' : 'live-ollama',
      modelUsed: clampString(
        briefing.modelUsed,
        BLUEPRINT_LIMITS.MODEL_NAME_MAX,
        1,
        'qwen3:4b'
      ),
      inputWordCount: Math.max(0, Number(briefing.inputWordCount) || 0),
      generatedAt: clampString(
        briefing.generatedAt,
        BLUEPRINT_LIMITS.ACTIVITY_TS_MAX,
        1,
        new Date().toISOString()
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserBriefingFromFirestore(
  userId: string,
  briefingId: string
): Promise<void> {
  const uid = userId;
  const cleanId = sanitizeDocId(briefingId);
  const path = `users/${uid}/briefings/${cleanId}`;

  try {
    await deleteDoc(doc(db, 'users', uid, 'briefings', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Activities Firestore persistence
export async function createUserActivityInFirestore(
  userId: string,
  entry: ActivityEntry
): Promise<void> {
  const uid = userId;
  const actId = sanitizeDocId(entry.id);
  const path = `users/${uid}/activities/${actId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'activities', actId), {
      ownerId: uid,
      type: entry.type,
      status: entry.status,
      description: clampString(
        entry.description,
        BLUEPRINT_LIMITS.ACTIVITY_DESC_MAX,
        1,
        'Workspace activity'
      ),
      sourceMode: entry.sourceMode || 'system',
      timestampIso: clampString(
        entry.timestamp,
        BLUEPRINT_LIMITS.ACTIVITY_TS_MAX,
        1,
        new Date().toISOString()
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserActivityFromFirestore(
  userId: string,
  activityId: string
): Promise<void> {
  const uid = userId;
  const cleanId = sanitizeDocId(activityId);
  const path = `users/${uid}/activities/${cleanId}`;

  try {
    await deleteDoc(doc(db, 'users', uid, 'activities', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time listeners for authenticated user's individual data
export function subscribeToUserWorkspaceData(
  userId: string,
  callbacks: {
    onTasks: (tasks: ExtractedTask[]) => void;
    onStagedFiles: (files: FileOrganizeItem[]) => void;
    onSummaries: (summaries: SummaryResult[]) => void;
    onBriefings: (briefings: BriefingResult[]) => void;
    onActivities: (activities: ActivityEntry[]) => void;
  }
): () => void {
  const uid = userId;

  const tasksPath = `users/${uid}/tasks`;
  const tasksQuery = query(
    collection(db, 'users', uid, 'tasks'),
    where('ownerId', '==', uid)
  );

  const unsubTasks = onSnapshot(
    tasksQuery,
    (snapshot) => {
      const list: ExtractedTask[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdTs =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString();
        return {
          id: docSnap.id,
          title: String(d.title || ''),
          description: String(d.description || ''),
          deadline: d.deadline ? String(d.deadline) : null,
          priority: d.priority || 'unspecified',
          prioritySource: d.prioritySource || 'none',
          sourceEvidence: d.sourceEvidence ? String(d.sourceEvidence) : null,
          completed: Boolean(d.completed),
          sourceOrigin: d.sourceOrigin || 'manual',
          createdAt: createdTs,
        };
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callbacks.onTasks(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, tasksPath);
    }
  );

  const filesPath = `users/${uid}/stagedFiles`;
  const filesQuery = query(
    collection(db, 'users', uid, 'stagedFiles'),
    where('ownerId', '==', uid)
  );

  const unsubFiles = onSnapshot(
    filesQuery,
    (snapshot) => {
      const list: FileOrganizeItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdTs =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate().toISOString()
            : null;
        return {
          id: docSnap.id,
          originalName: String(d.originalName || ''),
          sourceRelativePath: String(
            d.sourceRelativePath || d.originalName || ''
          ),
          extension: String(d.extension || ''),
          mimeType: 'application/octet-stream',
          sizeBytes: typeof d.sizeBytes === 'number' ? d.sizeBytes : null,
          lastModified: createdTs,
          suggestedCategory: String(d.suggestedCategory || 'General'),
          suggestedFolder: String(d.suggestedFolder || 'organized'),
          suggestedFilename: String(d.suggestedFilename || ''),
          reasoning: String(d.reasoning || ''),
          approved: Boolean(d.approved),
          status: d.status || 'pending',
          isDemoData: Boolean(d.isDemoData),
        };
      });
      callbacks.onStagedFiles(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, filesPath);
    }
  );

  const summariesPath = `users/${uid}/summaries`;
  const summariesQuery = query(
    collection(db, 'users', uid, 'summaries'),
    where('ownerId', '==', uid)
  );

  const unsubSummaries = onSnapshot(
    summariesQuery,
    (snapshot) => {
      const list: SummaryResult[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const keyPoints = String(d.keyPointsText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const notableTerms = String(d.notableTermsText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          id: docSnap.id,
          title: String(d.title || 'Summary'),
          executiveSummary: String(d.executiveSummary || ''),
          keyPoints,
          NotableTerms: notableTerms,
          uncertaintyNotes: d.uncertaintyNotes
            ? String(d.uncertaintyNotes)
            : null,
          length: d.length || 'balanced',
          sourceWordCount:
            typeof d.sourceWordCount === 'number' ? d.sourceWordCount : 0,
          summaryWordCount:
            typeof d.summaryWordCount === 'number' ? d.summaryWordCount : 0,
          generatedAt: String(d.generatedAt || new Date().toISOString()),
          sourceType: d.sourceType || 'live-ollama',
          modelUsed: String(d.modelUsed || 'qwen3:4b'),
        };
      });
      list.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
      callbacks.onSummaries(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, summariesPath);
    }
  );

  const briefingsPath = `users/${uid}/briefings`;
  const briefingsQuery = query(
    collection(db, 'users', uid, 'briefings'),
    where('ownerId', '==', uid)
  );

  const unsubBriefings = onSnapshot(
    briefingsQuery,
    (snapshot) => {
      const list: BriefingResult[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const importantInformation = String(d.importantInfoText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const actionItems = String(d.actionItemsText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const explicitDeadlines = String(d.deadlinesText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((line) => {
            const [deadlineText, ...rest] = line.split(':::');
            return {
              deadlineText: (deadlineText || '').trim(),
              item: rest.join(':::').trim() || line,
            };
          });
        const followUpQuestions = String(d.questionsText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

        return {
          id: docSnap.id,
          generatedAt: String(d.generatedAt || new Date().toISOString()),
          conciseSummary: String(d.conciseSummary || ''),
          importantInformation,
          actionItems,
          explicitDeadlines,
          followUpQuestions,
          sourceMode: d.sourceMode || 'live-ollama',
          modelUsed: String(d.modelUsed || 'qwen3:4b'),
          inputWordCount:
            typeof d.inputWordCount === 'number' ? d.inputWordCount : 0,
        };
      });
      list.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
      callbacks.onBriefings(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, briefingsPath);
    }
  );

  const activitiesPath = `users/${uid}/activities`;
  const activitiesQuery = query(
    collection(db, 'users', uid, 'activities'),
    where('ownerId', '==', uid)
  );

  const unsubActivities = onSnapshot(
    activitiesQuery,
    (snapshot) => {
      const list: ActivityEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          type: d.type || 'system',
          status: d.status || 'info',
          description: String(d.description || ''),
          sourceMode: d.sourceMode || 'system',
          timestamp: String(d.timestampIso || new Date().toISOString()),
        };
      });
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      callbacks.onActivities(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, activitiesPath);
    }
  );

  return () => {
    unsubTasks();
    unsubFiles();
    unsubSummaries();
    unsubBriefings();
    unsubActivities();
  };
}
