import { Car, CircleCheck } from 'lucide-react';
import type { ManagedLot, SpaceState } from '../types/location';

interface Props {
  lot: ManagedLot;
  states: Record<string, SpaceState> | undefined;
  onToggle: (spaceId: string) => void;
}

function formatTime(at: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} ${time}`;
}

/** Схема паркомісць: натискання на місце перемикає «вільне» / «зайняте». */
export function SpaceGrid({ lot, states, onToggle }: Props) {
  const free = lot.spaces.filter((s) => !states?.[s.id]?.occupied).length;
  const total = lot.spaces.length;
  const lastChange = Math.max(0, ...lot.spaces.map((s) => states?.[s.id]?.at ?? 0));
  // Два ряди місць, як на справжньому майданчику
  const half = Math.ceil(total / 2);
  const rows = [lot.spaces.slice(0, half), lot.spaces.slice(half)];

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-700" aria-label="Паркомісця">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">Паркомісця</h3>
        <p className="text-sm">
          <span className={`font-bold ${free > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Вільно {free}</span>
          <span className="text-slate-500 dark:text-slate-400"> з {total}</span>
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${half}, minmax(0, 1fr))` }}>
            {row.map((s) => {
              const st = states?.[s.id];
              const occupied = st?.occupied ?? false;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggle(s.id)}
                  aria-pressed={occupied}
                  aria-label={`Місце ${s.label}: ${occupied ? 'зайняте' : 'вільне'}. Натисніть, щоб змінити`}
                  title={st ? `Змінено о ${formatTime(st.at)}` : 'Статус ще не змінювали'}
                  className={`flex aspect-[3/4] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed text-sm font-bold transition active:scale-95 ${
                    occupied
                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                      : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300'
                  }`}
                >
                  {occupied ? <Car className="h-5 w-5" /> : <CircleCheck className="h-4 w-4 opacity-70" />}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" /> вільне
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> зайняте
        </span>
        {lastChange > 0 && <span>Останню зміну внесено о {formatTime(lastChange)}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Натисніть на місце, щоб позначити його вільним або зайнятим. Статус задається вручну і зберігається в цьому браузері.
      </p>
    </section>
  );
}
