import React, { useState } from 'react';
import {
  ArrowRight,
  Cloud,
  Copy,
  Database,
  FileText,
  FolderKanban,
  ListTodo,
  LogIn,
  LogOut,
  Newspaper,
  Terminal,
  UserPlus,
} from 'lucide-react';
import {
  ActivityEntry,
  AppSettings,
  BriefingResult,
  ConnectionCheckResult,
  ExtractedTask,
  FileOrganizeItem,
  NavSection,
  SummaryResult,
} from '../types';
import { User } from '../services/firebaseService';
import { QuickActionCard } from '../components/QuickActionCard';
import { ModelStatus } from '../components/ModelStatus';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { ActivityList } from '../components/ActivityList';
import { NeuralProcessorVisual } from '../components/CinematicVisuals';

interface OverviewPageProps {
  settings: AppSettings;
  connection: ConnectionCheckResult;
  currentUser: User | null;
  tasks: ExtractedTask[];
  stagedFiles: FileOrganizeItem[];
  summaries: SummaryResult[];
  briefings: BriefingResult[];
  activities: ActivityEntry[];
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onNavigate: (section: NavSection, initialDraft?: string) => void;
  onRetestConnection: () => void;
  onNotify: (
    title: string,
    description?: string,
    variant?: 'success' | 'warning' | 'error' | 'info'
  ) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  settings,
  connection,
  currentUser,
  tasks,
  stagedFiles,
  summaries,
  briefings,
  activities,
  onOpenAuth,
  onSignOut,
  onNavigate,
  onRetestConnection,
  onNotify,
}) => {
  const [quickDraft, setQuickDraft] = useState('');

  const handleQuickRoute = (target: 'summarizer' | 'tasks' | 'briefing') => {
    const trimmed = quickDraft.trim();
    onNavigate(target, trimmed || undefined);
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    onNotify('Command copied', `Copied "${cmd}" to clipboard.`, 'info');
  };

  const isModelReady = connection.state === 'ready';

  return (
    <div className="space-y-8 pb-8">
      {/* Greeting & Primary Action Area */}
      <section className="relative p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF6B1A]/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[#FF9A35]">
              <span>[ 00 · LOCAL WORKSPACE COMMAND ]</span>
              <span aria-hidden="true" className="text-white/25">
                ·
              </span>
              <span className="text-[#A1A1AA]">
                Work less. Automate more. Stay slow.
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-display font-bold tracking-tight text-[#F5F5F5]">
              {currentUser
                ? `Welcome back, ${currentUser.displayName || currentUser.email?.split('@')[0] || 'Creator'}.`
                : 'What would you like to simplify today?'}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A1A1AA]">
              Paste messy notes, meeting transcripts, or document text below to
              jump straight into a local inference workflow, or launch one of
              the four open-weight productivity engines.
            </p>
          </div>

          <div className="hidden lg:flex items-center justify-center w-36 h-32 rounded-2xl bg-[#060606] border border-white/[0.08] shrink-0 overflow-hidden">
            <div className="scale-75">
              <NeuralProcessorVisual />
            </div>
          </div>
        </div>

        {/* Direct Simplification Input Box */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/[0.08]">
          <label
            htmlFor="overview-quick-input"
            className="block text-xs font-mono uppercase tracking-[0.14em] text-[#A1A1AA] mb-2"
          >
            Quick Input Buffer (Optional — carries over to your selected module)
          </label>
          <textarea
            id="overview-quick-input"
            rows={3}
            value={quickDraft}
            onChange={(e) => setQuickDraft(e.target.value)}
            placeholder="Paste a paragraph, meeting notes, or a list of tasks here..."
            className="w-full px-4 py-3 text-sm rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35] transition-colors"
          />
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono text-[#71717A]">
              Route buffer directly to:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickRoute('summarizer')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Summarize Text</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoute('tasks')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListTodo className="w-3.5 h-3.5 text-[#FF9A35]" />
                <span>Extract Tasks</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoute('briefing')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Newspaper className="w-3.5 h-3.5 text-[#FF9A35]" />
                <span>Create Daily Briefing</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Per-User Firebase Authentication & Isolated Database Status Panel */}
      <section className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#121215] border border-white/10 flex items-center justify-center shrink-0">
              {currentUser ? (
                <Cloud className="w-5 h-5 text-[#4ADE80]" />
              ) : (
                <Database className="w-5 h-5 text-[#FF9A35]" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#FF9A35]">
                  [ WORKSPACE ACCOUNT &amp; CLOUD SYNC ]
                </span>
                {currentUser ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#4ADE80]/10 border border-[#4ADE80]/30 text-[#4ADE80]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                    <span>CLOUD SYNC ACTIVE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.05] border border-white/10 text-[#A1A1AA]">
                    <span>LOCAL BROWSER SESSION</span>
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-sm font-display font-semibold text-[#F5F5F5]">
                {currentUser
                  ? `Signed in as ${currentUser.displayName || currentUser.email}`
                  : 'Sign in or create an account to sync your workspace data across sessions'}
              </h2>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                {currentUser
                  ? 'Your tasks, document summaries, daily briefings, staged files, activity history, and preferences are automatically saved to your account.'
                  : 'Authenticate with Google or Email & Password to store and sync your personal tasks, summaries, briefings, files, and settings.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-white/15 bg-[#121215] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-white/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-white/15 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:text-[#FF9A35] transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF9A35]" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Per-User Stored Data Metrics */}
        <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="p-3 rounded-xl bg-[#060606] border border-white/[0.06] hover:border-[#FF9A35]/40 text-left transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Saved Tasks
            </span>
            <span className="mt-1 block text-lg font-display font-bold text-[#F5F5F5] tabular-nums">
              {tasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('summarizer')}
            className="p-3 rounded-xl bg-[#060606] border border-white/[0.06] hover:border-[#FF9A35]/40 text-left transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Saved Summaries
            </span>
            <span className="mt-1 block text-lg font-display font-bold text-[#F5F5F5] tabular-nums">
              {summaries.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('briefing')}
            className="p-3 rounded-xl bg-[#060606] border border-white/[0.06] hover:border-[#FF9A35]/40 text-left transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Saved Briefings
            </span>
            <span className="mt-1 block text-lg font-display font-bold text-[#F5F5F5] tabular-nums">
              {briefings.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('organizer')}
            className="p-3 rounded-xl bg-[#060606] border border-white/[0.06] hover:border-[#FF9A35]/40 text-left transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Staged Files
            </span>
            <span className="mt-1 block text-lg font-display font-bold text-[#F5F5F5] tabular-nums">
              {stagedFiles.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('activity')}
            className="p-3 rounded-xl bg-[#060606] border border-white/[0.06] hover:border-[#FF9A35]/40 text-left transition-colors cursor-pointer col-span-2 sm:col-span-1"
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Activity Logs
            </span>
            <span className="mt-1 block text-lg font-display font-bold text-[#F5F5F5] tabular-nums">
              {activities.length}
            </span>
          </button>
        </div>
      </section>

      {/* Four Quick-Action Cards */}
      <section aria-labelledby="quick-actions-heading">
        <div className="flex items-center justify-between mb-3.5">
          <h2
            id="quick-actions-heading"
            className="text-sm font-display font-semibold uppercase tracking-[0.14em] text-[#F5F5F5]"
          >
            Core Productivity Workflows
          </h2>
          <span className="text-xs font-mono text-[#71717A]">
            React → FastAPI Backend → Local Ollama
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            kicker="01 · Document Synthesis"
            title="AI Summarizer"
            description="Condense long articles, markdown docs, or notes into short, balanced, or detailed summaries via /api/summarize."
            actionLabel="Open Summarizer"
            Icon={FileText}
            onSelect={() => onNavigate('summarizer')}
          />
          <QuickActionCard
            kicker="02 · Action Parsing"
            title="Task Extractor"
            description="Turn unstructured meeting notes into editable checklists with grounded deadlines and source evidence via /api/extract-tasks."
            actionLabel="Open Task Extractor"
            Icon={ListTodo}
            onSelect={() => onNavigate('tasks')}
          />
          <QuickActionCard
            kicker="03 · Safe Staging"
            title="File Organizer"
            description="Preview clean kebab-case renames via /api/organize/suggestions and apply approved changes inside an allowed root folder."
            actionLabel="Open File Organizer"
            Icon={FolderKanban}
            onSelect={() => onNavigate('organizer')}
          />
          <QuickActionCard
            kicker="04 · Daily Focus"
            title="Daily Briefing"
            description="Distill pasted workspace notes into key facts, explicit deadlines, and follow-up questions via /api/briefing."
            actionLabel="Open Daily Briefing"
            Icon={Newspaper}
            onSelect={() => onNavigate('briefing')}
          />
        </div>
      </section>

      {/* Getting Started Panel when local Ollama or model is not yet verified */}
      {!isModelReady && (
        <section
          aria-labelledby="getting-started-heading"
          className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#FF9A35]">
                <Terminal className="w-3.5 h-3.5" />
                <span>[ GETTING STARTED · LOCAL FASTAPI + OLLAMA ]</span>
              </div>
              <h2
                id="getting-started-heading"
                className="mt-1.5 text-base font-display font-semibold text-[#F5F5F5]"
              >
                Start Ollama and pull your open-weight model (default
                suggestion: qwen3:4b)
              </h2>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                SlothAI routes all browser requests through the local backend to
                Ollama (
                <code className="font-mono text-[#FF9A35]">
                  {connection.ollamaBaseUrl}
                </code>
                ). Never fabricates AI output when Ollama is offline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Manage Models in Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#060606] border border-white/[0.08]">
              <p className="text-xs font-semibold text-[#F5F5F5]">
                1. Start local Ollama service
              </p>
              <p className="mt-1 text-[11px] text-[#71717A]">
                Ensure Ollama is running on 127.0.0.1:11434:
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#101012] border border-white/10 font-mono text-xs text-[#FF9A35]">
                <span className="truncate">ollama serve</span>
                <button
                  type="button"
                  onClick={() => copyCommand('ollama serve')}
                  aria-label="Copy ollama serve command"
                  className="text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#060606] border border-white/[0.08]">
              <p className="text-xs font-semibold text-[#F5F5F5]">
                2. Pull compatible open-weight model
              </p>
              <p className="mt-1 text-[11px] text-[#71717A]">
                Pull via CLI or use the explicit download button in Settings:
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#101012] border border-white/10 font-mono text-xs text-[#FF9A35]">
                <span className="truncate">
                  ollama pull {settings.modelName || 'qwen3:4b'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyCommand(
                      `ollama pull ${settings.modelName || 'qwen3:4b'}`
                    )
                  }
                  aria-label="Copy ollama pull command"
                  className="text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#060606] border border-white/[0.08]">
              <p className="text-xs font-semibold text-[#F5F5F5]">
                3. Start Backend &amp; Verify
              </p>
              <p className="mt-1 text-[11px] text-[#71717A]">
                On Windows run{' '}
                <code className="font-mono text-[#A1A1AA]">
                  run_backend.bat
                </code>
                , then click below:
              </p>
              <button
                type="button"
                onClick={onRetestConnection}
                className="mt-2.5 w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-[#FF6B1A]/35 bg-[#FF6B1A]/15 text-[#FF9A35] hover:bg-[#FF6B1A]/25 transition-colors cursor-pointer"
              >
                Verify Backend &amp; Ollama Status
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Status & Privacy Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelStatus
          connection={connection}
          onRetest={onRetestConnection}
          onOpenSettings={() => onNavigate('settings')}
        />
        <PrivacyNotice
          variant="panel"
          backendUrl={
            settings.backendUrl.trim() ||
            `FastAPI Backend -> ${connection.ollamaBaseUrl}`
          }
        />
      </div>

      {/* Real Locally Stored Recent Activity */}
      <section aria-labelledby="recent-activity-heading">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2
              id="recent-activity-heading"
              className="text-sm font-display font-semibold uppercase tracking-[0.14em] text-[#F5F5F5]"
            >
              Recent Workspace Activity
            </h2>
            <p className="mt-0.5 text-xs text-[#71717A]">
              Strictly reflects actual actions performed in your workspace.
            </p>
          </div>
          {activities.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="text-xs font-mono text-[#FF9A35] hover:underline cursor-pointer"
            >
              View all ({activities.length})
            </button>
          )}
        </div>

        <ActivityList
          entries={activities}
          limit={5}
          emptyActionLabel="Try AI Summarizer"
          onEmptyAction={() => onNavigate('summarizer')}
        />
      </section>
    </div>
  );
};
