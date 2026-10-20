import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  HelpCircle,
  Info,
  Newspaper,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  BriefingResult,
  ConnectionCheckResult,
} from '../types';
import {
  BackendApiError,
  countWords,
  extractDocumentTextViaBackend,
  runDailyBriefing,
} from '../services/localAiService';
import {
  SAMPLE_BRIEFING_INPUT,
  SAMPLE_DEMO_BRIEFING,
} from '../data/demoData';
import { FileDropzone } from '../components/FileDropzone';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';

interface DailyBriefingPageProps {
  settings: AppSettings;
  connection: ConnectionCheckResult;
  savedBriefings: BriefingResult[];
  onSaveBriefing: (briefing: BriefingResult) => void;
  onDeleteBriefing: (briefingId: string) => void;
  initialDraft?: string;
  onClearInitialDraft?: () => void;
  onLogActivity: (
    type: 'daily_briefing',
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

export const DailyBriefingPage: React.FC<DailyBriefingPageProps> = ({
  settings,
  connection,
  savedBriefings,
  onSaveBriefing,
  onDeleteBriefing,
  initialDraft,
  onClearInitialDraft,
  onLogActivity,
  onNotify,
}) => {
  const [inputText, setInputText] = useState('');
  const [briefing, setBriefing] = useState<BriefingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      setInputText((prev) =>
        prev ? `${prev}\n\n${extracted.text}` : extracted.text
      );
      onNotify(
        'Document extracted via backend',
        `Added ${extracted.word_count} words from "${extracted.filename}".`,
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

  const handleGenerate = async () => {
    const source = inputText.trim();
    setError(null);

    if (!source) {
      setError(
        'Input text cannot be empty. Paste your daily notes or upload a supported document first.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await runDailyBriefing(source, settings);
      setBriefing(result);
      onSaveBriefing(result);

      onLogActivity(
        'daily_briefing',
        'success',
        `Generated Daily Briefing from ${result.inputWordCount} words via /api/briefing (${result.modelUsed}).`,
        'live-ollama'
      );

      onNotify(
        'Daily Briefing ready',
        `Synthesized via ${result.modelUsed}.`,
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
          : 'Failed to generate briefing.';
      setError(msg);
      onLogActivity('daily_briefing', 'error', `Briefing failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setError(null);
    setInputText(SAMPLE_BRIEFING_INPUT);
    const demoBriefing: BriefingResult = {
      ...SAMPLE_DEMO_BRIEFING,
      id: `brief_demo_${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };
    setBriefing(demoBriefing);
    onSaveBriefing(demoBriefing);
    onLogActivity(
      'daily_briefing',
      'info',
      'Loaded clearly labeled Static Demo Sample Briefing.',
      'demo-sample'
    );
    onNotify(
      'Demo sample briefing loaded',
      'Displaying clearly labeled static sample briefing.',
      'info'
    );
  };

  const formatMarkdownBriefing = (b: BriefingResult) => {
    return [
      `# SlothAI Daily Briefing`,
      `Generated: ${b.generatedAt}`,
      `Source Mode: ${b.modelUsed}`,
      '',
      '## Concise Summary',
      b.conciseSummary,
      '',
      '## Key Points (Source Facts)',
      ...(b.importantInformation.length > 0
        ? b.importantInformation.map((i) => `- ${i}`)
        : ['- None identified']),
      '',
      '## Action Items',
      ...(b.actionItems.length > 0
        ? b.actionItems.map((a) => `- [ ] ${a}`)
        : ['- None identified']),
      '',
      '## Explicit Deadlines Found in Input',
      ...(b.explicitDeadlines.length > 0
        ? b.explicitDeadlines.map(
            (d) => `- **${d.deadlineText}**: ${d.item}`
          )
        : ['- No explicit deadlines stated in provided notes']),
      '',
      '## Questions Requiring Follow-up',
      ...(b.followUpQuestions.length > 0
        ? b.followUpQuestions.map((q) => `- ${q}`)
        : ['- No open questions identified']),
    ].join('\n');
  };

  const handleCopy = () => {
    if (!briefing) return;
    navigator.clipboard.writeText(formatMarkdownBriefing(briefing));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    onNotify(
      'Briefing copied',
      'Copied Markdown briefing to clipboard.',
      'success'
    );
  };

  const handleDownload = () => {
    if (!briefing) return;
    const md = formatMarkdownBriefing(briefing);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slothai-daily-briefing-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(
      'Downloaded Briefing',
      'Saved Markdown briefing file.',
      'success'
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
            [ 04 · DAILY FOCUS ]
          </span>
          <h1 className="mt-1 text-2xl font-display font-bold tracking-tight text-[#F5F5F5]">
            Daily Briefing Compiler
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Routes notes to{' '}
            <code className="font-mono text-[#FF9A35]">POST /api/briefing</code>{' '}
            ({settings.modelName}) to separate grounded facts, action items,
            explicit deadlines, and follow-up questions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF9A35]" />
            <span>Load Sample Briefing (Demo)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInputText('');
              setBriefing(null);
              setError(null);
            }}
            disabled={!inputText && !briefing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#0B0B0C] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Scope & Privacy Disclosure */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] flex items-center gap-3 text-xs text-[#A1A1AA]">
        <Info className="w-4 h-4 text-[#FF9A35] shrink-0" />
        <span>
          <strong className="text-[#F5F5F5]">Grounded Input Scope:</strong> This
          briefing compiler analyzes only the notes and local documents you
          explicitly provide below. It does not connect to external email,
          calendar, or chat accounts.
        </span>
      </div>

      {error && (
        <ErrorState
          title="Daily Briefing Error & Recovery"
          message={error}
          onRetry={inputText.trim() ? handleGenerate : undefined}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Input Form */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
          <FileDropzone
            accept=".txt,.md,.docx,.pdf,.csv,.json,.log"
            label="Add local document (.txt, .md, .docx, .pdf)"
            helperText="Extracts text via /api/documents/extract-text"
            onFilesSelected={handleFileUpload}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="briefing-notes-input"
                className="text-xs font-mono uppercase tracking-[0.14em] text-[#A1A1AA]"
              >
                Notes, Standup Logs, or Pasted Updates
              </label>
              <span className="text-[11px] font-mono tabular-nums text-[#71717A]">
                {countWords(inputText)} words
              </span>
            </div>
            <textarea
              id="briefing-notes-input"
              rows={10}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your daily notes, action items, explicit deadlines, and open questions..."
              className="w-full p-3.5 text-sm leading-relaxed rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !inputText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            <Newspaper className="w-4 h-4" />
            <span>
              {isLoading
                ? 'Generating via Backend...'
                : `Generate Briefing (${settings.modelName})`}
            </span>
          </button>
        </div>

        {/* Right Output Workspace */}
        <div className="lg:col-span-7 space-y-5">
          {isLoading ? (
            <LoadingState
              label={`Running /api/briefing on ${settings.modelName}...`}
              rows={4}
            />
          ) : briefing ? (
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-6">
              {/* Provenance Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                {briefing.sourceMode === 'live-ollama' ? (
                  <StatusBadge
                    status="success"
                    label="Verified Local Model Briefing"
                    detail={briefing.modelUsed}
                  />
                ) : (
                  <StatusBadge
                    status="warning"
                    label="Static Sample Preview (Demo Data — Not Live Model)"
                  />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                        <span>Copied</span>
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
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export .MD</span>
                  </button>
                </div>
              </div>

              {/* Concise Summary */}
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.14em] text-[#71717A] mb-1.5">
                  Concise Summary
                </h2>
                <p className="text-sm leading-relaxed text-[#F5F5F5]">
                  {briefing.conciseSummary}
                </p>
              </div>

              {/* Important Information */}
              <div className="pt-4 border-t border-white/[0.08]">
                <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5] mb-2.5">
                  Key Points / Source Facts (
                  {briefing.importantInformation.length})
                </h3>
                {briefing.importantInformation.length > 0 ? (
                  <ul className="space-y-2 text-xs text-[#A1A1AA]">
                    {briefing.importantInformation.map((info, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-[#FF9A35] font-semibold">
                          ·
                        </span>
                        <span>{info}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#71717A]">
                    No additional context statements identified.
                  </p>
                )}
              </div>

              {/* Action Items */}
              <div className="pt-4 border-t border-white/[0.08]">
                <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5] mb-2.5">
                  Action Items ({briefing.actionItems.length})
                </h3>
                {briefing.actionItems.length > 0 ? (
                  <ul className="space-y-2 text-xs text-[#F5F5F5]">
                    {briefing.actionItems.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80] mt-0.5 shrink-0" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#71717A]">
                    No explicit action items found in the provided input.
                  </p>
                )}
              </div>

              {/* Explicit Deadlines */}
              <div className="pt-4 border-t border-white/[0.08]">
                <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5] mb-2.5">
                  Deadlines Explicitly Found in Input (
                  {briefing.explicitDeadlines.length})
                </h3>
                {briefing.explicitDeadlines.length > 0 ? (
                  <div className="space-y-2">
                    {briefing.explicitDeadlines.map((dl, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#060606] border border-white/[0.08] text-xs"
                      >
                        <span className="text-[#F5F5F5]">{dl.item}</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#FF9A35] shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span>{dl.deadlineText}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#71717A]">
                    No explicit dates or deadlines were stated in the input
                    notes.
                  </p>
                )}
              </div>

              {/* Questions Requiring Follow-up */}
              <div className="pt-4 border-t border-white/[0.08]">
                <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5] mb-2.5">
                  Questions Requiring Follow-up (
                  {briefing.followUpQuestions.length})
                </h3>
                {briefing.followUpQuestions.length > 0 ? (
                  <ul className="space-y-2 text-xs text-[#A1A1AA]">
                    {briefing.followUpQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-[#FFA726] mt-0.5 shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#71717A]">
                    No open questions detected in the input text.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Ready to compile your Daily Briefing"
              description={
                connection.state === 'ready'
                  ? `Connected to ${connection.modelName}. Paste your notes on the left and click Generate Briefing.`
                  : 'Paste your notes and generate a briefing when Ollama is running, or load the clearly labeled Sample Briefing.'
              }
              actionLabel="Load Sample Briefing (Demo)"
              onAction={handleLoadSample}
            />
          )}

          {/* Saved Daily Briefings History */}
          {savedBriefings.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#FF9A35]" />
                  <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5]">
                    Saved Daily Briefings ({savedBriefings.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#71717A]">
                  Synced to your workspace
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedBriefings.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                      briefing?.id === item.id
                        ? 'border-[#FF6B1A]/45 bg-[#FF6B1A]/10'
                        : 'border-white/[0.06] bg-[#060606] hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setBriefing(item)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                        {item.conciseSummary}
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono text-[#71717A] truncate">
                        {item.actionItems.length} actions ·{' '}
                        {item.explicitDeadlines.length} deadlines ·{' '}
                        {item.modelUsed}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteBriefing(item.id);
                        if (briefing?.id === item.id) {
                          setBriefing(null);
                        }
                      }}
                      title="Delete saved briefing"
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F87171] hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
