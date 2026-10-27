import { useEffect, useState } from 'react';
import { loadJson, saveJson } from '../services/storage';

/** useState, що зберігає значення в localStorage під ключем `lvivdrive:<key>`. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJson(key, initial));
  useEffect(() => {
    saveJson(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}
