import { apiClient } from './client';
import type { ScrapeJob, JobLogEvent } from '../types';

export const jobsApi = {
  list: () =>
    apiClient.get<ScrapeJob[]>('/jobs').then(r => r.data),

  get: (id: string) =>
    apiClient.get<ScrapeJob>(`/jobs/${id}`).then(r => r.data),

  create: (payload: { industry: string; cities: string[]; country: string; sources: string[]; max_companies: number }) =>
    apiClient.post<ScrapeJob>('/jobs', payload).then(r => r.data),

  cancel: (id: string) =>
    apiClient.delete(`/jobs/${id}`),

  logs: (id: string) =>
    apiClient.get<JobLogEvent[]>(`/jobs/${id}/logs`).then(r => r.data),
};
