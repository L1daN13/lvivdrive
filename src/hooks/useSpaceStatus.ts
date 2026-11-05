import { useCallback } from 'react';
import type { ManagedLot, SpaceState, SpaceStatuses } from '../types/location';
import { usePersistentState } from './usePersistentState';

/**
 * Статуси паркомісць з ручним керуванням.
 * Зберігаються в LocalStorage цього браузера; місце без запису має стартовий
 * статус з конфігурації парковки (`defaultOccupied`), інакше вважається вільним.
 */
export function useSpaceStatus() {
  // v2: після зміни схеми парковки старі статуси не переносимо
  const [statuses, setStatuses] = usePersistentState<SpaceStatuses>('spaceStatus:v2', {});

  const lotStates = useCallback(
    (lotId: string, lot: ManagedLot): Record<string, SpaceState> =>
      Object.fromEntries(
        lot.spaces.map((s) => [
          s.id,
          statuses[lotId]?.[s.id] ?? { occupied: lot.defaultOccupied?.includes(s.id) ?? false, at: 0 },
        ]),
      ),
    [statuses],
  );

  const toggleSpace = useCallback(
    (lotId: string, lot: ManagedLot, spaceId: string) => {
      setStatuses((prev) => {
        const stored = prev[lotId] ?? {};
        const current = stored[spaceId]?.occupied ?? lot.defaultOccupied?.includes(spaceId) ?? false;
        return { ...prev, [lotId]: { ...stored, [spaceId]: { occupied: !current, at: Date.now() } } };
      });
    },
    [setStatuses],
  );

  const freeCount = useCallback(
    (lotId: string, lot: ManagedLot) => Object.values(lotStates(lotId, lot)).filter((s) => !s.occupied).length,
    [lotStates],
  );

  return { lotStates, toggleSpace, freeCount };
}
