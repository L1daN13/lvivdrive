import { useCallback } from 'react';
import type { ManagedLot, SpaceStatuses } from '../types/location';
import { usePersistentState } from './usePersistentState';

/**
 * Статуси паркомісць з ручним керуванням.
 * Зберігаються в LocalStorage цього браузера; місце без запису вважається вільним.
 */
export function useSpaceStatus() {
  const [statuses, setStatuses] = usePersistentState<SpaceStatuses>('spaceStatus', {});

  const toggleSpace = useCallback(
    (lotId: string, spaceId: string) => {
      setStatuses((prev) => {
        const lot = prev[lotId] ?? {};
        const occupied = !(lot[spaceId]?.occupied ?? false);
        return { ...prev, [lotId]: { ...lot, [spaceId]: { occupied, at: Date.now() } } };
      });
    },
    [setStatuses],
  );

  const freeCount = useCallback(
    (lotId: string, lot: ManagedLot) => lot.spaces.filter((s) => !statuses[lotId]?.[s.id]?.occupied).length,
    [statuses],
  );

  return { statuses, toggleSpace, freeCount };
}
