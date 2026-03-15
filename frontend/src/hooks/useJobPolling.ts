import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
import type { JobStatus } from '@/types';

export function useJobPolling(jobId: string, status: JobStatus) {
  const isActive = status === 'running' || status === 'pending';

  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId),
    refetchInterval: isActive ? 3000 : false,
    enabled: !!jobId,
  });
}
