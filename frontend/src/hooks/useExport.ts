import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportsApi } from '@/api/exports';
import type { ExportRequest } from '@/types';

export function useExport() {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (req: ExportRequest) => {
      setProgress(10);
      const exportJob = await exportsApi.create(req);
      setProgress(50);

      // Poll for completion
      let attempt = 0;
      while (attempt < 60) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await exportsApi.status(exportJob.id);
        attempt++;
        setProgress(Math.min(50 + attempt * 1.5, 95));
        if (status.status === 'ready' && status.download_url) {
          setProgress(100);
          exportsApi.download(status.download_url);
          return status;
        }
        if (status.status === 'failed') {
          throw new Error('Export generation failed');
        }
      }
      throw new Error('Export timed out');
    },
    onSettled: () => setTimeout(() => setProgress(0), 1500),
  });

  return { ...mutation, progress };
}
