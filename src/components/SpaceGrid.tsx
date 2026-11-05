import { useEffect, useState } from 'react';
import { Car, CircleCheck, Clock, Timer } from 'lucide-react';
import type { Booking, ManagedLot, SpaceState } from '../types/location';
import { BOOKING_MAX_MINUTES, BOOKING_MIN_MINUTES } from '../hooks/useSpaceStatus';

interface Props {
  lotId: string;
  lot: ManagedLot;
  /** Фактичні стани місць (прострочені броні вже «вільні»). */
  states: Record<string, SpaceState>;
  now: number;
  clientId: string;
  myBooking: Booking | null;
  onSetOccupied: (spaceId: string, occupied: boolean) => void;
  onReserve: (spaceId: string, minutes: number) => boolean;
  onExtend: (spaceId: string, minutes: number) => void;
  onCancel: (spaceId: string) => void;
  onArrive: (spaceId: string) => void;
}

const PRESETS = [15, 30, 60, 120];

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

/** Залишок часу у вигляді 1:05:09 або 04:59. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} хв`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} год ${m} хв` : `${h} год`;
}

const TILE: Record<SpaceState['status'], string> = {
  free: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300',
  occupied: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  reserved: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
};

const STATUS_LABEL: Record<SpaceState['status'], string> = {
  free: 'вільне',
  occupied: 'зайняте',
  reserved: 'заброньоване',
};

/** Схема паркомісць з бронюванням: натисніть на місце, щоб побачити дії. */
export function SpaceGrid(p: Props) {
  const { lot, states, now, clientId, myBooking } = p;
  // За замовчуванням виділяємо своє заброньоване місце
  const [selected, setSelected] = useState<string | null>(myBooking?.lotId === p.lotId ? myBooking.spaceId : null);
  const [minutes, setMinutes] = useState(30);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('45');

  useEffect(() => {
    if (myBooking?.lotId === p.lotId) setSelected(myBooking.spaceId);
  }, [myBooking, p.lotId]);

  const free = lot.spaces.filter((s) => states[s.id]?.status === 'free').length;
  const reserved = lot.spaces.filter((s) => states[s.id]?.status === 'reserved').length;
  const half = Math.ceil(lot.spaces.length / 2);
  const rows = [lot.spaces.slice(0, half), lot.spaces.slice(half)];

  const customMinutes = Number.parseInt(customValue, 10);
  const customValid = Number.isFinite(customMinutes) && customMinutes >= BOOKING_MIN_MINUTES && customMinutes <= BOOKING_MAX_MINUTES;
  const chosenMinutes = custom ? (customValid ? customMinutes : null) : minutes;

  const sel = selected ? states[selected] : null;
  const selLabel = lot.spaces.find((s) => s.id === selected)?.label;
  const mine = sel?.status === 'reserved' && sel.reservedBy === clientId;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-700" aria-label="Паркомісця">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">Паркомісця</h3>
        <p className="text-sm">
          <span className={`font-bold ${free > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Вільно {free}</span>
          <span className="text-slate-500 dark:text-slate-400"> з {lot.spaces.length}</span>
          {reserved > 0 && <span className="text-amber-700 dark:text-amber-300"> · бронь {reserved}</span>}
        </p>
      </div>

      <div className="mt-3 space-y-2" role="group" aria-label="Схема місць">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-5 gap-1.5">
            {row.map((s) => {
              const st = states[s.id];
              const isMine = st.status === 'reserved' && st.reservedBy === clientId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(selected === s.id ? null : s.id)}
                  aria-pressed={selected === s.id}
                  aria-label={`Місце ${s.label}: ${STATUS_LABEL[st.status]}${isMine ? ' (ваша бронь)' : ''}`}
                  className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed text-sm font-bold transition active:scale-95 ${TILE[st.status]} ${
                    selected === s.id ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : ''
                  }`}
                >
                  {st.status === 'occupied' && <Car className="h-5 w-5" />}
                  {st.status === 'free' && <CircleCheck className="h-4 w-4 opacity-70" />}
                  {st.status === 'reserved' && <Timer className="h-4 w-4" />}
                  <span>{s.label}</span>
                  {st.status === 'reserved' && st.reservedUntil && (
                    <span className="text-[10px] font-semibold tabular-nums leading-none">{formatCountdown(st.reservedUntil - now)}</span>
                  )}
                  {isMine && <span className="absolute -right-1 -top-1 rounded bg-amber-500 px-1 text-[9px] text-white">ВИ</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-500" /> вільне</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> заброньоване</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> зайняте</span>
      </div>

      {/* Панель дій для вибраного місця */}
      {sel && selected ? (
        <div className="mt-3 animate-fade-in rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
          <p className="font-semibold text-slate-900 dark:text-white">
            Місце {selLabel} — {mine ? 'ваша бронь' : STATUS_LABEL[sel.status]}
          </p>

          {sel.status === 'free' &&
            (myBooking ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                У вас уже є бронь місця {myBooking.spaceId} до {clock(myBooking.until)}. Одночасно можна бронювати лише одне місце.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">На скільки забронювати</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setCustom(false);
                        setMinutes(m);
                      }}
                      aria-pressed={!custom && minutes === m}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                        !custom && minutes === m
                          ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
                      }`}
                    >
                      {durationLabel(m)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustom(true)}
                    aria-pressed={custom}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                      custom
                        ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
                    }`}
                  >
                    Свій час
                  </button>
                </div>
                {custom && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={BOOKING_MIN_MINUTES}
                      max={BOOKING_MAX_MINUTES}
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="w-24 rounded-lg border-0 bg-white px-2.5 py-1.5 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:ring-slate-600"
                      aria-label="Тривалість броні у хвилинах"
                    />
                    хвилин
                    {!customValid && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        від {BOOKING_MIN_MINUTES} до {BOOKING_MAX_MINUTES}
                      </span>
                    )}
                  </label>
                )}
                {chosenMinutes !== null && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4" /> Місце буде за вами до <b>{clock(now + chosenMinutes * 60_000)}</b>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={chosenMinutes === null}
                    onClick={() => chosenMinutes !== null && p.onReserve(selected, chosenMinutes)}
                    className="flex-1 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Забронювати{chosenMinutes !== null ? ` на ${durationLabel(chosenMinutes)}` : ''}
                  </button>
                </div>
              </>
            ))}

          {sel.status === 'free' && (
            <button type="button" onClick={() => p.onSetOccupied(selected, true)} className="mt-2 text-sm font-medium text-slate-600 hover:underline dark:text-slate-300">
              Позначити зайнятим
            </button>
          )}

          {sel.status === 'occupied' && (
            <button
              type="button"
              onClick={() => p.onSetOccupied(selected, false)}
              className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
            >
              Позначити вільним
            </button>
          )}

          {sel.status === 'reserved' && sel.reservedUntil && (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatCountdown(sel.reservedUntil - now)}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">до {clock(sel.reservedUntil)}</span>
              </div>
              {mine ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => p.onArrive(selected)}
                      className="col-span-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98]"
                    >
                      Я на місці
                    </button>
                    <button
                      type="button"
                      onClick={() => p.onExtend(selected, 15)}
                      disabled={sel.reservedUntil - now >= (BOOKING_MAX_MINUTES - 1) * 60_000}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
                    >
                      +15 хв
                    </button>
                    <button
                      type="button"
                      onClick={() => p.onCancel(selected)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 dark:bg-slate-800 dark:text-red-300 dark:ring-red-500/40"
                    >
                      Скасувати бронь
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Коли час вийде, бронь зніметься автоматично і місце стане вільним.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Місце заброньоване іншим користувачем.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Натисніть на вільне місце, щоб забронювати його на потрібний час.
        </p>
      )}

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Статуси й броні поки зберігаються лише в цьому браузері — інші користувачі їх не бачать.
      </p>
    </section>
  );
}
