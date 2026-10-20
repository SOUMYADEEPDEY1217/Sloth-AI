import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to complete operation',
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div
      className="p-4 rounded-2xl border border-red-500/30 bg-red-950/20"
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#F87171] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-[#F87171]">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
              {message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[#121215] border border-white/12 text-[#F5F5F5] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FF9A35]" />
              <span>Retry</span>
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-2.5 py-1.5 text-xs font-medium text-[#71717A] hover:text-[#F5F5F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
