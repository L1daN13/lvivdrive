import { Home, LocateFixed, Loader2, Minus, Plus, ScanSearch } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onLocate: () => void;
  locating: boolean;
  /** Показувати кнопку «Шукати в цій області». */
  showSearchArea: boolean;
  searchAreaDisabledReason: string | null;
  searchAreaLoading: boolean;
  onSearchArea: () => void;
}

function RoundButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 shadow-card ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

export function MapControls(p: Props) {
  return (
    <>
      {p.showSearchArea && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-4">
          <button
            type="button"
            onClick={p.onSearchArea}
            disabled={p.searchAreaLoading || p.searchAreaDisabledReason !== null}
            title={p.searchAreaDisabledReason ?? undefined}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-float ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
          >
            {p.searchAreaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4 text-brand-600" />}
            {p.searchAreaDisabledReason ?? 'Шукати в цій області'}
          </button>
        </div>
      )}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <RoundButton label="Наблизити" onClick={p.onZoomIn}>
          <Plus className="h-5 w-5" />
        </RoundButton>
        <RoundButton label="Віддалити" onClick={p.onZoomOut}>
          <Minus className="h-5 w-5" />
        </RoundButton>
        <RoundButton label="Початковий вигляд (Львів)" onClick={p.onResetView}>
          <Home className="h-5 w-5" />
        </RoundButton>
        <RoundButton label="Моє місцезнаходження" onClick={p.onLocate} disabled={p.locating}>
          {p.locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5 text-blue-600" />}
        </RoundButton>
      </div>
    </>
  );
}
