import { SquareParking, Zap } from 'lucide-react';
import type { MapLocation } from '../types/location';

export function LocationIcon({ location, size = 'md' }: { location: MapLocation; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const icon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  if (location.kind === 'charging') {
    return (
      <div className={`${box} grid shrink-0 place-items-center bg-green-50 text-green-600 ring-1 ring-green-100 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20`}>
        <Zap className={icon} />
      </div>
    );
  }
  return (
    <div className={`${box} grid shrink-0 place-items-center bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20`}>
      <SquareParking className={icon} />
    </div>
  );
}
