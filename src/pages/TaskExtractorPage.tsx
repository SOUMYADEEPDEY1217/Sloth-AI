import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  ListTodo,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  ConnectionCheckResult,
  ExtractedTask,
  TaskPriority,
} from '../types';
import {
  BackendApiError,
  countWords,
  extractDocumentTextViaBackend,
  runTaskExtraction,
} from '../services/localAiService';
import {
  SAMPLE_DEMO_TASKS,
  SAMPLE_TASK_EXTRACTOR_INPUT,
} from '../data/demoData';
import { FileDropzone } from '../components/FileDropzone';
import { TaskCard } from '../components/TaskCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

interface TaskExtractorPageProps {
  settings: AppSettings;
  connection: ConnectionCheckResult;
  tasks: ExtractedTask[];
  onSetTasks: React.Dispatch<React.SetStateAction<ExtractedTask[]>>;
  initialDraft?: string;
  onClearInitialDraft?: () => void;
  onLogActivity: (
    type: 'extract_tasks',
    status: 'success' | 'warning' | 'error' | 'info',
    description: string,
    sourceMode?: 'live-ollama' | 'demo-sample'
  ) => void;
  onNotify: (
    title: string,
    description?: string,
    variant?: 'success' | 'warning' | 'error' | 'info'
  ) => void;
}

export const TaskExtractorPage: React.FC<TaskExtractorPageProps> = ({
  settings,
  connection,
  tasks,
  onSetTasks,
  initialDraft,
  onClearInitialDraft,
  onLogActivity,
  onNotify,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Manual new task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (initialDraft) {
      setInputText(initialDraft);
      if (onClearInitialDraft) onClearInitialDraft();
    }
  }, [initialDraft, onClearInitialDraft]);

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    try {
      const extracted = await extractDocumentTextViaBackend(file, settings);
      setInputText(extracted.text);
      onNotify(
        'Document extracted via backend',
        `Loaded ${extracted.word_count} words from "${extracted.filename}".`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof BackendApiError
          ? err.message
          : `Could not extract text from "${file.name}".`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtract = async () => {
    const textToProcess = inputText.trim();
    setError(null);

    if (!textToProcess) {
      setError('Input text cannot be empty. Paste notes or upload a document first.');
      return;
    }

    setIsLoading(true);
    try {
      const extracted = await runTaskExtraction(textToProcess, settings);
      onSetTasks((prev) => [...extracted, ...prev]);

      onLogActivity(
        'extract_tasks',
        'success',
        `Extracted ${extracted.length} task(s) via /api/extract-tasks (${settings.modelName}).`,
        'live-ollama'
      );

      onNotify(
        `Extracted ${extracted.length} task(s)`,
        `Processed via ${settings.modelName} with grounded deadline verification.`,
        'success'
      );
    } catch (err) {
      const apiErr = err instanceof BackendApiError ? err : null;
      const msg = apiErr
        ? `${apiErr.message}${
            apiErr.recoveryHint ? ` — Recovery: ${apiErr.recoveryHint}` : ''
          }`
        : err instanceof Error
        ? err.message
        : 'Failed to extract tasks.';
      setError(msg);
      onLogActivity('extract_tasks', 'error', `Task extraction failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setError(null);
    setInputText(SAMPLE_TASK_EXTRACTOR_INPUT);
    onSetTasks((prev) => [
      ...SAMPLE_DEMO_TASKS.map((t, i) => ({
        ...t,
        id: `demo-task-${Date.now()}-${i}`,
      })),
      ...prev,
    ]);
    onLogActivity(
      'extract_tasks',
      'info',
      'Loaded clearly labeled Static Demo Sample Tasks in Task Extractor.',
      'demo-sample'
    );
    onNotify(
      'Demo sample tasks loaded',
      'Loaded 3 static sample tasks (clearly labeled as Demo Sample).',
      'info'
    );
  };

  const handleAddManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const manualTask: ExtractedTask = {
      id: `task-manual-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      deadline: newDeadline.trim() ? newDeadline.trim() : null,
      priority: newPriority,
      prioritySource: 'explicit',
      completed: false,
      sourceOrigin: 'manual',
      createdAt: new Date().toISOString(),
    };

    onSetTasks((prev) => [manualTask, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewDeadline('');
    setNewPriority('medium');
    setShowAddForm(false);
    onNotify('Task added', `Added "${manualTask.title}" to your list.`, 'success');
  };

  const handleToggleComplete = (id: string) => {
    onSetTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleUpdateTask = (
    id: string,
    updates: Partial<
      Pick<ExtractedTask, 'title' | 'description' | 'deadline' | 'priority'>
    >
  ) => {
    onSetTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    onNotify('Task updated', 'Saved task edits locally.', 'info');
  };

  const handleDeleteTask = (id: string) => {
    onSetTasks((prev) => prev.filter((t) => t.id !== id));
    onNotify('Task removed', 'Deleted task from list.', 'info');
  };

  const handleCopyMarkdown = () => {
    if (tasks.length === 0) return;
    const md = tasks
      .map(
        (t) =>
          `- [${t.completed ? 'x' : ' '}] **${t.title}** (${
            t.priority
          } priority${
            t.deadline ? `, Due: ${t.deadline}` : ', No explicit deadline'
          })${t.description ? `\n  ${t.description}` : ''}${
            t.sourceEvidence ? `\n  _Evidence: "${t.sourceEvidence}"_` : ''
          }`
      )
      .join('\n');

    navigator.clipboard.writeText(md);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    onNotify('Tasks copied', 'Copied structured Markdown checklist.', 'success');
  };

  const handleExportJson = () => {
    if (tasks.length === 0) return;
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slothai-tasks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Exported JSON', 'Downloaded task list as JSON.', 'success');
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
            [ 02 · ACTION PARSING ]
          </span>
          <h1 className="mt-1 text-2xl font-display font-bold tracking-tight text-[#F5F5F5]">
            Automatic Task Extractor
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Routes text to <code className="font-mono text-[#FF9A35]">POST /api/extract-tasks</code>.
            Extracts grounded deadlines, explicit vs. inferred priority, and source evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF9A35]" />
            <span>Load Sample Tasks (Demo)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Task</span>
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Task Extractor Error & Recovery"
          message={error}
          onRetry={inputText.trim() ? handleExtract : undefined}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Manual Task Addition Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddManualTask}
          className="p-5 rounded-2xl border border-[#FF6B1A]/35 bg-[#0B0B0C] space-y-4"
        >
          <h2 className="text-sm font-display font-semibold text-[#F5F5F5]">
            Add Task Manually
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Verify Ollama model tags on workstation"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Additional context or notes..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Deadline (Optional)
              </label>
              <input
                type="text"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                placeholder="Leave blank if no deadline"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Source Input */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
          <FileDropzone
            accept=".txt,.md,.docx,.pdf,.csv,.json,.log"
            label="Upload document for task extraction"
            helperText="Extracts text via /api/documents/extract-text (.txt, .md, .docx, .pdf)"
            onFilesSelected={handleFileUpload}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="task-source-input"
                className="text-xs font-mono uppercase tracking-[0.14em] text-[#A1A1AA]"
              >
                Unstructured Notes / Source Text
              </label>
              <span className="text-[11px] font-mono tabular-nums text-[#71717A]">
                {countWords(inputText)} words
              </span>
            </div>
            <textarea
              id="task-source-input"
              rows={9}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste meeting notes, sprint items, or project text..."
              className="w-full p-3.5 text-sm leading-relaxed rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setInputText('')}
              disabled={!inputText}
              className="px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-40"
            >
              Clear Input
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={isLoading || !inputText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <ListTodo className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Extracting via Backend...'
                  : `Extract Tasks (${settings.modelName})`}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Structured Task List */}
        <div className="lg:col-span-7 space-y-4">
          {isLoading ? (
            <LoadingState
              label={`Running /api/extract-tasks on ${settings.modelName}...`}
              rows={4}
            />
          ) : tasks.length > 0 ? (
            <div className="space-y-4">
              {/* Task Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-mono tabular-nums">
                  <span className="font-semibold text-[#F5F5F5]">
                    {tasks.length} Total Tasks
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#4ADE80]">{completedCount} Completed</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#FF9A35]">{tasks.length - completedCount} Open</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                        <span>Copied MD</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#FF9A35]" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FF9A35]" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetTasks([]);
                      onNotify('Tasks cleared', 'Removed all tasks from workspace.', 'info');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full text-[#F87171] hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No tasks in your workspace list"
              description={
                connection.state === 'ready'
                  ? `Connected to ${connection.modelName}. Paste notes on the left and click Extract Tasks.`
                  : 'Paste notes and extract tasks when Ollama is running, or load the clearly labeled Demo Sample tasks to test editing and export.'
              }
              actionLabel="Load Sample Tasks (Demo)"
              onAction={handleLoadSample}
              secondaryActionLabel="Add Manual Task"
              onSecondaryAction={() => setShowAddForm(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
