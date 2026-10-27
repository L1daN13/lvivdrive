import { useEffect } from 'react';
import { usePersistentState } from './usePersistentState';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = usePersistentState<Theme>('theme', 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggleTheme };
}
