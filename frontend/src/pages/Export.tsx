import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useCompanies } from '@/hooks/useCompanies';
import { useExport } from '@/hooks/useExport';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { cn, formatIndianNumber } from '@/lib/utils';
import type { CompanyFilters } from '@/types';

const ALL_FIELDS = [
  'company_name','website','owner_name','owner_role','phone_numbers','email_addresses',
  'address','city','state','country','industry_type','employee_count','current_erp',
];

type Format = 'csv' | 'xlsx';

export default function Export() {
  const [fields, setFields] = useState<Set<string>>(new Set(ALL_FIELDS));
  const [format, setFormat] = useState<Format>('csv');
  const [filters] = useState<CompanyFilters>({ page: 1, page_size: 1 });

  const { data: preview } = useCompanies(filters);
  const exportHook = useExport();

  const toggleField = (f: string) => {
    setFields((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const handleExport = () => {
    exportHook.mutate({ format, filters: { ...filters, page: undefined, page_size: undefined }, fields: Array.from(fields) });
  };

  return (
    <AppShell title="Export">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold mb-1">Export Companies</h1>
          <p className="text-sm text-muted-foreground">Download your scraped data as CSV or Excel.</p>
        </div>

        {/* Fields */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Select Fields</h2>
            <div className="flex gap-3 text-xs">
              <button onClick={() => setFields(new Set(ALL_FIELDS))} className="text-primary hover:underline">Select All</button>
              <button onClick={() => setFields(new Set())} className="text-muted-foreground hover:underline">Deselect All</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border hover:bg-accent text-sm">
                <input type="checkbox" checked={fields.has(f)} onChange={() => toggleField(f)} className="accent-primary" />
                <span className="truncate">{f.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Format */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Export Format</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'csv', label: 'CSV', icon: FileDown, desc: 'Universal, opens in any spreadsheet app' },
              { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'With formatting, auto-sized columns' },
            ] as const).map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={cn(
                  'border rounded-xl p-4 text-left transition-colors',
                  format === id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                )}
              >
                <Icon className={cn('w-6 h-6 mb-2', format === id ? 'text-primary' : 'text-muted-foreground')} />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Export CTA */}
        <section>
          {exportHook.progress > 0 && (
            <div className="mb-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${exportHook.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">{exportHook.progress}%</p>
            </div>
          )}
          <button
            onClick={handleExport}
            disabled={!preview?.total || fields.size === 0 || exportHook.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-40"
          >
            {exportHook.isPending
              ? 'Generating…'
              : `Export ${preview?.total ? formatIndianNumber(preview.total) : 0} Companies`}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
