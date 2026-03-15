import { apiClient } from './client';
import type { Company, CompanyFilters, PaginatedResponse, DashboardStats, IndustryStat, MetaOptions } from '../types';

export const companiesApi = {
  list: (filters: CompanyFilters = {}) =>
    apiClient.get<PaginatedResponse<Company>>('/companies', { params: filters }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Company>(`/companies/${id}`).then(r => r.data),

  patch: (id: string, data: Partial<Company>) =>
    apiClient.patch<Company>(`/companies/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/companies/${id}`),

  stats: () =>
    apiClient.get<DashboardStats>('/stats').then(r => r.data),

  byIndustry: () =>
    apiClient.get<IndustryStat[]>('/companies/stats/by-industry').then(r => r.data),

  meta: () =>
    apiClient.get<MetaOptions>('/meta').then(r => r.data),

  ollamaHealth: () =>
    apiClient.get<{ online: boolean; model: string | null }>('/health/ollama').then(r => r.data),
};
