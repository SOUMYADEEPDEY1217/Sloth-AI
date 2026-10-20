import { BriefingResult, ExtractedTask, FileOrganizeItem, SummaryResult } from '../types';

export const SAMPLE_SUMMARIZER_INPUT = `Project Canopy: Local-First Document Automation Architecture (Q4 Engineering Note)

Modern knowledge workers spend a disproportionate share of their day re-reading sprawling thread exports, renaming downloaded files, and copying action items between tools. Project Canopy (SlothAI) introduces a local-first automation layer designed to run entirely on consumer hardware using open-weight language models served via Ollama and a localhost Python FastAPI backend.

Key Architectural Principles:
1. Zero Unconsented Cloud Egress: All document parsing, summarization, and task extraction execute through the local FastAPI backend (127.0.0.1:8000) communicating with local Ollama (127.0.0.1:11434). Documents remain inside local memory and browser storage.
2. Explicit Human Approval for Filesystem Operations: Automated file organization never mutates, moves, or overwrites files silently. Every proposed rename and directory move is staged in a review table with path-traversal and symlink defenses until the user explicitly approves the batch.
3. Deterministic Honesty: When a local model is offline or unconfigured, the interface clearly reports its disconnected status and provides recovery instructions rather than fabricating AI responses or silently routing private text to external cloud APIs.`;

export const SAMPLE_SUMMARY_PREVIEW: SummaryResult = {
  id: 'sample-sum-preview-01',
  title: 'Project Canopy: Local-First Document Automation Architecture (Sample Preview)',
  executiveSummary:
    'Project Canopy (SlothAI) is a local-first productivity system that uses a Python FastAPI backend and open-weight models via Ollama (such as qwen3:4b) to summarize documents, extract tasks, and safely stage file organization on consumer hardware.',
  keyPoints: [
    'All inference routes through the local FastAPI backend (127.0.0.1:8000) to local Ollama (127.0.0.1:11434) with zero cloud data egress.',
    'Filesystem organization enforces strict directory confinement, symlink checks, and human-in-the-loop approval.',
    'Connection and model readiness states are verified honestly rather than simulated or routed to third-party cloud APIs.',
  ],
  NotableTerms: [
    'ollama',
    'qwen3:4b',
    'local-first',
    'fastapi',
    'filesystem',
    'privacy',
  ],
  uncertaintyNotes: null,
  length: 'balanced',
  sourceWordCount: 148,
  summaryWordCount: 72,
  generatedAt: '2026-10-20T09:00:00.000Z',
  sourceType: 'sample-preview',
  modelUsed: 'Static Demo Preview (Not Live Model Output)',
};

export const SAMPLE_TASK_EXTRACTOR_INPUT = `Sprint Sync & Infrastructure Notes — October 2026
- Urgent: Audit local CORS headers for the FastAPI to Ollama bridge due October 24, 2026 so Windows desktop browsers can connect cleanly.
- Please prepare the file-organizer symlink security tests by Friday at 4:00 PM.
- Review token context window limits for qwen3:4b when summarizing multi-page markdown files.
- Optional: Explore adding dark-sage syntax highlighting for exported markdown briefings when time permits.`;

export const SAMPLE_DEMO_TASKS: ExtractedTask[] = [
  {
    id: 'demo-task-1',
    title: 'Audit local CORS headers for the FastAPI to Ollama bridge',
    description: 'Ensure Windows desktop browsers on localhost:3000 can communicate cleanly with 127.0.0.1:8000.',
    deadline: 'October 24, 2026',
    priority: 'high',
    prioritySource: 'explicit',
    sourceEvidence: 'Urgent: Audit local CORS headers for the FastAPI to Ollama bridge due October 24, 2026',
    completed: false,
    sourceOrigin: 'demo-sample',
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'demo-task-2',
    title: 'Prepare file-organizer symlink security tests',
    description: 'Verify path traversal and symlink escape rejection before applying approved renames.',
    deadline: 'Friday at 4:00 PM',
    priority: 'medium',
    prioritySource: 'inferred',
    sourceEvidence: 'Please prepare the file-organizer symlink security tests by Friday at 4:00 PM.',
    completed: false,
    sourceOrigin: 'demo-sample',
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'demo-task-3',
    title: 'Review token context window limits for qwen3:4b',
    description: 'Evaluate multi-page markdown summarization performance on 8GB RAM machines.',
    deadline: null,
    priority: 'medium',
    prioritySource: 'inferred',
    sourceEvidence: 'Review token context window limits for qwen3:4b when summarizing multi-page markdown files.',
    completed: false,
    sourceOrigin: 'demo-sample',
    createdAt: '2026-10-20T09:00:00.000Z',
  },
];

export const SAMPLE_BRIEFING_INPUT = `Morning Workspace Notes (User-Provided Text):
We completed the FastAPI backend integration for SlothAI's four core workflows: Summarizer, Task Extractor, File Organizer, and Daily Briefing.
The team verified that /api/organize/apply enforces strict path confinement and rejects symlinks escaping SLOTHAI_ALLOWED_ORGANIZE_ROOT.
Action: Run the automated backend test suite before packaging the Windows batch scripts due October 25, 2026.
Action: Test explicit model pulling via POST /api/models/pull with qwen3:4b.
Deadline: Submit the Slow and Steady open-source challenge repository documentation due October 30, 2026.
Question: Should we recommend qwen3:4b or llama3.2:3b as the fallback for 8GB RAM laptops?`;

export const SAMPLE_DEMO_BRIEFING: BriefingResult = {
  id: 'demo-briefing-01',
  generatedAt: '2026-10-20T09:00:00.000Z',
  conciseSummary:
    'The FastAPI backend integration for SlothAI is complete across all four core workflows, with strict path confinement and symlink defenses verified for file organization.',
  importantInformation: [
    'FastAPI backend endpoints are wired for Summarizer, Task Extractor, File Organizer, and Daily Briefing.',
    '/api/organize/apply enforces strict directory confinement and rejects symlinks escaping SLOTHAI_ALLOWED_ORGANIZE_ROOT.',
  ],
  actionItems: [
    'Run the automated backend test suite before packaging the Windows batch scripts.',
    'Test explicit model pulling via POST /api/models/pull with qwen3:4b.',
  ],
  explicitDeadlines: [
    {
      item: 'Run the automated backend test suite before packaging the Windows batch scripts',
      deadlineText: 'October 25, 2026',
    },
    {
      item: 'Submit the Slow and Steady open-source challenge repository documentation',
      deadlineText: 'October 30, 2026',
    },
  ],
  followUpQuestions: [
    'Should we recommend qwen3:4b or llama3.2:3b as the fallback for 8GB RAM laptops?',
  ],
  sourceMode: 'demo-sample',
  modelUsed: 'Static Demo Preview (Not Live Model Output)',
  inputWordCount: 98,
};

export const SAMPLE_DEMO_FILES: FileOrganizeItem[] = [
  {
    id: 'demo-file-1',
    originalName: 'Q3_Cloud_Hosting_Invoice_FINAL_v2 (1).pdf',
    sourceRelativePath: 'Q3_Cloud_Hosting_Invoice_FINAL_v2 (1).pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 428512,
    lastModified: '2026-10-14T15:20:00.000Z',
    suggestedCategory: 'Finance & Accounting',
    suggestedFilename: '2026-10-14-finance-q3-cloud-hosting-invoice.pdf',
    suggestedFolder: 'Finance/Records',
    reasoning: 'Removed redundant "FINAL_v2 (1)" suffix and routed invoice to Finance/Records.',
    approved: true,
    status: 'demo-preview',
    isDemoData: true,
  },
  {
    id: 'demo-file-2',
    originalName: 'standup_notes_oct_18_draft_copy.md',
    sourceRelativePath: 'standup_notes_oct_18_draft_copy.md',
    extension: 'md',
    mimeType: 'text/markdown',
    sizeBytes: 14280,
    lastModified: '2026-10-18T10:05:00.000Z',
    suggestedCategory: 'Meeting Notes',
    suggestedFilename: '2026-10-18-notes-standup-oct-18.md',
    suggestedFolder: 'Workspace/Meetings',
    reasoning: 'Normalized meeting notes filename and stripped "_draft_copy" noise.',
    approved: true,
    status: 'demo-preview',
    isDemoData: true,
  },
  {
    id: 'demo-file-3',
    originalName: 'local_ollama_architecture_rfc_NEW.txt',
    sourceRelativePath: 'local_ollama_architecture_rfc_NEW.txt',
    extension: 'txt',
    mimeType: 'text/plain',
    sizeBytes: 29640,
    lastModified: '2026-10-19T17:42:00.000Z',
    suggestedCategory: 'Product & Specifications',
    suggestedFilename: '2026-10-19-spec-local-ollama-architecture-rfc.txt',
    suggestedFolder: 'Projects/Specs',
    reasoning: 'Detected RFC architecture document; standardized naming convention.',
    approved: true,
    status: 'demo-preview',
    isDemoData: true,
  },
  {
    id: 'demo-file-4',
    originalName: 'benchmark_latency_export (3).csv',
    sourceRelativePath: 'benchmark_latency_export (3).csv',
    extension: 'csv',
    mimeType: 'text/csv',
    sizeBytes: 185920,
    lastModified: '2026-10-19T21:10:00.000Z',
    suggestedCategory: 'Datasets & Exports',
    suggestedFilename: '2026-10-19-data-benchmark-latency-export.csv',
    suggestedFolder: 'Data/Exports',
    reasoning: 'Stripped duplicate counter "(3)" and grouped CSV dataset in Data/Exports.',
    approved: false,
    status: 'demo-preview',
    isDemoData: true,
  },
];
