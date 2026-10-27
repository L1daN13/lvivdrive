import type { ReactNode } from 'react';
import { Moon, SquareParking, Star, Sun, Zap } from 'lucide-react';
import type { Theme } from '../hooks/useTheme';

export type NavKey = 'parking' | 'charging' | 'favorites';

interface Props {
  search: ReactNode;
  active: NavKey | null;
  onNav: (key: NavKey) => void;
  favoritesCount: number;
  theme: Theme;
  onToggleTheme: () => void;
}

function Logo() {
  return (
    <a href={import.meta.env.BASE_URL} className="flex shrink-0 items-center gap-2" aria-label="LvivDrive — на головну">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-9 w-9" />
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        Lviv<span className="text-brand-600">Drive</span>
      </span>
    </a>
  );
}

const NAV: { key: NavKey; label: string; icon: ReactNode; activeClass: string }[] = [
  { key: 'parking', label: 'Парковки', icon: <SquareParking className="h-4 w-4" />, activeClass: 'bg-blue-600 text-white ring-blue-600' },
  { key: 'charging', label: 'Зарядки', icon: <Zap className="h-4 w-4" />, activeClass: 'bg-green-600 text-white ring-green-600' },
  { key: 'favorites', label: 'Вибране', icon: <Star className="h-4 w-4" />, activeClass: 'bg-amber-500 text-white ring-amber-500' },
];

export function Header({ search, active, onNav, favoritesCount, theme, onToggleTheme }: Props) {
  const themeButton = (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
      title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  return (
    <header className="relative z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:flex-nowrap md:px-4">
        <Logo />
        <div className="ml-auto md:hidden">{themeButton}</div>
        <div className="order-last w-full md:order-none md:mx-4 md:max-w-xl md:flex-1">{search}</div>
        <nav className="order-last -mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:overflow-visible md:p-0" aria-label="Розділи">
          {NAV.map((n) => {
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => onNav(n.key)}
                aria-pressed={isActive}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition active:scale-95 ${
                  isActive
                    ? n.activeClass
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700'
                }`}
              >
                {n.icon}
                {n.label}
                {n.key === 'favorites' && favoritesCount > 0 && (
                  <span className={`rounded-full px-1.5 text-xs ${isActive ? 'bg-white/25' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                    {favoritesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="hidden md:block">{themeButton}</div>
      </div>
    </header>
  );
}
