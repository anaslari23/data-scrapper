import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, PlusCircle, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import { cn } from '@/lib/utils';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const { data: ollamaHealth } = useQuery({
    queryKey: ['ollama-health'],
    queryFn: companiesApi.ollamaHealth,
    refetchInterval: 30_000,
    retry: false,
  });

  // Keyboard shortcut 'n' → new job
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        navigate('/jobs/new');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  const isOnline = ollamaHealth?.online;

  return (
    <header className="h-14 border-b border-border flex items-center gap-3 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <button
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors"
        title="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Ollama Status */}
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
          isOnline
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        )}
        title={ollamaHealth?.model ? `Model: ${ollamaHealth.model}` : 'Ollama status'}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Ollama · {ollamaHealth?.model ?? 'online'}</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Ollama offline</span>
          </>
        )}
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={() => setDark(d => !d)}
        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors"
        title="Toggle dark mode"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* New Job button */}
      <button
        onClick={() => navigate('/jobs/new')}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
        title="Start New Scrape (n)"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New Scrape</span>
      </button>
    </header>
  );
}
