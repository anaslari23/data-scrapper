import { useNavigate } from 'react-router-dom';
import { formatRelativeDate, formatDuration, cn } from '@/lib/utils';
import type { ScrapeJob, JobStatus } from '@/types';

const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  running: { label: 'Running', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse-dot' },
  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

interface JobCardProps {
  job: ScrapeJob;
}

export function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[job.status];

  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="border border-border rounded-xl p-4 hover:bg-accent/40 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground truncate">{job.target_query}</p>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0', cfg.cls)}>
          {cfg.label}
        </span>
      </div>
      <JobProgressBar percent={job.progress_percent} status={job.status} />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{job.processed} / {job.total_found} companies</span>
        <span>{elapsed !== null ? formatDuration(elapsed) : formatRelativeDate(job.started_at)}</span>
      </div>
      {job.current_company && job.status === 'running' && (
        <p className="text-xs text-muted-foreground mt-1 truncate">↳ {job.current_company}</p>
      )}
    </div>
  );
}

export function JobProgressBar({ percent, status }: { percent: number; status: JobStatus }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          status === 'done' ? 'bg-emerald-500' :
          status === 'failed' ? 'bg-red-500' :
          status === 'running' ? 'bg-blue-500' : 'bg-slate-400'
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
