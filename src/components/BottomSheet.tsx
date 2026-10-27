import type { ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';

interface Props {
  expanded: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
}

/** Компактна панель для смартфонів, яку можна розгорнути та згорнути. */
export function BottomSheet({ expanded, onToggle, summary, children }: Props) {
  return (
    <section
      aria-label="Список об’єктів"
      className={`absolute inset-x-0 bottom-0 z-[900] flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.15)] transition-[max-height] duration-300 ease-out dark:bg-slate-900 ${
        expanded ? 'max-h-[72%]' : 'max-h-[76px]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full shrink-0 flex-col items-center gap-1.5 px-4 pb-2 pt-2"
      >
        <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="flex w-full items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
          {summary}
          <ChevronUp className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 ${expanded ? '' : 'invisible'}`}>{children}</div>
    </section>
  );
}
