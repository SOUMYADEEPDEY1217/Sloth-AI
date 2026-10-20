import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  ConnectionCheckResult,
  SummaryLength,
  SummaryResult,
} from '../types';
import {
  BackendApiError,
  countWords,
  extractDocumentTextViaBackend,
  runSummarization,
} from '../services/localAiService';
import {
  SAMPLE_SUMMARIZER_INPUT,
  SAMPLE_SUMMARY_PREVIEW,
} from '../data/demoData';
import { FileDropzone } from '../components/FileDropzone';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';

interface SummarizerPageProps {
  settings: AppSettings;
  connection: ConnectionCheckResult;
  savedSummaries: SummaryResult[];
  onSaveSummary: (summary: SummaryResult) => void;
  onDeleteSummary: (summaryId: string) => void;
  initialDraft?: string;
  onClearInitialDraft?: () => void;
  onLogActivity: (
    type: 'summarize',
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

export const SummarizerPage: React.FC<SummarizerPageProps> = ({
  settings,
  connection,
  savedSummaries,
  onSaveSummary,
  onDeleteSummary,
  initialDraft,
  onClearInitialDraft,
  onLogActivity,
  onNotify,
}) => {
  const [inputText, setInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [length, setLength] = useState<SummaryLength>(
    settings.defaultSummaryLength
  );
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      setInputText(initialDraft);
      if (onClearInitialDraft) onClearInitialDraft();
    }
  }, [initialDraft, onClearInitialDraft]);

  const wordCount = countWords(inputText);
  const charCount = inputText.length;

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    try {
      const extracted = await extractDocumentTextViaBackend(file, settings);
      setInputText(extracted.text);
      setUploadedFileName(
        `${extracted.filename} (${extracted.word_count} words)`
      );
      onNotify(
        'Document extracted via backend',
        `Extracted ${extracted.word_count} words from "${extracted.filename}".`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof BackendApiError
          ? err.message
          : `Failed to extract text from "${file.name}".`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    setError(null);
    if (wordCount === 0) {
      setError(
        'Input text cannot be empty. Paste text or upload a supported document.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const summary = await runSummarization(inputText, length, settings);
      setResult(summary);
      onSaveSummary(summary);

      onLogActivity(
        'summarize',
        'success',
        `Summarized ${summary.sourceWordCount} words into a ${length} summary via ${summary.modelUsed}.`,
        'live-ollama'
      );
      onNotify(
        'Summary generated via local AI',
        `Processed ${summary.sourceWordCount} words using ${summary.modelUsed}.`,
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
          : 'Unexpected summarization error.';
      setError(msg);
      onLogActivity('summarize', 'error', `Summarization failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSamplePreview = () => {
    setError(null);
    setInputText(SAMPLE_SUMMARIZER_INPUT);
    setUploadedFileName('project-canopy-architecture.md (Static Demo Sample)');
    setLength('balanced');
    const demoSummary: SummaryResult = {
      ...SAMPLE_SUMMARY_PREVIEW,
      id: `sum_demo_${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };
    setResult(demoSummary);
    onSaveSummary(demoSummary);
    onLogActivity(
      'summarize',
      'info',
      'Loaded clearly labeled Static Demo Sample Preview in AI Summarizer.',
      'demo-sample'
    );
    onNotify(
      'Sample preview loaded',
      'Displaying clearly labeled demo input and static sample summary preview.',
      'info'
    );
  };

  const handleCopy = () => {
    if (!result) return;
    const textOut = [
      `# ${result.title}`,
      `Source: ${
        result.sourceType === 'live-ollama'
          ? `Generated by Local Ollama Model (${result.modelUsed})`
          : 'Static Sample Preview (Demo Data — Not Live AI Output)'
      }`,
      '',
      '## Executive Summary',
      result.executiveSummary,
      '',
      '## Key Points',
      ...result.keyPoints.map((pt) => `- ${pt}`),
      ...(result.uncertaintyNotes
        ? ['', '## Uncertainty / Grounding Notes', result.uncertaintyNotes]
        : []),
    ].join('\n');

    navigator.clipboard.writeText(textOut);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    onNotify('Copied to clipboard', 'Summary text copied.', 'success');
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const textOut = [
      `${result.title}`,
      `Generated At: ${result.generatedAt}`,
      `Model / Mode: ${result.modelUsed}`,
      `Summary Length: ${result.length}`,
      `Original Words: ${result.sourceWordCount} | Summary Words: ${result.summaryWordCount}`,
      '----------------------------------------',
      '',
      'EXECUTIVE SUMMARY:',
      result.executiveSummary,
      '',
      'KEY TAKEAWAYS:',
      ...result.keyPoints.map((pt, idx) => `${idx + 1}. ${pt}`),
      '',
      result.uncertaintyNotes
        ? `UNCERTAINTY NOTES: ${result.uncertaintyNotes}\n`
        : '',
      result.NotableTerms.length > 0
        ? `NOTABLE TERMS: ${result.NotableTerms.join(', ')}`
        : '',
    ].join('\n');

    const blob = new Blob([textOut], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slothai-summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(
      'Downloaded TXT',
      'Saved summary file to your downloads.',
      'success'
    );
  };

  const handleClear = () => {
    setInputText('');
    setUploadedFileName(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Sample Preview Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
            [ 01 · DOCUMENT SYNTHESIS ]
          </span>
          <h1 className="mt-1 text-2xl font-display font-bold tracking-tight text-[#F5F5F5]">
            AI Document Summarizer
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Routes input to{' '}
            <code className="font-mono text-[#FF9A35]">POST /api/summarize</code>{' '}
            using model{' '}
            <code className="font-mono text-[#F5F5F5]">
              {settings.modelName}
            </code>
            . Never fabricates AI output when local inference fails.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSamplePreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF9A35]" />
            <span>Load Sample Preview (Demo)</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!inputText && !result && !error}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#0B0B0C] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear &amp; Reset</span>
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Local AI Summarizer Error & Recovery"
          message={error}
          onRetry={wordCount > 0 ? handleSummarize : undefined}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Workspace */}
        <div className="lg:col-span-6 space-y-4 p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
          <FileDropzone
            accept=".txt,.md,.docx,.pdf,.csv,.json,.log"
            label="Drop a document to extract text via /api/documents/extract-text"
            helperText="Supports .txt, .md, .docx, .pdf, .csv, .json, .log (max 5 MB)"
            onFilesSelected={handleFileUpload}
          />

          {uploadedFileName && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#121215] border border-white/10 text-xs">
              <span className="flex items-center gap-2 font-medium text-[#F5F5F5] truncate">
                <FileText className="w-3.5 h-3.5 text-[#FF9A35] shrink-0" />
                <span className="truncate">{uploadedFileName}</span>
              </span>
              <button
                type="button"
                onClick={() => setUploadedFileName(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] text-[11px] ml-2 cursor-pointer"
              >
                Clear tag
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="summarizer-textarea"
                className="text-xs font-mono uppercase tracking-[0.14em] text-[#A1A1AA]"
              >
                Source Text
              </label>
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-[#71717A]">
                <span>{wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>{charCount} chars</span>
              </div>
            </div>
            <textarea
              id="summarizer-textarea"
              rows={11}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste an article, architecture RFC, meeting transcript, or report..."
              className="w-full p-3.5 text-sm leading-relaxed rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
            />
          </div>

          {/* Summary Length Selector & Primary Action */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="block text-[11px] font-mono uppercase tracking-wider text-[#71717A] mb-1.5">
                Summary Length
              </span>
              <div
                className="inline-flex items-center gap-1 p-1 rounded-full bg-[#060606] border border-white/10"
                role="group"
                aria-label="Summary length selector"
              >
                {(['short', 'balanced', 'detailed'] as SummaryLength[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLength(opt)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        length === opt
                          ? 'bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FF9A35]'
                          : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSummarize}
              disabled={isLoading || wordCount === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Summarizing via Backend...'
                  : `Summarize (${settings.modelName})`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Output Panel */}
        <div className="lg:col-span-6 space-y-5">
          {isLoading ? (
            <LoadingState
              label={`Running inference via /api/summarize (${settings.modelName})...`}
              rows={4}
            />
          ) : result ? (
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-5">
              {/* Source Provenance Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                {result.sourceType === 'live-ollama' ? (
                  <StatusBadge
                    status="success"
                    label="Verified Local Model Summary"
                    detail={result.modelUsed}
                  />
                ) : (
                  <StatusBadge
                    status="warning"
                    label="Static Sample Preview (Demo Data — Not Live Model)"
                    detail="Reference Only"
                  />
                )}

                <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#71717A]">
                  <span>{result.sourceWordCount} in</span>
                  <span aria-hidden="true">→</span>
                  <span className="text-[#FF9A35]">
                    {result.summaryWordCount} words out
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-display font-bold text-[#F5F5F5]">
                  {result.title}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[#D4D4D8]">
                  {result.executiveSummary}
                </p>
              </div>

              {result.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#A1A1AA] mb-2.5">
                    Key Takeaways ({result.length} mode)
                  </h3>
                  <ul className="space-y-2">
                    {result.keyPoints.map((pt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-xs leading-relaxed text-[#F5F5F5]"
                      >
                        <span className="font-mono text-[#FF9A35] font-semibold tabular-nums">
                          {String(i + 1).padStart(2, '0')}.
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.uncertaintyNotes && (
                <div className="p-3.5 rounded-xl bg-[#121215] border border-white/10 flex items-start gap-2.5 text-xs text-[#A1A1AA]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFA726] mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-[#F5F5F5]">
                      Uncertainty / Ambiguity Note:
                    </strong>{' '}
                    {result.uncertaintyNotes}
                  </span>
                </div>
              )}

              {result.NotableTerms.length > 0 && (
                <div className="pt-3 border-t border-white/[0.08]">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
                    Notable Terms:{' '}
                  </span>
                  <span className="text-xs font-mono text-[#FF9A35]">
                    {result.NotableTerms.join(' · ')}
                  </span>
                </div>
              )}

              {/* Output Actions */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#FF9A35]" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download as TXT</span>
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Ready to summarize your document"
              description={
                connection.state === 'ready'
                  ? `Connected to ${connection.modelName}. Paste text or upload a document on the left and click Summarize.`
                  : `Local Ollama (${connection.ollamaBaseUrl}) is currently offline. Start Ollama locally to generate live summaries, or inspect the clearly labeled Sample Preview.`
              }
              actionLabel="Load Sample Preview (Demo)"
              onAction={handleLoadSamplePreview}
            />
          )}

          {/* Saved Summaries History */}
          {savedSummaries.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#FF9A35]" />
                  <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#F5F5F5]">
                    Saved Summaries ({savedSummaries.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#71717A]">
                  Synced to your workspace
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedSummaries.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                      result?.id === item.id
                        ? 'border-[#FF6B1A]/45 bg-[#FF6B1A]/10'
                        : 'border-white/[0.06] bg-[#060606] hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setResult(item)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono text-[#71717A] truncate">
                        {item.length} · {item.summaryWordCount} words ·{' '}
                        {item.modelUsed}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSummary(item.id);
                        if (result?.id === item.id) {
                          setResult(null);
                        }
                      }}
                      title="Delete saved summary"
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
