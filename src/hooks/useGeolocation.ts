import { useCallback, useState } from 'react';
import { getCurrentPosition, type UserPosition } from '../services/geolocation';

export function useGeolocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<UserPosition | null> => {
    setLocating(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPosition(pos);
      return pos;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка геолокації.');
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { position, locating, error, locate, clearError };
}
