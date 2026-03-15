import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyFilters } from '@/components/companies/CompanyFilters';
import { CompanyTable } from '@/components/companies/CompanyTable';
import { useCompanies } from '@/hooks/useCompanies';
import { RefreshCw, Download } from 'lucide-react';
import type { CompanyFilters as Filters } from '@/types';
import { formatIndianNumber } from '@/lib/utils';

const DEFAULT_FILTERS: Filters = { page: 1, page_size: 25 };

export default function Companies() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data, isLoading, refetch } = useCompanies(filters);

  return (
    <AppShell title="Companies">
      <div className="flex h-[calc(100vh-3.5rem-2rem)] -m-4 md:-m-6">
        {/* Filters sidebar */}
        <CompanyFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
        />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-background">
            <span className="text-sm text-muted-foreground">
              {data ? <><span className="font-semibold text-foreground">{formatIndianNumber(data.total)}</span> companies</> : 'Loading…'}
            </span>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:opacity-90">
                  <Download className="w-3.5 h-3.5" /> Export {selectedIds.size} selected
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-md hover:bg-accent"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <CompanyTable
            data={data}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
          />
        </div>
      </div>
    </AppShell>
  );
}
