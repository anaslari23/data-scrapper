// ─── Company ────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  sl_no: number;
  company_name: string;
  website: string;
  owner_name: string | null;
  owner_role: string | null;
  phone_numbers: string[];
  email_addresses: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  industry_type: string;
  employee_count: string;
  branch_count: number | null;
  annual_turnover: string | null;
  current_erp: string | null;
  additional_info: Record<string, unknown>;
  data_quality_score: number;
  sources: string[];
  created_at: string;
  updated_at: string;
}

// ─── Scrape Job ──────────────────────────────────────────────────────────────
export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

export interface ScrapeJob {
  id: string;
  status: JobStatus;
  target_query: string;
  total_found: number;
  processed: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  current_company: string | null;
  eta_seconds: number | null;
}

export interface JobLogEvent {
  timestamp: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────────
export interface CompanyFilters {
  q?: string;
  industry?: string;
  city?: string;
  erp?: string;
  employee_band?: string;
  quality_min?: number;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

// ─── Paginated Response ───────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export interface ExportRequest {
  format: 'csv' | 'xlsx';
  filters: CompanyFilters;
  fields: string[];
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  download_url?: string;
  file_size?: number;
  row_count?: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_companies: number;
  jobs_running: number;
  avg_quality: number;
  scraped_today: number;
}

export interface IndustryStat {
  industry: string;
  count: number;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface OllamaHealth {
  online: boolean;
  model: string | null;
  version?: string;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────
export interface MetaOptions {
  industries: string[];
  cities: string[];
  erp_options: string[];
}
