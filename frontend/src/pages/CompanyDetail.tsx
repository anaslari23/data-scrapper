import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyDetailDrawer } from '@/components/companies/CompanyDetailDrawer';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesApi.get(id!),
    enabled: !!id,
  });

  return (
    <AppShell title={company?.company_name ?? 'Company'}>
      <div className="p-2">
        <CompanyDetailDrawer
          company={company ?? null}
          onClose={() => navigate(-1)}
        />
      </div>
    </AppShell>
  );
}
