import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { searchPlace, type PlaceResult } from '../services/geocoding';
import { LVIV_BBOX } from '../utils/constants';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Кількість об'єктів, що відповідають запиту. */
  matchCount: number;
  onPlaceSelect: (place: PlaceResult) => void;
}

/**
 * Пошук по завантажених об'єктах (назва, адреса, оператор) — миттєво, локально.
 * Додатково можна знайти вулицю чи місце у Львові через Nominatim (лише за натисканням).
 */
export function SearchBar({ value, onChange, matchCount, onPlaceSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [placeState, setPlaceState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPlaces(null);
    setPlaceState('idle');
    setPlaceError(null);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function findPlaces() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPlaceState('loading');
    try {
      const res = await searchPlace(`${value}, Львів`, LVIV_BBOX, ctrl.signal);
      setPlaces(res);
      setPlaceState('idle');
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setPlaceState('error');
      setPlaceError(err instanceof Error ? err.message : 'Помилка пошуку адреси.');
    }
  }

  const trimmed = value.trim();
  const showDropdown = open && trimmed.length >= 3;

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && trimmed.length >= 3 && matchCount === 0) void findPlaces();
        }}
        placeholder="Назва, вулиця або оператор…"
        aria-label="Пошук парковок і зарядних станцій"
        className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-sm text-slate-900 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Очистити пошук"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-12 z-[1100] animate-fade-in overflow-hidden rounded-xl bg-white text-sm shadow-float ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <div className="px-3 py-2 text-slate-500 dark:text-slate-400">
            {matchCount > 0 ? `Знайдено об’єктів: ${matchCount}` : 'Серед завантажених об’єктів збігів немає'}
          </div>
          {places === null ? (
            <button
              type="button"
              onClick={() => void findPlaces()}
              disabled={placeState === 'loading'}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left font-medium text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-700/50"
            >
              {placeState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Знайти адресу «{trimmed}» на карті
            </button>
          ) : places.length === 0 ? (
            <div className="border-t border-slate-100 px-3 py-2.5 text-slate-500 dark:border-slate-700">Адресу у Львові не знайдено</div>
          ) : (
            <ul className="max-h-64 overflow-auto border-t border-slate-100 dark:border-slate-700">
              {places.map((p) => (
                <li key={`${p.lat},${p.lon}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPlaceSelect(p);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {placeState === 'error' && <div className="border-t border-slate-100 px-3 py-2 text-red-600 dark:border-slate-700">{placeError}</div>}
          <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:border-slate-700">Пошук адрес: Nominatim / OpenStreetMap</div>
        </div>
      )}
    </div>
  );
}
