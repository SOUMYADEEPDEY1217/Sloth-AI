import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  sublabel?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Processing locally...',
  sublabel = 'Taking a slow, deliberate pass over your input.',
  rows = 3,
}) => {
  return (
    <div
      className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-[#FF9A35]">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xs text-[#71717A]">
        {sublabel}
      </p>

      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};
