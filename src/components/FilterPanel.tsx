import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CategoryFilter, ConnectorType, FeeFilter, Filters, PowerBucket } from '../types/location';
import { DISTANCE_OPTIONS } from '../utils/constants';
import { CONNECTOR_FILTER_GROUPS, POWER_LABELS } from '../utils/labels';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  hasUserPosition: boolean;
  onRequestLocation: () => void;
  /** Типи роз'ємів, що реально трапляються в завантажених даних. */
  availableConnectors: Set<ConnectorType>;
}

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white'
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </fieldset>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:bg-slate-600" />
    </label>
  );
}

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'Усі об’єкти' },
  { id: 'parking', label: 'Парковки' },
  { id: 'charging', label: 'Зарядні станції' },
];

const FEES: { id: FeeFilter; label: string }[] = [
  { id: 'any', label: 'Будь-які' },
  { id: 'paid', label: 'Платні' },
  { id: 'free', label: 'Безкоштовні' },
];

export function FilterPanel({ filters: f, onChange, onReset, hasUserPosition, onRequestLocation, availableConnectors }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const toggleConnector = (id: ConnectorType) =>
    set({ connectors: f.connectors.includes(id) ? f.connectors.filter((c) => c !== id) : [...f.connectors, id] });

  const showParking = f.category !== 'charging';
  const showCharging = f.category !== 'parking';
  const connectorGroups = CONNECTOR_FILTER_GROUPS.filter(
    (g) => f.connectors.includes(g.id) || g.matches.some((m) => availableConnectors.has(m)),
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-800/60">
      <Group title="Що показувати">
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={f.category === c.id} onClick={() => set({ category: c.id })}>
            {c.label}
          </Chip>
        ))}
      </Group>

      {showParking && (
        <Group title="Оплата парковки" hint="«Безкоштовні» — лише ті, де це явно підтверджено в даних (fee=no).">
          {FEES.map((x) => (
            <Chip key={x.id} active={f.fee === x.id} onClick={() => set({ fee: x.id })}>
              {x.label}
            </Chip>
          ))}
        </Group>
      )}

      {showCharging && (
        <>
          <Group
            title="Тип роз’єму"
            hint={connectorGroups.length === 0 ? 'У завантажених даних немає інформації про роз’єми.' : 'Станції без даних про роз’єми приховуються, коли обрано тип.'}
          >
            {connectorGroups.map((g) => (
              <Chip key={g.id} active={f.connectors.includes(g.id)} onClick={() => toggleConnector(g.id)}>
                {g.label}
              </Chip>
            ))}
          </Group>
          <Group title="Потужність заряджання" hint={f.power !== 'any' ? 'Станції з невідомою потужністю приховано.' : undefined}>
            {(Object.keys(POWER_LABELS) as PowerBucket[]).map((p) => (
              <Chip key={p} active={f.power === p} onClick={() => set({ power: p })}>
                {POWER_LABELS[p]}
              </Chip>
            ))}
          </Group>
        </>
      )}

      <Group title="Відстань від мене" hint={hasUserPosition ? undefined : 'Потрібна геолокація.'}>
        <Chip active={f.maxDistanceKm === null} onClick={() => set({ maxDistanceKm: null })}>
          Будь-яка
        </Chip>
        {DISTANCE_OPTIONS.map((d) => (
          <Chip
            key={d}
            active={f.maxDistanceKm === d}
            onClick={() => {
              if (!hasUserPosition) onRequestLocation();
              set({ maxDistanceKm: d });
            }}
          >
            до {d} км
          </Chip>
        ))}
      </Group>

      <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
        <Toggle checked={f.publicOnly} onChange={(v) => set({ publicOnly: v })} label="Приховати приватні об’єкти" />
        {showParking && (
          <Toggle checked={f.includeSpaces} onChange={(v) => set({ includeSpaces: v })} label="Показувати окремі паркомісця" />
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Скинути фільтри
      </button>
    </div>
  );
}
