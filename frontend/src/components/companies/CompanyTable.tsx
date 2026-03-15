import { useState, useEffect } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Company, CompanyFilters, PaginatedResponse } from '@/types';
import { QualityBadge } from './QualityBadge';
import { ERPBadge } from './ERPBadge';
import { CompanyDetailDrawer } from './CompanyDetailDrawer';
import { TableSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Building2 } from 'lucide-react';
import { getDomain, formatIndianNumber } from '@/lib/utils';

const PAGE_SIZES = [25, 50, 100];

interface CompanyTableProps {
  data?: PaginatedResponse<Company>;
  isLoading: boolean;
  filters: CompanyFilters;
  onFiltersChange: (f: CompanyFilters) => void;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
}

export function CompanyTable({ data, isLoading, filters, onFiltersChange, selectedIds, onSelectedChange }: CompanyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (sorting.length > 0) {
      onFiltersChange({
        ...filters,
        sort_by: sorting[0].id,
        sort_dir: sorting[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  }, [sorting]);

  const companies = data?.data ?? [];

  const columns: ColumnDef<Company>[] = [
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="accent-primary"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="accent-primary"
          checked={selectedIds.has(row.original.id)}
          onChange={() => {
            const next = new Set(selectedIds);
            next.has(row.original.id) ? next.delete(row.original.id) : next.add(row.original.id);
            onSelectedChange(next);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { accessorKey: 'sl_no', header: '#', size: 60 },
    {
      accessorKey: 'company_name',
      header: 'Company',
      size: 200,
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground truncate block">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'website',
      header: 'Website',
      size: 150,
      cell: ({ getValue }) => {
        const url = getValue<string>();
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {getDomain(url)}
          </a>
        );
      },
    },
    {
      id: 'contact',
      header: 'Contact',
      size: 180,
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground truncate">{row.original.owner_name ?? '—'}</p>
          {row.original.owner_role && (
            <p className="text-xs text-muted-foreground truncate">{row.original.owner_role}</p>
          )}
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      size: 140,
      cell: ({ row }) => {
        const phones = row.original.phone_numbers;
        if (!phones?.length) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs truncate">{phones[0]}</span>
            {phones.length > 1 && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">+{phones.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      size: 180,
      cell: ({ row }) => {
        const emails = row.original.email_addresses;
        if (!emails?.length) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex items-center gap-1 max-w-full">
            <span className="text-xs truncate">{emails[0]}</span>
            {emails.length > 1 && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">+{emails.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'location',
      header: 'City, State',
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs text-foreground">{[row.original.city, row.original.state].filter(Boolean).join(', ')}</span>
      ),
    },
    {
      accessorKey: 'industry_type',
      header: 'Industry',
      size: 130,
      cell: ({ getValue }) => (
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full truncate block max-w-[120px]">
          {getValue<string>() || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'employee_count',
      header: 'Employees',
      size: 100,
      cell: ({ getValue }) => <span className="text-xs">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'current_erp',
      header: 'ERP',
      size: 120,
      cell: ({ getValue }) => <ERPBadge erp={getValue<string | null>()} />,
    },
    {
      accessorKey: 'data_quality_score',
      header: 'Quality',
      size: 80,
      cell: ({ getValue }) => <QualityBadge score={getValue<number>()} />,
    },
  ];

  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const totalPages = data?.total_pages ?? 1;
  const currentPage = filters.page ?? 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading ? (
          <TableSkeleton />
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Try adjusting your filters or start a new scrape job."
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={header.column.getCanSort() ? 'flex items-center gap-1 hover:text-foreground' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && <ArrowUp className="w-3 h-3" />}
                          {header.column.getIsSorted() === 'desc' && <ArrowDown className="w-3 h-3" />}
                          {!header.column.getIsSorted() && header.column.getCanSort() && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setActiveCompany(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted-foreground bg-background shrink-0">
          <span>
            Showing {formatIndianNumber((currentPage - 1) * (filters.page_size ?? 25) + 1)}–
            {formatIndianNumber(Math.min(currentPage * (filters.page_size ?? 25), data.total))} of {formatIndianNumber(data.total)}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={filters.page_size ?? 25}
              onChange={(e) => onFiltersChange({ ...filters, page_size: Number(e.target.value), page: 1 })}
              className="border border-input rounded px-1.5 py-1 bg-background text-xs"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button
              disabled={currentPage <= 1}
              onClick={() => onFiltersChange({ ...filters, page: currentPage - 1 })}
              className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onFiltersChange({ ...filters, page: currentPage + 1 })}
              className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <CompanyDetailDrawer
        company={activeCompany}
        onClose={() => setActiveCompany(null)}
      />
    </div>
  );
}
