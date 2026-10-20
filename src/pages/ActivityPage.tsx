import React, { useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import { ActivityEntry, ActivityType, NavSection } from '../types';
import { ActivityList } from '../components/ActivityList';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ActivityPageProps {
  entries: ActivityEntry[];
  onClearHistory: () => void;
  onNavigate: (section: NavSection) => void;
  onNotify: (
    title: string,
    description?: string,
    variant?: 'success' | 'warning' | 'error' | 'info'
  ) => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({
  entries,
  onClearHistory,
  onNavigate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const filteredEntries = entries.filter((entry) => {
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleExportActivity = () => {
    if (entries.length === 0) return;
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slothai-activity-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Activity log exported', 'Saved activity log JSON.', 'success');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF9A35]">
            [ 05 · AUDIT TRAIL ]
          </span>
          <h1 className="mt-1 text-2xl font-display font-bold tracking-tight text-[#F5F5F5]">
            Application Activity Log
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Displays real application actions stored in your browser. Zero
            fabricated historical events.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportActivity}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#FF9A35]" />
            <span>Export Log JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border border-red-500/30 text-[#F87171] hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter activity descriptions..."
            aria-label="Filter activity descriptions"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#FF9A35]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="activity-type-filter"
            className="text-xs font-mono uppercase tracking-wider text-[#71717A] whitespace-nowrap"
          >
            Action Type:
          </label>
          <select
            id="activity-type-filter"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | ActivityType)
            }
            className="px-3.5 py-2 text-xs rounded-xl border border-white/12 bg-[#060606] text-[#F5F5F5]"
          >
            <option value="all">All Actions ({entries.length})</option>
            <option value="summarize">AI Summarizer</option>
            <option value="extract_tasks">Task Extractor</option>
            <option value="organize_files">File Organizer</option>
            <option value="daily_briefing">Daily Briefing</option>
            <option value="connection_test">Connection Check</option>
            <option value="model_pull">Model Download</option>
            <option value="settings_update">Settings Updated</option>
          </select>
        </div>
      </div>

      <ActivityList
        entries={filteredEntries}
        emptyActionLabel="Go to AI Summarizer"
        onEmptyAction={() => onNavigate('summarizer')}
      />

      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        title="Clear Local Activity History?"
        description="This will permanently remove all recorded activity entries from your browser's localStorage. Your saved settings and tasks will not be affected."
        confirmLabel="Clear Activity History"
        variant="danger"
        onConfirm={() => {
          onClearHistory();
          setIsConfirmClearOpen(false);
          onNotify('Activity history cleared', 'Removed all activity entries.', 'info');
        }}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
};
