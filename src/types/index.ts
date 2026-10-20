export type NavSection =
  | 'overview'
  | 'summarizer'
  | 'tasks'
  | 'organizer'
  | 'briefing'
  | 'activity'
  | 'settings';

export type SummaryLength = 'short' | 'balanced' | 'detailed';

export type ThemeMode = 'light' | 'dark';

export type ConnectionState =
  | 'unverified'
  | 'checking'
  | 'ready'
  | 'backend-online-ollama-offline'
  | 'backend-online-model-missing'
  | 'backend-unreachable';

export interface InstalledModelInfo {
  name: string;
  size_bytes?: number | null;
  modified_at?: string | null;
  family?: string | null;
  parameter_size?: string | null;
  quantization_level?: string | null;
}

export interface ConnectionCheckResult {
  state: ConnectionState;
  backendUrl: string;
  backendReachable: boolean;
  backendVersion: string | null;
  ollamaBaseUrl: string;
  ollamaReachable: boolean;
  modelName: string;
  modelAvailable: boolean;
  availableModels: InstalledModelInfo[];
  organizeRootConfigured: boolean;
  allowedOrganizeRoot: string | null;
  latencyMs: number | null;
  lastCheckedAt: string | null;
  errorDetail: string | null;
  recoveryHint: string | null;
}

export interface AppSettings {
  backendUrl: string; // e.g., '' (relative /api) or 'http://127.0.0.1:8000'
  ollamaBaseUrl: string; // e.g., 'http://127.0.0.1:11434'
  modelName: string; // default suggestion: 'qwen3:4b'
  theme: ThemeMode;
  defaultSummaryLength: SummaryLength;
  retainActivityLog: boolean;
  maxActivityEntries: number;
}

export type ActivityType =
  | 'summarize'
  | 'extract_tasks'
  | 'organize_files'
  | 'daily_briefing'
  | 'connection_test'
  | 'model_pull'
  | 'settings_update'
  | 'system';

export type ActivityStatus = 'success' | 'warning' | 'error' | 'info';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string;
  status: ActivityStatus;
  description: string;
  sourceMode?: 'live-ollama' | 'demo-sample' | 'system';
}

export interface SummaryResult {
  id: string;
  title: string;
  executiveSummary: string;
  keyPoints: string[];
  NotableTerms: string[];
  uncertaintyNotes?: string | null;
  length: SummaryLength;
  sourceWordCount: number;
  summaryWordCount: number;
  generatedAt: string;
  sourceType: 'live-ollama' | 'sample-preview';
  modelUsed: string;
}

export type TaskPriority = 'high' | 'medium' | 'low' | 'unspecified';
export type PrioritySource = 'explicit' | 'inferred' | 'none';

export interface ExtractedTask {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: TaskPriority;
  prioritySource?: PrioritySource;
  sourceEvidence?: string | null;
  completed: boolean;
  sourceOrigin: 'live-ollama' | 'manual' | 'demo-sample';
  createdAt: string;
}

export interface FileOrganizeItem {
  id: string;
  originalName: string;
  sourceRelativePath: string;
  extension: string;
  mimeType: string;
  sizeBytes: number | null;
  lastModified: string | null;
  contentExcerpt?: string;
  suggestedCategory: string;
  suggestedFilename: string;
  suggestedFolder: string;
  reasoning: string;
  approved: boolean;
  status:
    | 'pending'
    | 'preview-validated'
    | 'applied'
    | 'demo-preview'
    | 'error';
  isDemoData: boolean;
  errorMessage?: string;
}

export interface FileOperationLog {
  id: string;
  timestamp: string;
  fileCount: number;
  status: 'preview-validated' | 'applied' | 'exported-manifest' | 'error';
  message: string;
  details: string[];
}

export interface BriefingResult {
  id: string;
  generatedAt: string;
  conciseSummary: string;
  importantInformation: string[];
  actionItems: string[];
  explicitDeadlines: Array<{
    item: string;
    deadlineText: string;
  }>;
  followUpQuestions: string[];
  sourceMode: 'live-ollama' | 'demo-sample';
  modelUsed: string;
  inputWordCount: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}
