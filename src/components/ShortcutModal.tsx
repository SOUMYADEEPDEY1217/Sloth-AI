import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: 'Alt + 0', description: 'Return to SlothAI Brand Website' },
    { keys: 'Alt + 1', description: 'Go to Overview Dashboard' },
    { keys: 'Alt + 2', description: 'Go to AI Summarizer' },
    { keys: 'Alt + 3', description: 'Go to Task Extractor' },
    { keys: 'Alt + 4', description: 'Go to File Organizer' },
    { keys: 'Alt + 5', description: 'Go to Daily Briefing' },
    { keys: 'Alt + 6', description: 'Go to Activity Log' },
    { keys: 'Alt + 7', description: 'Go to Settings' },
    { keys: 'Alt + K', description: 'Toggle Keyboard Shortcuts Help' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0B0B0C] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-[#FF9A35]" />
            <h2
              id="shortcut-modal-title"
              className="text-base font-display font-semibold text-[#F5F5F5]"
            >
              Global Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-white/[0.08]">
          {shortcuts.map((item) => (
            <div
              key={item.keys}
              className="flex items-center justify-between py-2.5 text-xs"
            >
              <span className="text-[#A1A1AA]">
                {item.description}
              </span>
              <kbd className="px-2 py-1 font-mono text-[11px] rounded bg-[#141418] border border-white/12 text-[#FF9A35] tabular-nums">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
