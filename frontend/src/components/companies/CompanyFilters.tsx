import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import { cn } from '@/lib/utils';
import type { CompanyFilters } from '@/types';

const EMPLOYEE_BANDS = ['1-10', '11-50', '51-200', '201-500', '500+'];
const KNOWN_ERPS = ['SAP', 'Oracle', 'Microsoft Dynamics', 'Tally', 'Zoho', 'Odoo', 'QuickBooks', 'Busy', 'Marg'];

interface CompanyFiltersProps {
  filters: CompanyFilters;
  onChange: (filters: CompanyFilters) => void;
  onClear: () => void;
}

export function CompanyFilters({ filters, onChange, onClear }: CompanyFiltersProps) {
  const [open, setOpen] = useState(true);
  const [searchValue, setSearchValue] = useState(filters.q ?? '');

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: companiesApi.meta,
    staleTime: 60_000,
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchValue !== filters.q) {
        onChange({ ...filters, q: searchValue || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchValue]);

  const activeCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== '' && v !== 1 && v !== 'asc'
  ).length;

  const toggle = useCallback(<K extends keyof CompanyFilters>(key: K, val: CompanyFilters[K]) => {
    onChange({ ...filters, [key]: filters[key] === val ? undefined : val, page: 1 });
  }, [filters, onChange]);

  return (
    <aside className={cn('border-r border-border bg-background transition-all duration-300', open ? 'w-72' : 'w-12')}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <button
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {open && (
            <>
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </>
          )}
        </button>
        {open && activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="p-3 space-y-5 overflow-y-auto h-[calc(100vh-7rem)] scrollbar-thin">
          {/* Search */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                id="search-input"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Company, city…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Industry */}
          <FilterSection label="Industry">
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
              {(meta?.industries ?? []).map((ind) => (
                <Checkbox
                  key={ind}
                  label={ind}
                  checked={filters.industry === ind}
                  onChange={() => toggle('industry', ind)}
                />
              ))}
            </div>
          </FilterSection>

          {/* City */}
          <FilterSection label="City">
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
              {(meta?.cities ?? []).map((city) => (
                <Checkbox
                  key={city}
                  label={city}
                  checked={filters.city === city}
                  onChange={() => toggle('city', city)}
                />
              ))}
            </div>
          </FilterSection>

          {/* ERP */}
          <FilterSection label="ERP Software">
            <select
              value={filters.erp ?? ''}
              onChange={(e) => onChange({ ...filters, erp: e.target.value || undefined, page: 1 })}
              className="w-full text-sm border border-input rounded-md bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Any ERP</option>
              <option value="__unknown__">Unknown</option>
              {KNOWN_ERPS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </FilterSection>

          {/* Employee Count */}
          <FilterSection label="Employee Count">
            <div className="space-y-1">
              {EMPLOYEE_BANDS.map((band) => (
                <Checkbox
                  key={band}
                  label={band}
                  checked={filters.employee_band === band}
                  onChange={() => toggle('employee_band', band)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Quality */}
          <FilterSection label="Min Quality Score">
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={(filters.quality_min ?? 0) * 100}
                onChange={(e) => onChange({ ...filters, quality_min: Number(e.target.value) / 100, page: 1 })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground text-right">{Math.round((filters.quality_min ?? 0) * 100)}%</p>
            </div>
          </FilterSection>
        </div>
      )}
    </aside>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
      >
        {label}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 accent-primary"
      />
      <span className="text-sm text-foreground group-hover:text-foreground/80 truncate">{label}</span>
    </label>
  );
}
