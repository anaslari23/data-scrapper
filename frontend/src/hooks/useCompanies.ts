import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import type { CompanyFilters } from '@/types';

export function useCompanies(filters: CompanyFilters) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => companiesApi.list(filters),
    placeholderData: (prev) => prev,
  });
}
