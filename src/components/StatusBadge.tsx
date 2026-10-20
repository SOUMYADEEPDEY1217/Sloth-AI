import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  XCircle,
} from 'lucide-react';

export type BadgeStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'pending';

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
  detail?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  detail,
}) => {
  const styles: Record<
    BadgeStatus,
    { colorClass: string; Icon: React.FC<{ className?: string }> }
  > = {
    success: {
      colorClass: 'text-[#4ADE80]',
      Icon: CheckCircle2,
    },
    warning: {
      colorClass: 'text-[#FFA726]',
      Icon: AlertCircle,
    },
    error: {
      colorClass: 'text-[#F87171]',
      Icon: XCircle,
    },
    info: {
      colorClass: 'text-[#FF9A35]',
      Icon: Info,
    },
    pending: {
      colorClass: 'text-[#A1A1AA]',
      Icon: Clock,
    },
    neutral: {
      colorClass: 'text-[#71717A]',
      Icon: HelpCircle,
    },
  };

  const { colorClass, Icon } = styles[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
      <span className={colorClass}>{label}</span>
      {detail && (
        <>
          <span aria-hidden="true" className="text-[#71717A]">
            ·
          </span>
          <span className="text-[#A1A1AA] font-mono tabular-nums">
            {detail}
          </span>
        </>
      )}
    </span>
  );
};
