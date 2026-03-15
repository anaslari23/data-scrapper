import { AppShell } from '@/components/layout/AppShell';
import { NewJobWizard } from '@/components/jobs/NewJobWizard';
import { useNavigate } from 'react-router-dom';

export default function NewJob() {
  const navigate = useNavigate();
  return (
    <AppShell title="New Job">
      <NewJobWizard onClose={() => navigate('/jobs')} />
    </AppShell>
  );
}
