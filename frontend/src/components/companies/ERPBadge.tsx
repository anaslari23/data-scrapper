import { cn } from '@/lib/utils';

const ERP_CONFIG: Record<string, { label: string; cls: string }> = {
  SAP: { label: 'SAP', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  Oracle: { label: 'Oracle', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'Microsoft Dynamics': { label: 'MS Dynamics', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  Tally: { label: 'Tally', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  Zoho: { label: 'Zoho', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  Odoo: { label: 'Odoo', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  QuickBooks: { label: 'QuickBooks', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  Busy: { label: 'Busy', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  Marg: { label: 'Marg', cls: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' },
};

interface ERPBadgeProps {
  erp: string | null;
}

export function ERPBadge({ erp }: ERPBadgeProps) {
  const config = erp ? ERP_CONFIG[erp] : null;

  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Unknown
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', config.cls)}>
      {config.label}
    </span>
  );
}
