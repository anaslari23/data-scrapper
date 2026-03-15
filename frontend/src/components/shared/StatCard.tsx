import { cn, formatIndianNumber } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'yellow' | 'green' | 'purple';
  isLoading?: boolean;
  pulse?: boolean;
  suffix?: string;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-800/40',
    value: 'text-blue-700 dark:text-blue-300',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-800/40',
    value: 'text-amber-700 dark:text-amber-300',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800/40',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    icon: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-800/40',
    value: 'text-violet-700 dark:text-violet-300',
  },
};

export function StatCard({ label, value, icon: Icon, color, isLoading, pulse, suffix }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn('rounded-xl border border-border p-5 flex items-center gap-4', c.bg)}>
      <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center', c.iconBg)}>
        <Icon className={cn('w-5 h-5', c.icon, pulse && 'animate-pulse-dot')} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {isLoading ? (
          <div className="h-7 w-20 bg-muted animate-pulse rounded mt-1" />
        ) : (
          <p className={cn('text-2xl font-bold', c.value)}>
            {typeof value === 'number' ? formatIndianNumber(value) : value}
            {suffix && <span className="text-base ml-0.5">{suffix}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
