import { cn } from '@/lib/utils';

interface QualityBadgeProps {
  score: number;
  showPercent?: boolean;
}

export function QualityBadge({ score, showPercent = false }: QualityBadgeProps) {
  const pct = Math.round(score * 100);
  const label = score >= 0.7 ? 'High' : score >= 0.4 ? 'Medium' : 'Low';

  const cls = cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
    score >= 0.7
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : score >= 0.4
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  );

  return (
    <span className={cls} title={`Quality: ${pct}%`}>
      {showPercent ? `${pct}%` : label}
    </span>
  );
}
