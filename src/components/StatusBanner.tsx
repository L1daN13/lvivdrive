import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { LoadStatus } from '../hooks/useLocations';

interface Props {
  status: LoadStatus;
  error: string | null;
  onRetry: () => void;
  lastUpdated: Date | null;
  stale: boolean;
}

export function StatusBanner({ status, error, onRetry, lastUpdated, stale }: Props) {
  if (status === 'loading') {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Завантажуємо дані з OpenStreetMap…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Дані тимчасово недоступні</p>
          <p className="mt-0.5 text-red-700 dark:text-red-300">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:bg-transparent dark:text-red-200 dark:ring-red-500/40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Повторити
        </button>
      </div>
    );
  }
  if (status === 'ready' && lastUpdated && stale) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">
          Сервер даних недоступний. Показано збережену копію від {formatWhen(lastUpdated)}.
        </p>
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-medium hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Оновити
        </button>
      </div>
    );
  }
  if (status === 'ready' && lastUpdated) {
    return <p className="text-xs text-slate-400 dark:text-slate-500">Дані OpenStreetMap станом на {formatWhen(lastUpdated)}</p>;
  }
  return null;
}

function formatWhen(d: Date): string {
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return `сьогодні о ${time}`;
  return `${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} о ${time}`;
}
