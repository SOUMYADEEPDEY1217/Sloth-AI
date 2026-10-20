import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const iconMap = {
          success: (
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          ),
          warning: (
            <AlertTriangle className="w-4 h-4 text-[#FFA726] shrink-0" />
          ),
          error: (
            <XCircle className="w-4 h-4 text-[#F87171] shrink-0" />
          ),
          info: (
            <Info className="w-4 h-4 text-[#FF9A35] shrink-0" />
          ),
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-2xl border border-white/12 bg-[#0B0B0C]/95 backdrop-blur-xl shadow-2xl transition-all duration-150"
            role="status"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{iconMap[toast.variant]}</div>
              <div>
                <p className="text-xs font-semibold text-[#F5F5F5]">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-[#A1A1AA]">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
