import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DownloadCloud,
  FileText,
  FolderKanban,
  Info,
  ListTodo,
  Newspaper,
  Settings,
  Wifi,
  XCircle,
} from 'lucide-react';
import { ActivityEntry, ActivityType } from '../types';
import { EmptyState } from './EmptyState';

interface ActivityListProps {
  entries: ActivityEntry[];
  limit?: number;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  entries,
  limit,
  emptyActionLabel,
  onEmptyAction,
}) => {
  const displayed = limit ? entries.slice(0, limit) : entries;

  if (displayed.length === 0) {
    return (
      <EmptyState
        title="No recorded activity yet"
        description="SlothAI only logs real actions you perform in this workspace—such as summarizing documents, extracting tasks, staging file renames, or testing your local model connection."
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  const typeMeta: Record<
    ActivityType,
    { label: string; Icon: React.FC<{ className?: string }> }
  > = {
    summarize: { label: 'AI Summarizer', Icon: FileText },
    extract_tasks: { label: 'Task Extractor', Icon: ListTodo },
    organize_files: { label: 'File Organizer', Icon: FolderKanban },
    daily_briefing: { label: 'Daily Briefing', Icon: Newspaper },
    connection_test: { label: 'Connection Check', Icon: Wifi },
    model_pull: { label: 'Model Download', Icon: DownloadCloud },
    settings_update: { label: 'Settings Updated', Icon: Settings },
    system: { label: 'Workspace', Icon: Info },
  };

  const statusMeta = {
    success: {
      label: 'Completed',
      color: 'text-[#4ADE80]',
      Icon: CheckCircle2,
    },
    warning: {
      label: 'Notice',
      color: 'text-[#FFA726]',
      Icon: AlertTriangle,
    },
    error: {
      label: 'Failed',
      color: 'text-[#F87171]',
      Icon: XCircle,
    },
    info: {
      label: 'Recorded',
      color: 'text-[#FF9A35]',
      Icon: Info,
    },
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#0B0B0C] overflow-hidden">
      {displayed.map((entry) => {
        const tMeta = typeMeta[entry.type] || typeMeta.system;
        const sMeta = statusMeta[entry.status] || statusMeta.info;
        const TypeIcon = tMeta.Icon;
        const StatusIcon = sMeta.Icon;

        return (
          <div
            key={entry.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-[#121215] border border-white/10 text-[#FF9A35] shrink-0 mt-0.5">
                <TypeIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#F5F5F5]">
                  {entry.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#71717A]">
                  <span className="font-mono uppercase tracking-wider text-[#A1A1AA]">
                    {tMeta.label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${sMeta.color}`}
                  >
                    <StatusIcon className="w-3 h-3 shrink-0" />
                    <span>{sMeta.label}</span>
                  </span>
                  {entry.sourceMode && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {entry.sourceMode === 'live-ollama'
                          ? 'Live Local Model'
                          : entry.sourceMode === 'demo-sample'
                          ? 'Demo Data'
                          : 'System Action'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono tabular-nums text-[#71717A] shrink-0 pl-10 sm:pl-0">
              {formatTimestamp(entry.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
