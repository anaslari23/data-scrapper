import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CITY_SUGGESTIONS = ['Kolkata', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];
const INDUSTRY_SUGGESTIONS = ['IT Services', 'Manufacturing', 'Healthcare', 'Finance', 'Retail', 'Education', 'Logistics'];
const SOURCES = [
  { id: 'duckduckgo', label: 'DuckDuckGo Search', desc: 'Free, recommended', defaultOn: true },
  { id: 'bing', label: 'Bing Search', desc: 'Free scraping', defaultOn: true },
  { id: 'indiamart', label: 'IndiaMart Directory', desc: 'Free', defaultOn: true },
  { id: 'justdial', label: 'JustDial', desc: 'Free', defaultOn: true },
  { id: 'zaubacorp', label: 'Zaubacorp / MCA Registry', desc: 'Free, slower', defaultOn: false },
  { id: 'exportersindia', label: 'ExportersIndia', desc: 'Free', defaultOn: false },
  { id: 'google_cse', label: 'Google CSE', desc: 'Free tier: 100/day', defaultOn: false },
];

const STEP_LABELS = ['Target', 'Sources', 'Filters', 'Review'];

interface Props { onClose: () => void; }

export function NewJobWizard({ onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [country, setCountry] = useState('India');
  const [sources, setSources] = useState<Set<string>>(
    new Set(SOURCES.filter((s) => s.defaultOn).map((s) => s.id))
  );
  const [maxCompanies, setMaxCompanies] = useState(200);

  const createJob = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: (job) => { onClose(); navigate(`/jobs/${job.id}`); },
  });

  const toggleSource = (id: string) => {
    setSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addCity = (c: string) => {
    if (c && !cities.includes(c)) setCities((p) => [...p, c]);
    setCityInput('');
  };

  const removeCity = (c: string) => setCities((p) => p.filter((x) => x !== c));

  const estimatedMinutes = Math.round(maxCompanies * 0.25);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold">New Scrape Job</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary/20 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:block', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{label}</span>
              {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Industry / Keywords</label>
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. IT Services, Manufacturing, Pharma"
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {INDUSTRY_SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setIndustry(s)}
                      className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors', industry === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Target Cities</label>
                <div className="flex gap-2">
                  <input
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCity(cityInput)}
                    placeholder="Type city + Enter"
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={() => addCity(cityInput)} className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {CITY_SUGGESTIONS.map((c) => (
                    <button key={c} onClick={() => addCity(c)}
                      className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors', cities.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}
                    >{c}</button>
                  ))}
                </div>
                {cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cities.map((c) => (
                      <span key={c} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        {c}
                        <button onClick={() => removeCity(c)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>UAE</option>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select sources to scrape from. All are free.</p>
              {SOURCES.map((s) => (
                <label key={s.id} className={cn(
                  'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                  sources.has(s.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                )}>
                  <input
                    type="checkbox"
                    checked={sources.has(s.id)}
                    onChange={() => toggleSource(s.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Max Companies to Scrape</label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={maxCompanies}
                  onChange={(e) => setMaxCompanies(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">Estimated time: ~{estimatedMinutes} minutes</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">Summary</h3>
                <Row label="Industry" value={industry || '(not set)'} />
                <Row label="Cities" value={cities.length ? cities.join(', ') : 'All'} />
                <Row label="Country" value={country} />
                <Row label="Sources" value={`${sources.size} selected`} />
                <Row label="Max Companies" value={String(maxCompanies)} />
                <Row label="Est. Duration" value={`~${estimatedMinutes} minutes`} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(p => p - 1)} className="flex items-center gap-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < 3) { setStep(p => p + 1); return; }
              createJob.mutate({ industry, cities, country, sources: Array.from(sources), max_companies: maxCompanies });
            }}
            disabled={createJob.isPending}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {step === 3 ? (createJob.isPending ? 'Starting…' : 'Start Scraping') : (<>Next <ChevronRight className="w-4 h-4" /></>)}
          </button>
        </div>
      </aside>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
