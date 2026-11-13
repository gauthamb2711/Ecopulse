import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  accentClass?: string;
  onClick?: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  accentClass = 'text-slate-100',
  onClick,
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full flex-col justify-between rounded-xl border border-slate-800 bg-[#0F172A] p-4 text-left transition-colors ${
        onClick ? 'hover:border-slate-700 hover:bg-[#131D33] cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} />
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${accentClass}`}>
        {value}
      </div>
      {subtext && <p className="mt-1 text-xs text-slate-400 truncate">{subtext}</p>}
    </Wrapper>
  );
};
