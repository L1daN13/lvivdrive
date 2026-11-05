import { Timer } from 'lucide-react';
import type { Booking } from '../types/location';
import { formatCountdown } from './SpaceGrid';

interface Props {
  booking: Booking;
  lotName: string;
  now: number;
  onOpen: () => void;
}

/** Плашка з активною бронню поверх карти — видно відлік, навіть коли картку закрито. */
export function BookingChip({ booking, lotName, now, onOpen }: Props) {
  const left = booking.until - now;
  const urgent = left < 5 * 60_000;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`absolute left-3 top-3 z-[600] flex max-w-[calc(100%-5rem)] animate-fade-in items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm shadow-float ring-1 transition hover:scale-[1.02] ${
        urgent
          ? 'bg-red-600 text-white ring-red-700'
          : 'bg-amber-500 text-white ring-amber-600'
      }`}
      aria-label={`Ваша бронь: місце ${booking.spaceId}, залишилось ${formatCountdown(left)}. Відкрити`}
    >
      <Timer className="h-5 w-5 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-xs opacity-90">
          Бронь · {lotName} · місце {booking.spaceId}
        </span>
        <span className="block text-lg font-bold tabular-nums leading-tight">{formatCountdown(left)}</span>
      </span>
    </button>
  );
}
