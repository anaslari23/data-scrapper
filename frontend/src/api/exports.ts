import { apiClient } from './client';
import type { ExportRequest, ExportJob } from '../types';

export const exportsApi = {
  create: (req: ExportRequest) =>
    apiClient.post<ExportJob>('/export', req).then(r => r.data),

  status: (id: string) =>
    apiClient.get<ExportJob>(`/export/${id}`).then(r => r.data),

  download: (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.click();
  },
};
