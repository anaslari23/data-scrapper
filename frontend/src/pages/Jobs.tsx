import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi } from '@/api/jobs';
import { AppShell } from '@/components/layout/AppShell';
import { JobCard, JobProgressBar } from '@/components/jobs/JobCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/LoadingSkeleton';
import { Briefcase, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn, formatDuration, formatRelativeDate } from '@/lib/utils';
import type { JobStatus } from '@/types';

// ─── Jobs List Page ───────────────────────────────────────────────────────────
export default function Jobs() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobsApi.list,
    refetchInterval: 5000,
  });

  return (
    <AppShell title="Scrape Jobs">
      <div className="max-w-4xl">
        <h1 className="text-xl font-bold mb-5">Scrape Jobs</h1>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !jobs?.length ? (
          <EmptyState icon={Briefcase} title="No jobs yet" description="Start a scrape job from the dashboard." />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Job Detail Page ──────────────────────────────────────────────────────────
export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.status as JobStatus | undefined;
      return status === 'running' || status === 'pending' ? 3000 : false;
    },
    enabled: !!id,
  });

  const { data: logs } = useQuery({
    queryKey: ['job-logs', id],
    queryFn: () => jobsApi.logs(id!),
    refetchInterval: job?.status === 'running' ? 3000 : false,
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job', id] }),
  });

  if (isLoading) {
    return (
      <AppShell title="Job Detail">
        <div className="max-w-3xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!job) return null;

  const STATUS_LABEL: Record<JobStatus, string> = {
    pending: 'Pending', running: 'Running', done: 'Completed', failed: 'Failed', cancelled: 'Cancelled'
  };

  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <AppShell title={`Job: ${job.target_query}`}>
      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">{job.target_query}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Started {formatRelativeDate(job.started_at)}</p>
          </div>
          <span className={cn(
            'text-xs font-bold px-3 py-1.5 rounded-full',
            job.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            job.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-muted text-muted-foreground'
          )}>
            {STATUS_LABEL[job.status]}
          </span>
        </div>

        {/* Progress */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-foreground">{job.progress_percent}%</span>
            {job.eta_seconds !== null && (
              <span className="text-sm text-muted-foreground">ETA: {formatDuration(job.eta_seconds)}</span>
            )}
          </div>
          <JobProgressBar percent={job.progress_percent} status={job.status} />
          {job.current_company && (
            <p className="text-xs text-muted-foreground">Currently: <span className="text-foreground">{job.current_company}</span></p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            ['Found', job.total_found],
            ['Processed', job.processed],
            ['Failed', job.failed_count],
            ['Elapsed', elapsed !== null ? formatDuration(elapsed) : '—'],
            ['ETA', job.eta_seconds !== null ? formatDuration(job.eta_seconds) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Log feed */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Log</p>
          </div>
          <div className="h-48 overflow-y-auto scrollbar-thin p-3 space-y-1 text-xs font-mono bg-background">
            {(logs ?? []).slice(-20).map((log, i) => (
              <div key={i} className={cn(
                log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                log.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                log.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              )}>
                {log.type === 'success' ? '✅' : log.type === 'warning' ? '⚠️' : log.type === 'error' ? '❌' : 'ℹ️'} {log.message}
              </div>
            ))}
            {!logs?.length && (
              <p className="text-muted-foreground text-center py-4">No log events yet</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {job.status === 'running' && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 border border-destructive text-destructive text-sm rounded-md hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4" /> Cancel Job
            </button>
          )}
          {job.status === 'done' && (
            <button
              onClick={() => navigate(`/companies?job_id=${job.id}`)}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md font-medium hover:opacity-90"
            >
              View Results →
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
