import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import { jobsApi } from '@/api/jobs';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardSkeleton } from '@/components/shared/LoadingSkeleton';
import { JobCard } from '@/components/jobs/JobCard';
import { NewJobWizard } from '@/components/jobs/NewJobWizard';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Building2, Loader2, ShieldCheck, Calendar, Briefcase,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#64748b'];

export default function Dashboard() {
  const [showWizard, setShowWizard] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: companiesApi.stats,
  });

  const { data: industryData } = useQuery({
    queryKey: ['industry-stats'],
    queryFn: companiesApi.byIndustry,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobsApi.list,
    refetchInterval: 5000,
  });

  const recentJobs = (jobs ?? []).slice(0, 10);

  // Group pie chart into top 8 + others
  const pieData = (() => {
    if (!industryData) return [];
    const sorted = [...industryData].sort((a, b) => b.count - a.count);
    const top8 = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((s, d) => s + d.count, 0);
    if (rest > 0) top8.push({ industry: 'Others', count: rest });
    return top8;
  })();

  return (
    <AppShell title="Dashboard">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Companies" value={stats?.total_companies ?? 0} icon={Building2} color="blue" />
            <StatCard label="Jobs Running" value={stats?.jobs_running ?? 0} icon={Loader2} color="yellow" pulse={(stats?.jobs_running ?? 0) > 0} />
            <StatCard label="Avg Quality" value={`${Math.round((stats?.avg_quality ?? 0) * 100)}%`} icon={ShieldCheck} color="green" />
            <StatCard label="Scraped Today" value={stats?.scraped_today ?? 0} icon={Calendar} color="purple" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Jobs */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground">Recent Jobs</h2>
            <button
              onClick={() => setShowWizard(true)}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:opacity-90"
            >
              + New Scrape
            </button>
          </div>
          {recentJobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs yet" description="Start a scrape to see results here." />
          ) : (
            recentJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>

        {/* Industry Chart */}
        <div className="lg:col-span-2 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Industry Breakdown</h2>
          {pieData.length === 0 ? (
            <EmptyState icon={Building2} title="No data yet" className="py-12" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="industry" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Companies']} />
                <Legend formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {showWizard && <NewJobWizard onClose={() => setShowWizard(false)} />}
    </AppShell>
  );
}
