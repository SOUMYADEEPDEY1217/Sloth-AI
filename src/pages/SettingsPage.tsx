import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Cpu,
  DownloadCloud,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  ConnectionCheckResult,
  InstalledModelInfo,
  SummaryLength,
  ThemeMode,
} from '../types';
import {
  BackendApiError,
  fetchInstalledModels,
  pullModelViaBackend,
} from '../services/localAiService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';

interface SettingsPageProps {
  settings: AppSettings;
  connection: ConnectionCheckResult;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onTestConnection: (overrideSettings?: AppSettings) => void;
  onClearAllAppData: () => void;
  onLogActivity: (
    type: 'model_pull' | 'connection_test' | 'settings_update',
    status: 'success' | 'warning' | 'error' | 'info',
    description: string,
    sourceMode?: 'live-ollama' | 'system'
  ) => void;
  onNotify: (
    title: string,
    description?: string,
    variant?: 'success' | 'warning' | 'error' | 'info'
  ) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  connection,
  onUpdateSettings,
  onTestConnection,
  onClearAllAppData,
  onLogActivity,
  onNotify,
}) => {
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(settings.ollamaBaseUrl);
  const [modelName, setModelName] = useState(settings.modelName);
  const [theme] = useState<ThemeMode>('dark');
  const [defaultSummaryLength, setDefaultSummaryLength] =
    useState<SummaryLength>(settings.defaultSummaryLength);
  const [retainActivityLog, setRetainActivityLog] = useState(
    settings.retainActivityLog
  );
  const [maxActivityEntries, setMaxActivityEntries] = useState(
    settings.maxActivityEntries
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    setBackendUrl(settings.backendUrl);
    setOllamaBaseUrl(settings.ollamaBaseUrl);
    setModelName(settings.modelName);
    setDefaultSummaryLength(settings.defaultSummaryLength);
    setRetainActivityLog(settings.retainActivityLog);
    setMaxActivityEntries(settings.maxActivityEntries);
  }, [settings]);

  // Model pull & model list state
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<InstalledModelInfo[]>(
    connection.availableModels
  );
  const [pullModelTag, setPullModelTag] = useState(
    settings.modelName || 'qwen3:4b'
  );
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatusMessage, setPullStatusMessage] = useState<string | null>(
    null
  );

  const validateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    const trimmedBackend = backendUrl.trim();
    if (trimmedBackend && trimmedBackend !== '/api') {
      try {
        const parsed = new URL(trimmedBackend);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setUrlError('Backend URL must use http:// or https:// protocol.');
          return;
        }
      } catch {
        setUrlError(
          'Enter a valid Backend URL (e.g., http://127.0.0.1:8000) or leave blank for /api.'
        );
        return;
      }
    }

    const trimmedOllama = ollamaBaseUrl.trim() || 'http://127.0.0.1:11434';
    try {
      const parsedOllama = new URL(trimmedOllama);
      if (!['http:', 'https:'].includes(parsedOllama.protocol)) {
        setUrlError('Ollama URL must use http:// or https:// protocol.');
        return;
      }
    } catch {
      setUrlError(
        'Enter a valid Local Ollama URL (default: http://127.0.0.1:11434).'
      );
      return;
    }

    const updated: AppSettings = {
      backendUrl: trimmedBackend,
      ollamaBaseUrl: trimmedOllama,
      modelName: modelName.trim() || 'qwen3:4b',
      theme,
      defaultSummaryLength,
      retainActivityLog,
      maxActivityEntries: Math.max(
        10,
        Math.min(500, Number(maxActivityEntries) || 100)
      ),
    };

    onUpdateSettings(updated);
    onNotify(
      'Settings saved',
      `Configured model "${updated.modelName}" via local backend.`,
      'success'
    );
  };

  const handleTestNow = () => {
    const candidate: AppSettings = {
      ...settings,
      backendUrl: backendUrl.trim(),
      ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
      modelName: modelName.trim() || 'qwen3:4b',
    };
    onTestConnection(candidate);
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const candidate: AppSettings = {
        ...settings,
        backendUrl: backendUrl.trim(),
        ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
      };
      const models = await fetchInstalledModels(candidate);
      setFetchedModels(models);
      onNotify(
        'Installed models refreshed',
        `Found ${models.length} installed model(s) in local Ollama.`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof BackendApiError
          ? err.message
          : 'Could not query /api/models.';
      onNotify('Failed to fetch models', msg, 'warning');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handlePullModel = async () => {
    const target = pullModelTag.trim();
    if (!target) return;

    setIsPulling(true);
    setPullStatusMessage(
      `Requesting local Ollama to pull '${target}' via POST /api/models/pull...`
    );

    try {
      const candidate: AppSettings = {
        ...settings,
        backendUrl: backendUrl.trim(),
        ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
      };
      const res = await pullModelViaBackend(target, candidate);
      setPullStatusMessage(res.detail);
      setModelName(target);
      onLogActivity(
        'model_pull',
        'success',
        `Pulled model '${target}' via POST /api/models/pull (${res.status}).`,
        'live-ollama'
      );
      onNotify('Model pull completed', res.detail, 'success');
      onTestConnection({ ...candidate, modelName: target });
    } catch (err) {
      const msg =
        err instanceof BackendApiError
          ? `${err.message}${err.recoveryHint ? ` (${err.recoveryHint})` : ''}`
          : 'Model pull failed.';
      setPullStatusMessage(`Error: ${msg}`);
      onLogActivity('model_pull', 'error', `Model pull failed for '${target}': ${msg}`);
      onNotify('Model pull failed', msg, 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const recommendedModels = [
    'qwen3:4b',
    'llama3.2:3b',
    'llama3.2:latest',
    'qwen2.5:7b',
    'mistral:latest',
    'gemma2:9b',
  ];

  const displayModels =
    fetchedModels.length > 0 ? fetchedModels : connection.availableModels;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
          [ 06 · ENGINE CONFIGURATION ]
        </span>
        <h1 className="mt-1 text-2xl font-display font-bold tracking-tight text-[#F5F5F5]">
          Workspace &amp; Local AI Backend Settings
        </h1>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Configure your FastAPI backend URL, local Ollama endpoint, installed
          open-weight models (default suggestion: <code className="font-mono text-[#FF9A35]">qwen3:4b</code>), and privacy controls.
        </p>
      </div>

      <form onSubmit={validateAndSave} className="space-y-6">
        {/* 1. Backend & Ollama Connection Settings */}
        <section className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#FF9A35]" />
              <h2 className="text-base font-display font-semibold text-[#F5F5F5]">
                Backend &amp; Local Ollama Configuration
              </h2>
            </div>

            {connection.state === 'ready' ? (
              <StatusBadge
                status="success"
                label={`Ready · ${connection.modelName}`}
                detail={`${connection.latencyMs ?? 0}ms`}
              />
            ) : connection.state === 'backend-online-model-missing' ? (
              <StatusBadge
                status="warning"
                label={`Backend & Ollama Online · Missing '${connection.modelName}'`}
              />
            ) : connection.state === 'backend-online-ollama-offline' ? (
              <StatusBadge
                status="warning"
                label="Backend Online · Ollama Offline"
              />
            ) : (
              <StatusBadge
                status="error"
                label="Backend Unreachable"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-backend-url"
                className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA] mb-1.5"
              >
                FastAPI Backend Base URL
              </label>
              <input
                id="settings-backend-url"
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="Leave blank for /api or set http://127.0.0.1:8000"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A]"
              />
              <p className="mt-1 text-[11px] text-[#71717A]">
                Browser requests route strictly to this backend, never directly to Ollama.
              </p>
            </div>

            <div>
              <label
                htmlFor="settings-ollama-url"
                className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA] mb-1.5"
              >
                Local Ollama Service Address (Used by Backend)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-ollama-url"
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A]"
                />
                <button
                  type="button"
                  onClick={handleTestNow}
                  disabled={connection.state === 'checking'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-[#FF6B1A]/35 bg-[#FF6B1A]/15 text-[#FF9A35] hover:bg-[#FF6B1A]/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      connection.state === 'checking' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {urlError && (
              <div className="md:col-span-2 text-xs text-[#F87171]">
                {urlError}
              </div>
            )}

            {connection.errorDetail && (
              <div className="md:col-span-2 p-3.5 rounded-xl bg-[#060606] border border-white/[0.08] text-xs text-[#A1A1AA]">
                <p className="font-semibold text-[#F5F5F5]">
                  Connection Diagnostic: {connection.errorDetail}
                </p>
                {connection.recoveryHint && (
                  <p className="mt-1 text-[#FF9A35]">Recovery: {connection.recoveryHint}</p>
                )}
              </div>
            )}

            {/* Active Model Selection */}
            <div className="md:col-span-2 pt-3 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="settings-model-name"
                  className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA]"
                >
                  Selected Open-Weight Model (Default suggestion: qwen3:4b)
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels}
                  className="inline-flex items-center gap-1 text-xs font-mono text-[#FF9A35] hover:underline cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`}
                  />
                  <span>Query Installed Models (/api/models)</span>
                </button>
              </div>

              <input
                id="settings-model-name"
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="qwen3:4b"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
              />

              {displayModels.length > 0 ? (
                <div className="mt-3">
                  <span className="block text-[11px] font-mono text-[#71717A] mb-1.5">
                    Installed Models Detected in Local Ollama:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {displayModels.map((m) => (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => setModelName(m.name)}
                        className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-colors cursor-pointer ${
                          modelName === m.name
                            ? 'border-[#FF6B1A]/50 bg-[#FF6B1A]/15 text-[#FF9A35] font-semibold'
                            : 'border-white/12 bg-[#060606] text-[#F5F5F5] hover:border-white/25'
                        }`}
                      >
                        {m.name}
                        {m.parameter_size ? ` (${m.parameter_size})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-[#71717A]">
                    Suggested open-weight tags:
                  </span>
                  {recommendedModels.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setModelName(tag);
                        setPullModelTag(tag);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-full border transition-colors cursor-pointer ${
                        modelName === tag
                          ? 'border-[#FF6B1A]/50 bg-[#FF6B1A]/15 text-[#FF9A35] font-semibold'
                          : 'border-white/12 bg-[#060606] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-white/25'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Explicit User-Initiated Model Pull Section (POST /api/models/pull) */}
        <section className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-4">
          <div className="flex items-center gap-2.5">
            <DownloadCloud className="w-4 h-4 text-[#FF9A35]" />
            <h2 className="text-base font-display font-semibold text-[#F5F5F5]">
              Download / Pull Model on Explicit Request (POST /api/models/pull)
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            SlothAI never downloads models automatically on page load. If Ollama is
            running locally and you want to pull a model tag (such as{' '}
            <code className="font-mono text-[#FF9A35]">qwen3:4b</code>), enter the tag below and
            click Pull Model. Ensure your system has sufficient RAM/VRAM for the
            selected model size.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={pullModelTag}
              onChange={(e) => setPullModelTag(e.target.value)}
              placeholder="qwen3:4b"
              aria-label="Model tag to pull"
              className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
            />
            <button
              type="button"
              onClick={handlePullModel}
              disabled={isPulling || !pullModelTag.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isPulling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pulling Model...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Pull Model via Backend</span>
                </>
              )}
            </button>
          </div>

          {pullStatusMessage && (
            <div className="p-3.5 rounded-xl bg-[#060606] border border-white/[0.08] text-xs font-mono text-[#F5F5F5]">
              {pullStatusMessage}
            </div>
          )}
        </section>

        {/* 2. Interface & Workflow Preferences */}
        <section className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-5">
          <h2 className="text-base font-display font-semibold text-[#F5F5F5] pb-3 border-b border-white/[0.08]">
            Appearance &amp; Workflow Defaults
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-theme"
                className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA] mb-1.5"
              >
                Workspace Visual System
              </label>
              <div
                id="settings-theme"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-[#FF6B1A]/35 bg-[#060606] text-[#FF9A35]"
              >
                Cinematic Obsidian &amp; Amber-Orange (#060606 / #FF6B1A)
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-summary-length"
                className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA] mb-1.5"
              >
                Default Summary Length
              </label>
              <select
                id="settings-summary-length"
                value={defaultSummaryLength}
                onChange={(e) =>
                  setDefaultSummaryLength(e.target.value as SummaryLength)
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
              >
                <option value="short">Short (2 sentences + 3 bullets)</option>
                <option value="balanced">Balanced (1 paragraph + 5 takeaways)</option>
                <option value="detailed">Detailed (Comprehensive synthesis)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Privacy & Data Retention Controls */}
        <section className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <Shield className="w-4 h-4 text-[#FF9A35]" />
            <h2 className="text-base font-display font-semibold text-[#F5F5F5]">
              Privacy &amp; Local Data Retention
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            <div className="flex items-start gap-3">
              <input
                id="settings-retain-activity"
                type="checkbox"
                checked={retainActivityLog}
                onChange={(e) => setRetainActivityLog(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060606] accent-[#FF6B1A] cursor-pointer"
              />
              <div>
                <label
                  htmlFor="settings-retain-activity"
                  className="text-xs font-semibold text-[#F5F5F5] cursor-pointer"
                >
                  Retain Local Activity Log in Browser Storage
                </label>
                <p className="mt-0.5 text-[11px] text-[#71717A]">
                  When enabled, SlothAI saves timestamps and summaries of your actions in
                  localStorage so they persist across page reloads.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-max-entries"
                className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A1A1AA] mb-1.5"
              >
                Maximum Retained Activity Entries (10 – 500)
              </label>
              <input
                id="settings-max-entries"
                type="number"
                min={10}
                max={500}
                value={maxActivityEntries}
                onChange={(e) => setMaxActivityEntries(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-red-500/30 text-[#F87171] hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Local Application Data</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </section>
      </form>

      {/* Application Version & Open-Source Project Information */}
      <section className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Code2 className="w-4 h-4 text-[#FF9A35] mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xs font-semibold text-[#F5F5F5]">
              SlothAI · Open-Source Local Productivity Workspace
            </h2>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Built for the &ldquo;Slow and Steady&rdquo; open-source AI building
              challenge. Theme: &ldquo;Work less. Automate more. Stay slow.&rdquo;
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[#71717A] shrink-0">
          <span>Version {connection.backendVersion || '0.2.0'}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-[#4ADE80]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>FastAPI + Ollama Local Stack</span>
          </span>
        </div>
      </section>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Clear All Local Application Data?"
        description="This will erase all saved tasks, staged file organization items, activity history, and custom settings from your browser's localStorage and restore factory defaults."
        confirmLabel="Erase All Local Data"
        variant="danger"
        onConfirm={() => {
          onClearAllAppData();
          setIsResetDialogOpen(false);
          onNotify(
            'Application data reset',
            'Cleared all local storage data and restored defaults.',
            'info'
          );
        }}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
};
