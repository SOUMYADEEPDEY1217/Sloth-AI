/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityEntry,
  ActivityStatus,
  ActivityType,
  AppSettings,
  BriefingResult,
  ConnectionCheckResult,
  ExtractedTask,
  FileOperationLog,
  FileOrganizeItem,
  NavSection,
  SummaryResult,
  ToastMessage,
} from './types';
import { verifyLocalConnection } from './services/localAiService';
import {
  auth,
  createUserActivityInFirestore,
  createUserBriefingInFirestore,
  createUserStagedFileInFirestore,
  createUserSummaryInFirestore,
  createUserTaskInFirestore,
  deleteUserActivityFromFirestore,
  deleteUserBriefingFromFirestore,
  deleteUserStagedFileFromFirestore,
  deleteUserSummaryFromFirestore,
  deleteUserTaskFromFirestore,
  ensureUserWorkspaceProfile,
  onAuthStateChanged,
  saveUserSettingsToFirestore,
  signOutUser,
  subscribeToUserWorkspaceData,
  toggleUserTaskCompletionInFirestore,
  updateUserStagedFileInFirestore,
  updateUserTaskDetailsInFirestore,
  User,
} from './services/firebaseService';
import { AppShell } from './components/AppShell';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/Toast';
import { CinematicLandingPage } from './pages/CinematicLandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { SummarizerPage } from './pages/SummarizerPage';
import { TaskExtractorPage } from './pages/TaskExtractorPage';
import { FileOrganizerPage } from './pages/FileOrganizerPage';
import { DailyBriefingPage } from './pages/DailyBriefingPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';

const STORAGE_KEYS = {
  SETTINGS: 'slothai_settings_v2',
  ACTIVITIES: 'slothai_activities_v2',
  TASKS: 'slothai_tasks_v2',
  FILES: 'slothai_staged_files_v2',
  SUMMARIES: 'slothai_summaries_v2',
  BRIEFINGS: 'slothai_briefings_v2',
};

const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || '',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  modelName: 'qwen3:4b',
  theme: 'dark',
  defaultSummaryLength: 'balanced',
  retainActivityLog: true,
  maxActivityEntries: 100,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [initialDraft, setInitialDraft] = useState<string | undefined>(
    undefined
  );

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>(
    'signin'
  );

  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );
  const [activities, setActivities] = useState<ActivityEntry[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    } catch {
      return [];
    }
  });
  const [tasks, setTasks] = useState<ExtractedTask[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.TASKS);
      return raw ? (JSON.parse(raw) as ExtractedTask[]) : [];
    } catch {
      return [];
    }
  });
  const [stagedFiles, setStagedFiles] = useState<FileOrganizeItem[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.FILES);
      return raw ? (JSON.parse(raw) as FileOrganizeItem[]) : [];
    } catch {
      return [];
    }
  });
  const [summaries, setSummaries] = useState<SummaryResult[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.SUMMARIES);
      return raw ? (JSON.parse(raw) as SummaryResult[]) : [];
    } catch {
      return [];
    }
  });
  const [briefings, setBriefings] = useState<BriefingResult[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.BRIEFINGS);
      return raw ? (JSON.parse(raw) as BriefingResult[]) : [];
    } catch {
      return [];
    }
  });
  const [fileOperationLogs, setFileOperationLogs] = useState<
    FileOperationLog[]
  >([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  const [connection, setConnection] = useState<ConnectionCheckResult>({
    state: 'unverified',
    backendUrl: settings.backendUrl || '/api (Local Backend)',
    backendReachable: false,
    backendVersion: null,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    ollamaReachable: false,
    modelName: settings.modelName,
    modelAvailable: false,
    availableModels: [],
    organizeRootConfigured: false,
    allowedOrganizeRoot: null,
    latencyMs: null,
    lastCheckedAt: null,
    errorDetail: null,
    recoveryHint: null,
  });

  const addToast = useCallback(
    (
      title: string,
      description?: string,
      variant: ToastMessage['variant'] = 'info'
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to Firebase Auth state & subscribe to per-user Firestore collections
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      setCurrentUser(user);

      if (user) {
        try {
          const cloudSettings = await ensureUserWorkspaceProfile(
            user,
            DEFAULT_SETTINGS
          );
          setSettings(cloudSettings);

          unsubFirestore = subscribeToUserWorkspaceData(user.uid, {
            onTasks: (cloudTasks) => {
              setTasks(cloudTasks);
            },
            onStagedFiles: (cloudFiles) => {
              setStagedFiles(cloudFiles);
            },
            onSummaries: (cloudSummaries) => {
              setSummaries(cloudSummaries);
            },
            onBriefings: (cloudBriefings) => {
              setBriefings(cloudBriefings);
            },
            onActivities: (cloudActivities) => {
              setActivities(cloudActivities);
            },
          });
        } catch (err) {
          console.error('Failed to initialize user Firestore profile:', err);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Sync theme class on <html> and persist settings to localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  // Persist activities to localStorage as fallback when signed out
  useEffect(() => {
    if (currentUser) return;
    try {
      if (settings.retainActivityLog) {
        window.localStorage.setItem(
          STORAGE_KEYS.ACTIVITIES,
          JSON.stringify(activities.slice(0, settings.maxActivityEntries))
        );
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
      }
    } catch {
      // Ignore storage errors
    }
  }, [
    activities,
    settings.retainActivityLog,
    settings.maxActivityEntries,
    currentUser,
  ]);

  // Persist tasks to localStorage as fallback when signed out
  useEffect(() => {
    if (currentUser) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch {
      // Ignore storage errors
    }
  }, [tasks, currentUser]);

  // Persist staged files to localStorage as fallback when signed out
  useEffect(() => {
    if (currentUser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.FILES,
        JSON.stringify(stagedFiles)
      );
    } catch {
      // Ignore storage errors
    }
  }, [stagedFiles, currentUser]);

  // Persist summaries to localStorage as fallback when signed out
  useEffect(() => {
    if (currentUser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.SUMMARIES,
        JSON.stringify(summaries)
      );
    } catch {
      // Ignore storage errors
    }
  }, [summaries, currentUser]);

  // Persist briefings to localStorage as fallback when signed out
  useEffect(() => {
    if (currentUser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.BRIEFINGS,
        JSON.stringify(briefings)
      );
    } catch {
      // Ignore storage errors
    }
  }, [briefings, currentUser]);

  const logActivity = useCallback(
    (
      type: ActivityType,
      status: ActivityStatus,
      description: string,
      sourceMode?: ActivityEntry['sourceMode']
    ) => {
      const entry: ActivityEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        timestamp: new Date().toISOString(),
        status,
        description,
        sourceMode,
      };
      setActivities((prev) =>
        [entry, ...prev].slice(0, settings.maxActivityEntries)
      );
      if (currentUser && settings.retainActivityLog) {
        createUserActivityInFirestore(currentUser.uid, entry).catch((err) =>
          console.error('Failed to sync activity to Firestore:', err)
        );
      }
    },
    [settings.maxActivityEntries, settings.retainActivityLog, currentUser]
  );

  const handleSaveSummary = useCallback(
    (summary: SummaryResult) => {
      setSummaries((prev) => [
        summary,
        ...prev.filter((s) => s.id !== summary.id),
      ]);
      if (currentUser) {
        createUserSummaryInFirestore(currentUser.uid, summary).catch((err) =>
          console.error('Failed to save summary to Firestore:', err)
        );
      }
    },
    [currentUser]
  );

  const handleDeleteSummary = useCallback(
    (summaryId: string) => {
      setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
      if (currentUser) {
        deleteUserSummaryFromFirestore(currentUser.uid, summaryId).catch(
          (err) => console.error('Failed to delete summary from Firestore:', err)
        );
      }
    },
    [currentUser]
  );

  const handleSaveBriefing = useCallback(
    (briefing: BriefingResult) => {
      setBriefings((prev) => [
        briefing,
        ...prev.filter((b) => b.id !== briefing.id),
      ]);
      if (currentUser) {
        createUserBriefingInFirestore(currentUser.uid, briefing).catch((err) =>
          console.error('Failed to save briefing to Firestore:', err)
        );
      }
    },
    [currentUser]
  );

  const handleDeleteBriefing = useCallback(
    (briefingId: string) => {
      setBriefings((prev) => prev.filter((b) => b.id !== briefingId));
      if (currentUser) {
        deleteUserBriefingFromFirestore(currentUser.uid, briefingId).catch(
          (err) =>
            console.error('Failed to delete briefing from Firestore:', err)
        );
      }
    },
    [currentUser]
  );

  // Wrapper for tasks state updates that also syncs changes to the signed-in user's Firestore collection
  const handleSetTasks: React.Dispatch<React.SetStateAction<ExtractedTask[]>> =
    useCallback(
      (updater) => {
        setTasks((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater;

          if (currentUser) {
            const prevMap = new Map(prev.map((t) => [t.id, t]));
            const nextMap = new Map(next.map((t) => [t.id, t]));

            for (const item of next) {
              const old = prevMap.get(item.id);
              if (!old) {
                createUserTaskInFirestore(currentUser.uid, item).catch((e) =>
                  console.error('Failed to create task in Firestore:', e)
                );
              } else if (old.completed !== item.completed) {
                toggleUserTaskCompletionInFirestore(
                  currentUser.uid,
                  item.id,
                  item.completed
                ).catch((e) =>
                  console.error('Failed to toggle task in Firestore:', e)
                );
              } else if (
                old.title !== item.title ||
                old.description !== item.description ||
                old.deadline !== item.deadline ||
                old.priority !== item.priority
              ) {
                updateUserTaskDetailsInFirestore(currentUser.uid, old, {
                  title: item.title,
                  description: item.description,
                  deadline: item.deadline,
                  priority: item.priority,
                }).catch((e) =>
                  console.error('Failed to update task in Firestore:', e)
                );
              }
            }

            for (const old of prev) {
              if (!nextMap.has(old.id)) {
                deleteUserTaskFromFirestore(currentUser.uid, old.id).catch(
                  (e) =>
                    console.error('Failed to delete task from Firestore:', e)
                );
              }
            }
          }

          return next;
        });
      },
      [currentUser]
    );

  // Wrapper for stagedFiles state updates that also syncs changes to the signed-in user's Firestore collection
  const handleSetStagedFiles: React.Dispatch<
    React.SetStateAction<FileOrganizeItem[]>
  > = useCallback(
    (updater) => {
      setStagedFiles((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

        if (currentUser) {
          const prevMap = new Map(prev.map((f) => [f.id, f]));
          const nextMap = new Map(next.map((f) => [f.id, f]));

          for (const item of next) {
            const old = prevMap.get(item.id);
            if (!old) {
              createUserStagedFileInFirestore(currentUser.uid, item).catch(
                (e) =>
                  console.error('Failed to create staged file in Firestore:', e)
              );
            } else if (
              old.approved !== item.approved ||
              old.status !== item.status ||
              old.suggestedFolder !== item.suggestedFolder ||
              old.suggestedFilename !== item.suggestedFilename ||
              old.sourceRelativePath !== item.sourceRelativePath
            ) {
              updateUserStagedFileInFirestore(currentUser.uid, item).catch(
                (e) =>
                  console.error('Failed to update staged file in Firestore:', e)
              );
            }
          }

          for (const old of prev) {
            if (!nextMap.has(old.id)) {
              deleteUserStagedFileFromFirestore(currentUser.uid, old.id).catch(
                (e) =>
                  console.error('Failed to delete staged file in Firestore:', e)
              );
            }
          }
        }

        return next;
      });
    },
    [currentUser]
  );

  const runConnectionCheck = useCallback(
    async (overrideSettings?: AppSettings, logResult = false) => {
      const target = overrideSettings || settings;
      setConnection((prev) => ({
        ...prev,
        state: 'checking',
        backendUrl: target.backendUrl || '/api (Local Backend)',
        ollamaBaseUrl: target.ollamaBaseUrl,
        modelName: target.modelName,
      }));

      const res = await verifyLocalConnection(target, logResult);
      setConnection(res);

      if (logResult) {
        if (res.state === 'ready') {
          logActivity(
            'connection_test',
            'success',
            `Verified backend & Ollama (${res.modelName} ready in ${res.latencyMs}ms).`,
            'live-ollama'
          );
          addToast(
            'Backend & Model Ready',
            `Verified ${res.modelName} at ${res.ollamaBaseUrl} (${res.latencyMs}ms).`,
            'success'
          );
        } else if (res.state === 'backend-online-model-missing') {
          logActivity(
            'connection_test',
            'warning',
            `Backend & Ollama online, but model '${res.modelName}' is not installed yet.`,
            'system'
          );
          addToast(
            'Model not yet downloaded',
            res.recoveryHint || `Pull '${res.modelName}' in Settings.`,
            'warning'
          );
        } else if (res.state === 'backend-online-ollama-offline') {
          logActivity(
            'connection_test',
            'warning',
            `Backend online (v${res.backendVersion}), but local Ollama (${res.ollamaBaseUrl}) is unreachable.`,
            'system'
          );
          addToast(
            'Backend Online · Ollama Offline',
            res.recoveryHint || 'Ensure ollama serve is running locally.',
            'warning'
          );
        } else {
          logActivity(
            'connection_test',
            'error',
            `Backend unreachable at ${res.backendUrl}.`,
            'system'
          );
          addToast(
            'Backend Unreachable',
            res.errorDetail || 'Start the FastAPI backend via run_backend.bat.',
            'error'
          );
        }
      }
    },
    [settings, logActivity, addToast]
  );

  // Initial honest verification on mount
  useEffect(() => {
    runConnectionCheck(undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      const map: Record<string, NavSection> = {
        '1': 'overview',
        '2': 'summarizer',
        '3': 'tasks',
        '4': 'organizer',
        '5': 'briefing',
        '6': 'activity',
        '7': 'settings',
      };
      if (map[key]) {
        e.preventDefault();
        setActiveSection(map[key]);
        setViewMode('workspace');
      } else if (key === '0') {
        e.preventDefault();
        setViewMode('landing');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else if (key === 't') {
        e.preventDefault();
        handleToggleTheme();
      } else if (key === 'k') {
        e.preventDefault();
        setIsShortcutModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleTheme]);

  const handleNavigate = (section: NavSection, draft?: string) => {
    if (draft !== undefined) {
      setInitialDraft(draft);
    }
    setActiveSection(section);
    setViewMode('workspace');
  };

  const handleLaunchFromLanding = (targetSection: NavSection = 'overview') => {
    setActiveSection(targetSection);
    setViewMode('workspace');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      addToast(
        'Signed out',
        'Switched back to local browser session.',
        'info'
      );
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (currentUser) {
      saveUserSettingsToFirestore(currentUser, newSettings).catch((e) =>
        console.error('Failed to save settings to Firestore:', e)
      );
    }
    logActivity(
      'settings_update',
      'info',
      `Updated settings (Backend: ${newSettings.backendUrl || '/api'}, Ollama: ${newSettings.ollamaBaseUrl}, Model: ${newSettings.modelName}).`,
      'system'
    );
    runConnectionCheck(newSettings, false);
  };

  const handleClearActivityHistory = () => {
    if (currentUser) {
      for (const act of activities) {
        deleteUserActivityFromFirestore(currentUser.uid, act.id).catch((e) =>
          console.error('Failed to delete activity from Firestore:', e)
        );
      }
    }
    setActivities([]);
  };

  const handleClearAllAppData = () => {
    if (currentUser) {
      for (const t of tasks) {
        deleteUserTaskFromFirestore(currentUser.uid, t.id).catch(() => {});
      }
      for (const f of stagedFiles) {
        deleteUserStagedFileFromFirestore(currentUser.uid, f.id).catch(
          () => {}
        );
      }
      for (const s of summaries) {
        deleteUserSummaryFromFirestore(currentUser.uid, s.id).catch(() => {});
      }
      for (const b of briefings) {
        deleteUserBriefingFromFirestore(currentUser.uid, b.id).catch(() => {});
      }
      for (const a of activities) {
        deleteUserActivityFromFirestore(currentUser.uid, a.id).catch(() => {});
      }
    }
    window.localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    window.localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    window.localStorage.removeItem(STORAGE_KEYS.TASKS);
    window.localStorage.removeItem(STORAGE_KEYS.FILES);
    window.localStorage.removeItem(STORAGE_KEYS.SUMMARIES);
    window.localStorage.removeItem(STORAGE_KEYS.BRIEFINGS);
    setSettings(DEFAULT_SETTINGS);
    setActivities([]);
    setTasks([]);
    setStagedFiles([]);
    setSummaries([]);
    setBriefings([]);
    setFileOperationLogs([]);
  };

  return (
    <>
      {viewMode === 'landing' ? (
        <>
          <CinematicLandingPage
            connection={connection}
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            onSignOut={handleSignOut}
            onLaunchAssistant={handleLaunchFromLanding}
          />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      ) : (
        <AppShell
          activeSection={activeSection}
          onSelectSection={(sec) => handleNavigate(sec)}
          connection={connection}
          theme={settings.theme}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onToggleTheme={handleToggleTheme}
          onRetestConnection={() => runConnectionCheck(undefined, true)}
          toasts={toasts}
          onDismissToast={dismissToast}
          isShortcutModalOpen={isShortcutModalOpen}
          onOpenShortcuts={() => setIsShortcutModalOpen(true)}
          onCloseShortcuts={() => setIsShortcutModalOpen(false)}
          onBackToWebsite={() => {
            setViewMode('landing');
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        >
          {activeSection === 'overview' && (
            <OverviewPage
              settings={settings}
              connection={connection}
              currentUser={currentUser}
              tasks={tasks}
              stagedFiles={stagedFiles}
              summaries={summaries}
              briefings={briefings}
              activities={activities}
              onOpenAuth={handleOpenAuth}
              onSignOut={handleSignOut}
              onNavigate={handleNavigate}
              onRetestConnection={() => runConnectionCheck(undefined, true)}
              onNotify={addToast}
            />
          )}

          {activeSection === 'summarizer' && (
            <SummarizerPage
              settings={settings}
              connection={connection}
              savedSummaries={summaries}
              onSaveSummary={handleSaveSummary}
              onDeleteSummary={handleDeleteSummary}
              initialDraft={initialDraft}
              onClearInitialDraft={() => setInitialDraft(undefined)}
              onLogActivity={logActivity}
              onNotify={addToast}
            />
          )}

          {activeSection === 'tasks' && (
            <TaskExtractorPage
              settings={settings}
              connection={connection}
              tasks={tasks}
              onSetTasks={handleSetTasks}
              initialDraft={initialDraft}
              onClearInitialDraft={() => setInitialDraft(undefined)}
              onLogActivity={logActivity}
              onNotify={addToast}
            />
          )}

          {activeSection === 'organizer' && (
            <FileOrganizerPage
              settings={settings}
              connection={connection}
              files={stagedFiles}
              onSetFiles={handleSetStagedFiles}
              operationLogs={fileOperationLogs}
              onAddOperationLog={(log) =>
                setFileOperationLogs((prev) => [log, ...prev])
              }
              onLogActivity={logActivity}
              onNotify={addToast}
            />
          )}

          {activeSection === 'briefing' && (
            <DailyBriefingPage
              settings={settings}
              connection={connection}
              savedBriefings={briefings}
              onSaveBriefing={handleSaveBriefing}
              onDeleteBriefing={handleDeleteBriefing}
              initialDraft={initialDraft}
              onClearInitialDraft={() => setInitialDraft(undefined)}
              onLogActivity={logActivity}
              onNotify={addToast}
            />
          )}

          {activeSection === 'activity' && (
            <ActivityPage
              entries={activities}
              onClearHistory={handleClearActivityHistory}
              onNavigate={(sec) => handleNavigate(sec)}
              onNotify={addToast}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsPage
              settings={settings}
              connection={connection}
              onUpdateSettings={handleUpdateSettings}
              onTestConnection={(candidate) =>
                runConnectionCheck(candidate, true)
              }
              onClearAllAppData={handleClearAllAppData}
              onLogActivity={logActivity}
              onNotify={addToast}
            />
          )}
        </AppShell>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => addToast('Firebase Authentication', msg, 'success')}
      />
    </>
  );
}
