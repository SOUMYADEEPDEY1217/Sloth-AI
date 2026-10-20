import {
  AppSettings,
  BriefingResult,
  ConnectionCheckResult,
  ExtractedTask,
  FileOrganizeItem,
  InstalledModelInfo,
  PrioritySource,
  SummaryLength,
  SummaryResult,
  TaskPriority,
} from '../types';

export class BackendApiError extends Error {
  public code: string;
  public status: number;
  public recoveryHint: string | null;

  constructor(
    message: string,
    code = 'api_error',
    status = 500,
    recoveryHint: string | null = null
  ) {
    super(message);
    this.name = 'BackendApiError';
    this.code = code;
    this.status = status;
    this.recoveryHint = recoveryHint;
  }
}

function resolveApiUrl(backendUrl: string, apiPath: string): string {
  const base = backendUrl.trim().replace(/\/+$/, '');
  if (!base || base === '/api') {
    return apiPath;
  }
  if (base.endsWith('/api') && apiPath.startsWith('/api/')) {
    return `${base}${apiPath.slice(4)}`;
  }
  return `${base}${apiPath}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function callBackendJson<T>(
  settings: AppSettings,
  apiPath: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const url = resolveApiUrl(settings.backendUrl, apiPath);
  const method = options.method || 'GET';
  const timeoutMs = options.timeoutMs || 95000;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const enrichedBody =
    method === 'POST' && options.body
      ? {
          ...options.body,
          _ollama_base_url: settings.ollamaBaseUrl.trim() || undefined,
        }
      : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: enrichedBody ? JSON.stringify(enrichedBody) : undefined,
      signal: controller.signal,
    });
    window.clearTimeout(timer);

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new BackendApiError(
        data?.error || `Backend returned HTTP ${response.status}`,
        data?.code || 'backend_error',
        response.status,
        data?.recovery_hint || null
      );
    }

    return data as T;
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof BackendApiError) {
      throw err;
    }
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    throw new BackendApiError(
      isAbort
        ? `Request to backend (${url}) timed out.`
        : `Could not reach SlothAI backend (${url}). Start the backend with run_backend.bat or npm run dev.`,
      isAbort ? 'timeout' : 'backend_unreachable',
      503,
      'Ensure the FastAPI backend is running on 127.0.0.1:8000 (or unified dev server on port 3000) and Ollama is running locally.'
    );
  }
}

/**
 * 1 & 10. Checks backend health (/api/health) and Ollama connectivity (/api/connection/test).
 * Never claims the model is ready unless verified by the backend.
 */
export async function verifyLocalConnection(
  settings: AppSettings,
  explicitTest = false
): Promise<ConnectionCheckResult> {
  const now = new Date().toISOString();
  const displayBackend = settings.backendUrl.trim() || '/api (Local Backend)';

  try {
    const health = await callBackendJson<{
      status: string;
      version: string;
      ollama_base_url: string;
      default_model: string;
      ollama_reachable: boolean;
      model_available: boolean;
      target_model: string;
      installed_models: InstalledModelInfo[];
      latency_ms: number | null;
      organize_root_configured: boolean;
      allowed_organize_root: string | null;
      error: string | null;
      recovery_hint: string | null;
    }>(
      settings,
      `/api/health?model=${encodeURIComponent(
        settings.modelName.trim() || 'qwen3:4b'
      )}`,
      { method: 'GET', timeoutMs: 8000 }
    );

    let ollamaReachable = Boolean(health.ollama_reachable);
    let modelAvailable = Boolean(health.model_available);
    let targetModel = health.target_model || settings.modelName;
    let installedModels = Array.isArray(health.installed_models)
      ? health.installed_models
      : [];
    let latencyMs = health.latency_ms ?? null;
    let errorDetail = health.error || null;
    let recoveryHint = health.recovery_hint || null;

    if (explicitTest) {
      const testRes = await callBackendJson<{
        ollama_reachable: boolean;
        endpoint: string;
        target_model: string;
        model_available: boolean;
        installed_models: InstalledModelInfo[];
        latency_ms: number | null;
        error: string | null;
        recovery_hint: string | null;
      }>(settings, '/api/connection/test', {
        method: 'POST',
        body: {
          ollama_base_url: settings.ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
          model: settings.modelName.trim() || 'qwen3:4b',
        },
        timeoutMs: 8000,
      });
      ollamaReachable = Boolean(testRes.ollama_reachable);
      modelAvailable = Boolean(testRes.model_available);
      targetModel = testRes.target_model || targetModel;
      installedModels = Array.isArray(testRes.installed_models)
        ? testRes.installed_models
        : installedModels;
      latencyMs = testRes.latency_ms ?? latencyMs;
      errorDetail = testRes.error || null;
      recoveryHint = testRes.recovery_hint || null;
    }

    const state = !ollamaReachable
      ? 'backend-online-ollama-offline'
      : modelAvailable
      ? 'ready'
      : 'backend-online-model-missing';

    return {
      state,
      backendUrl: displayBackend,
      backendReachable: true,
      backendVersion: health.version || '0.2.0',
      ollamaBaseUrl: settings.ollamaBaseUrl || health.ollama_base_url,
      ollamaReachable,
      modelName: targetModel,
      modelAvailable,
      availableModels: installedModels,
      organizeRootConfigured: Boolean(health.organize_root_configured),
      allowedOrganizeRoot: health.allowed_organize_root || null,
      latencyMs,
      lastCheckedAt: now,
      errorDetail,
      recoveryHint,
    };
  } catch (err) {
    const apiErr = err instanceof BackendApiError ? err : null;
    return {
      state: 'backend-unreachable',
      backendUrl: displayBackend,
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
      lastCheckedAt: now,
      errorDetail:
        apiErr?.message ||
        'Could not connect to the local FastAPI backend service.',
      recoveryHint:
        apiErr?.recoveryHint ||
        'Start the backend using run_backend.bat (uvicorn app.main:app --host 127.0.0.1 --port 8000).',
    };
  }
}

/**
 * 2. Fetch installed models from GET /api/models
 */
export async function fetchInstalledModels(
  settings: AppSettings
): Promise<InstalledModelInfo[]> {
  const data = await callBackendJson<{
    success: boolean;
    models: InstalledModelInfo[];
  }>(settings, '/api/models', { method: 'GET', timeoutMs: 10000 });
  return Array.isArray(data.models) ? data.models : [];
}

/**
 * 3. Explicitly pull a model via POST /api/models/pull
 */
export async function pullModelViaBackend(
  modelName: string,
  settings: AppSettings
): Promise<{ success: boolean; model: string; status: string; detail: string }> {
  return callBackendJson(settings, '/api/models/pull', {
    method: 'POST',
    body: { model: modelName.trim() },
    timeoutMs: 600000,
  });
}

/**
 * 4. Summarize text via POST /api/summarize
 * Never fabricates AI output when inference fails.
 */
export async function runSummarization(
  inputText: string,
  length: SummaryLength,
  settings: AppSettings
): Promise<SummaryResult> {
  const now = new Date().toISOString();
  const data = await callBackendJson<{
    success: boolean;
    model: string;
    summary_length: SummaryLength;
    summary: {
      title: string;
      executive_summary: string;
      key_points: string[];
      notable_terms: string[];
      uncertainty_notes?: string | null;
    };
    source_word_count: number;
    summary_word_count: number;
  }>(settings, '/api/summarize', {
    method: 'POST',
    body: {
      text: inputText,
      summary_length: length,
      model: settings.modelName.trim() || 'qwen3:4b',
    },
  });

  return {
    id: `sum-${Date.now()}`,
    title: data.summary.title || 'Document Summary',
    executiveSummary: data.summary.executive_summary,
    keyPoints: Array.isArray(data.summary.key_points)
      ? data.summary.key_points
      : [],
    NotableTerms: Array.isArray(data.summary.notable_terms)
      ? data.summary.notable_terms
      : [],
    uncertaintyNotes: data.summary.uncertainty_notes || null,
    length: data.summary_length || length,
    sourceWordCount: data.source_word_count || countWords(inputText),
    summaryWordCount:
      data.summary_word_count || countWords(data.summary.executive_summary),
    generatedAt: now,
    sourceType: 'live-ollama',
    modelUsed: data.model,
  };
}

/**
 * 5. Extract tasks via POST /api/extract-tasks
 */
export async function runTaskExtraction(
  inputText: string,
  settings: AppSettings
): Promise<ExtractedTask[]> {
  const now = new Date().toISOString();
  const data = await callBackendJson<{
    success: boolean;
    model: string;
    tasks: Array<{
      title: string;
      description: string;
      deadline: string | null;
      priority: TaskPriority;
      priority_source?: PrioritySource;
      source_evidence?: string | null;
    }>;
  }>(settings, '/api/extract-tasks', {
    method: 'POST',
    body: {
      text: inputText,
      model: settings.modelName.trim() || 'qwen3:4b',
    },
  });

  return (data.tasks || []).map((t, idx) => ({
    id: `task-${Date.now()}-${idx}`,
    title: t.title,
    description: t.description || '',
    deadline: t.deadline || null,
    priority: t.priority || 'unspecified',
    prioritySource: t.priority_source || 'inferred',
    sourceEvidence: t.source_evidence || null,
    completed: false,
    sourceOrigin: 'live-ollama',
    createdAt: now,
  }));
}

/**
 * 6. Generate Daily Briefing via POST /api/briefing
 */
export async function runDailyBriefing(
  inputText: string,
  settings: AppSettings
): Promise<BriefingResult> {
  const now = new Date().toISOString();
  const data = await callBackendJson<{
    success: boolean;
    model: string;
    summary: string;
    key_points: string[];
    action_items: string[];
    explicit_deadlines: Array<{ item: string; deadline_text: string }>;
    follow_up_questions: string[];
  }>(settings, '/api/briefing', {
    method: 'POST',
    body: {
      text: inputText,
      model: settings.modelName.trim() || 'qwen3:4b',
    },
  });

  return {
    id: `brief-${Date.now()}`,
    generatedAt: now,
    conciseSummary: data.summary,
    importantInformation: data.key_points || [],
    actionItems: data.action_items || [],
    explicitDeadlines: (data.explicit_deadlines || []).map((d) => ({
      item: d.item,
      deadlineText: d.deadline_text,
    })),
    followUpQuestions: data.follow_up_questions || [],
    sourceMode: 'live-ollama',
    modelUsed: data.model,
    inputWordCount: countWords(inputText),
  };
}

/**
 * 7. Request File Organization Suggestions via POST /api/organize/suggestions
 */
export async function fetchFileSuggestionsFromBackend(
  files: Array<{
    name: string;
    type: string;
    size: number | null;
    lastModified?: number | null;
    contentExcerpt?: string;
  }>,
  settings: AppSettings,
  allowRuleFallback = true
): Promise<{
  items: FileOrganizeItem[];
  model: string;
  sourceMode: string;
}> {
  const payloadFiles = files.map((f) => ({
    filename: f.name,
    mime_type: f.type || 'application/octet-stream',
    size_bytes: f.size,
    last_modified: f.lastModified
      ? new Date(f.lastModified).toISOString()
      : null,
    content_excerpt: f.contentExcerpt || null,
  }));

  const permittedFilenames = files.map((f) => f.name);

  const data = await callBackendJson<{
    success: boolean;
    model: string;
    source_mode: string;
    suggestions: Array<{
      original_filename: string;
      suggested_filename: string;
      suggested_folder: string;
      category: string;
      reason: string;
    }>;
  }>(settings, '/api/organize/suggestions', {
    method: 'POST',
    body: {
      files: payloadFiles,
      permitted_filenames: permittedFilenames,
      model: settings.modelName.trim() || 'qwen3:4b',
      allow_rule_fallback: allowRuleFallback,
    },
  });

  const items: FileOrganizeItem[] = (data.suggestions || []).map((s, idx) => {
    const origFile = files[idx] || {
      name: s.original_filename,
      type: 'application/octet-stream',
      size: null,
      lastModified: null,
    };
    const dotIdx = s.original_filename.lastIndexOf('.');
    const ext =
      dotIdx > 0 ? s.original_filename.slice(dotIdx + 1).toLowerCase() : 'file';

    return {
      id: `file-${Date.now()}-${idx}`,
      originalName: s.original_filename,
      sourceRelativePath: s.original_filename,
      extension: ext,
      mimeType: origFile.type || 'application/octet-stream',
      sizeBytes: origFile.size,
      lastModified: origFile.lastModified
        ? new Date(origFile.lastModified).toISOString()
        : null,
      suggestedCategory: s.category,
      suggestedFilename: s.suggested_filename,
      suggestedFolder: s.suggested_folder,
      reasoning: s.reason,
      approved: true,
      status: 'pending',
      isDemoData: false,
    };
  });

  return {
    items,
    model: data.model,
    sourceMode: data.source_mode || 'live-ollama',
  };
}

/**
 * 8. Validate or Apply approved file operations via POST /api/organize/apply
 */
export async function applyFileOperationsViaBackend(
  items: FileOrganizeItem[],
  dryRun: boolean,
  userConfirmed: boolean,
  settings: AppSettings
): Promise<{
  success: boolean;
  dry_run: boolean;
  allowed_root: string;
  results: Array<{
    source_relative_path: string;
    destination_relative_path: string;
    status: string;
    error: string | null;
  }>;
}> {
  const operations = items.map((item) => ({
    source_relative_path: item.sourceRelativePath || item.originalName,
    destination_folder: item.suggestedFolder,
    new_filename: item.suggestedFilename,
    approved: item.approved,
  }));

  return callBackendJson(settings, '/api/organize/apply', {
    method: 'POST',
    body: {
      operations,
      dry_run: dryRun,
      user_confirmed: userConfirmed,
    },
  });
}

/**
 * 9. Extract text from uploaded document (.txt, .md, .docx, .pdf, etc.) via POST /api/documents/extract-text
 */
export async function extractDocumentTextViaBackend(
  file: File,
  settings: AppSettings
): Promise<{
  success: boolean;
  filename: string;
  extension: string;
  size_bytes: number;
  word_count: number;
  char_count: number;
  text: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const contentBase64 = window.btoa(binary);

  return callBackendJson(settings, '/api/documents/extract-text', {
    method: 'POST',
    body: {
      filename: file.name,
      content_base64: contentBase64,
    },
  });
}
