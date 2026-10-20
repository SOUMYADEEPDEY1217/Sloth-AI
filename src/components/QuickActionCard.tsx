import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  kicker: string;
  actionLabel: string;
  Icon: React.FC<{ className?: string }>;
  onSelect: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  kicker,
  actionLabel,
  Icon,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col justify-between text-left p-5 rounded-2xl border border-white/[0.08] bg-[#0B0B0C] hover:border-[#FF6B1A]/50 hover:bg-[#101013] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full bg-[#FF6B1A]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#71717A] group-hover:text-[#FF9A35] transition-colors">
            [ {kicker} ]
          </span>
          <div className="p-2 rounded-xl bg-[#121215] border border-white/10 text-[#FF9A35] group-hover:border-[#FF6B1A]/40 shrink-0 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <h3 className="mt-3 text-base font-display font-semibold text-[#F5F5F5] group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
          {description}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-medium text-[#FF9A35]">
        <span className="whitespace-nowrap">{actionLabel}</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </button>
  );
};
