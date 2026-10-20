import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCw,
  ServerOff,
} from 'lucide-react';
import { ConnectionCheckResult } from '../types';

interface ModelStatusProps {
  connection: ConnectionCheckResult;
  onRetest: () => void;
  onOpenSettings: () => void;
  compact?: boolean;
}

export const ModelStatus: React.FC<ModelStatusProps> = ({
  connection,
  onRetest,
  onOpenSettings,
  compact = false,
}) => {
  const getStateDetails = () => {
    switch (connection.state) {
      case 'checking':
        return {
          Icon: Loader2,
          iconClass: 'text-[#A1A1AA] animate-spin',
          dotClass: 'bg-[#A1A1AA]',
          label: 'Checking backend & Ollama...',
          sublabel: connection.backendUrl,
        };
      case 'ready':
        return {
          Icon: CheckCircle2,
          iconClass: 'text-[#4ADE80]',
          dotClass: 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]',
          label: `Backend & Model Ready: ${connection.modelName}`,
          sublabel: `Ollama ${connection.ollamaBaseUrl}${
            connection.latencyMs !== null ? ` · ${connection.latencyMs}ms` : ''
          }`,
        };
      case 'backend-online-model-missing':
        return {
          Icon: AlertTriangle,
          iconClass: 'text-[#FFA726]',
          dotClass: 'bg-[#FFA726] shadow-[0_0_8px_#FFA726]',
          label: `Backend & Ollama Online · Pull '${connection.modelName}'`,
          sublabel: `${connection.availableModels.length} model(s) installed in Ollama`,
        };
      case 'backend-online-ollama-offline':
        return {
          Icon: AlertTriangle,
          iconClass: 'text-[#FF9A35]',
          dotClass: 'bg-[#FF9A35] shadow-[0_0_8px_#FF9A35]',
          label: 'Backend Online · Local Ollama Unreachable',
          sublabel: `Backend v${connection.backendVersion || '0.2.0'} active · Ollama (${connection.ollamaBaseUrl}) offline`,
        };
      case 'backend-unreachable':
      default:
        return {
          Icon: ServerOff,
          iconClass: 'text-[#F87171]',
          dotClass: 'bg-[#F87171]',
          label: 'Local Backend Unreachable',
          sublabel: `${connection.backendUrl} offline`,
        };
    }
  };

  const { Icon, iconClass, label, sublabel } = getStateDetails();

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#101012] text-xs">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClass}`} />
        <span className="font-mono text-[11px] text-[#F5F5F5] whitespace-nowrap shrink-0">
          {label}
        </span>
        <button
          type="button"
          onClick={onRetest}
          disabled={connection.state === 'checking'}
          title="Verify backend and Ollama status"
          className="p-1 rounded-full hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Verify backend and Ollama status"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#121215] border border-white/10 text-[#FF9A35] shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                {label}
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#A1A1AA] font-mono tabular-nums">
              {sublabel}
            </p>
            {connection.errorDetail && (
              <p className="mt-1.5 text-xs text-[#FF9A35]">
                {connection.errorDetail}
              </p>
            )}
            {connection.recoveryHint && (
              <p className="mt-1 text-xs text-[#71717A]">
                Recovery: {connection.recoveryHint}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRetest}
            disabled={connection.state === 'checking'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-white/25 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                connection.state === 'checking' ? 'animate-spin' : ''
              }`}
            />
            <span>Verify Status</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-[#FF6B1A]/40 bg-[#FF6B1A]/15 text-[#FF9A35] hover:bg-[#FF6B1A]/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  );
};
