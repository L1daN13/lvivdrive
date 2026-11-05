import { useEffect, useState } from 'react';

/** Поточний час, що оновлюється щосекунди, лише поки `enabled`. */
export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [enabled, intervalMs]);
  // Коли вимкнено — повертаємо останнє значення, щоб не змінювати залежності мемоізації
  return now;
}
