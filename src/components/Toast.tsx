import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div role="alert" className="absolute left-1/2 top-16 z-[1200] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-fade-in items-start gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-float dark:bg-slate-100 dark:text-slate-900">
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onClose} aria-label="Закрити" className="opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
