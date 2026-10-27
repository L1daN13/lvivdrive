import { useCallback, useMemo } from 'react';
import type { MapLocation } from '../types/location';
import { usePersistentState } from './usePersistentState';

/**
 * Вибране зберігається повністю (знімок об'єкта), щоб список був доступний
 * після перезавантаження, навіть якщо об'єкт поза завантаженою областю.
 */
export function useFavorites() {
  const [favorites, setFavorites] = usePersistentState<MapLocation[]>('favorites', []);

  const ids = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const isFavorite = useCallback((id: string) => ids.has(id), [ids]);

  const toggleFavorite = useCallback(
    (loc: MapLocation) => {
      setFavorites((prev) =>
        prev.some((f) => f.id === loc.id) ? prev.filter((f) => f.id !== loc.id) : [...prev, loc],
      );
    },
    [setFavorites],
  );

  const clearFavorites = useCallback(() => setFavorites([]), [setFavorites]);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
