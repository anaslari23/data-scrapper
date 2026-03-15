import { useState } from 'react';
import { X, ExternalLink, Mail, Phone, Copy, Check, Edit, RefreshCw, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import type { Company } from '@/types';
import { QualityBadge } from './QualityBadge';
import { ERPBadge } from './ERPBadge';
import { cn, getDomain } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

type Tab = 'overview' | 'contacts' | 'sources' | 'edit';

interface Props {
  company: Company | null;
  onClose: () => void;
}

const schema = z.object({
  company_name: z.string().min(1),
  website: z.string().optional(),
  owner_name: z.string().nullable().optional(),
  owner_role: z.string().nullable().optional(),
  address: z.string().optional(),
  industry_type: z.string().optional(),
  employee_count: z.string().optional(),
  annual_turnover: z.string().nullable().optional(),
  current_erp: z.string().nullable().optional(),
});
type FormData = z.infer<typeof schema>;

export function CompanyDetailDrawer({ company, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: company as unknown as FormData,
  });

  const patchMutation = useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.patch(company!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => companiesApi.delete(company!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
  });

  if (!company) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'sources', label: 'Sources' },
    { key: 'edit', label: 'Edit' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{company.company_name}</h2>
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <ExternalLink className="w-3 h-3" /> {getDomain(company.website)}
              </a>
            )}
            <div className="flex items-center gap-2 mt-2">
              <QualityBadge score={company.data_quality_score} showPercent />
              <ERPBadge erp={company.current_erp} />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setTab('edit')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit">
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Re-scrape">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {tab === 'overview' && <OverviewTab company={company} />}
          {tab === 'contacts' && <ContactsTab company={company} />}
          {tab === 'sources' && <SourcesTab company={company} />}
          {tab === 'edit' && (
            <form onSubmit={handleSubmit((d) => patchMutation.mutate(d as unknown as Partial<Company>))} className="space-y-4">
              {(Object.keys(schema.shape) as (keyof FormData)[]).map((key) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground capitalize mb-1 block">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    {...register(key)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!isDirty || patchMutation.isPending}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {patchMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => reset()} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete company?"
        description={`This will permanently delete "${company.company_name}" and all its data.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value ?? '—'}</p>
    </div>
  );
}

function OverviewTab({ company }: { company: Company }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="SL No." value={company.sl_no} />
      <Field label="Industry" value={company.industry_type} />
      <Field label="Owner Name" value={company.owner_name} />
      <Field label="Owner Role" value={company.owner_role} />
      <Field label="Employees" value={company.employee_count} />
      <Field label="Branches" value={company.branch_count} />
      <Field label="Annual Turnover" value={company.annual_turnover} />
      <Field label="ERP" value={company.current_erp} />
      <div className="col-span-2">
        <Field label="Address" value={company.address} />
      </div>
      {Object.keys(company.additional_info ?? {}).length > 0 && (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Additional Info</p>
          <div className="bg-muted rounded-md p-3 space-y-1">
            {Object.entries(company.additional_info).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-muted-foreground font-medium">{k}:</span>
                <span className="text-foreground">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-accent text-muted-foreground">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ContactsTab({ company }: { company: Company }) {
  const contacts = company as unknown as { contacts?: Array<{ name?: string; role?: string; phone?: string; email?: string }> };
  const contactList = contacts.contacts ?? [
    { phone: company.phone_numbers?.[0], email: company.email_addresses?.[0], name: company.owner_name ?? undefined, role: company.owner_role ?? undefined }
  ];
  return (
    <div className="space-y-3">
      {contactList.map((c, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2">
          {c.name && <p className="font-semibold text-sm">{c.name}
            {c.role && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c.role}</span>}
          </p>}
          {c.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{c.phone}</span>
              <CopyButton text={c.phone} />
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <a href={`mailto:${c.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{c.email}</a>
              <CopyButton text={c.email} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SourcesTab({ company }: { company: Company }) {
  return (
    <div className="space-y-2">
      {(company.sources ?? []).map((url, i) => (
        <div key={i} className="flex items-center gap-2 p-3 border border-border rounded-lg">
          <img
            src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=16`}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <span className="flex-1 text-xs text-foreground truncate" title={url}>{url}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ))}
      {!company.sources?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">No source URLs recorded</p>
      )}
    </div>
  );
}
