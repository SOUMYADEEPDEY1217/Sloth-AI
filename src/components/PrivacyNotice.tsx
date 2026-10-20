import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface PrivacyNoticeProps {
  variant?: 'sidebar' | 'panel';
  backendUrl?: string;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  variant = 'sidebar',
  backendUrl = '127.0.0.1:8000 -> 127.0.0.1:11434',
}) => {
  if (variant === 'sidebar') {
    return (
      <div
        className="px-3 py-2.5 rounded-xl bg-[#101012] border border-white/[0.08]"
        title="No cloud AI or analytics. Data stays in local storage and your configured local backend."
      >
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] font-semibold text-[#FF9A35]">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">LOCAL-FIRST PRIVACY</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#A1A1AA]">
          Zero cloud telemetry. Prompts route only to your configured local backend.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-[#121215] text-[#87A88C] border border-white/10 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F5]">
            Local-First Privacy Architecture
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
            SlothAI sends no telemetry, analytics, or prompts to hosted AI services.
            Requests route strictly to your configured local backend (
            <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#141418] border border-white/[0.08] text-[#FF9A35]">
              {backendUrl || 'localhost'}
            </code>
            ). Internet access is only required when initially installing packages or
            downloading an Ollama model.
          </p>
        </div>
      </div>
    </div>
  );
};
