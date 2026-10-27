const ITEMS = [
  { color: '#2563eb', label: 'Парковка' },
  { color: '#16a34a', label: 'Зарядка' },
];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[500] hidden gap-3 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-card ring-1 ring-slate-200 backdrop-blur md:flex dark:bg-slate-800/90 dark:text-slate-200 dark:ring-slate-700">
      {ITEMS.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-500 text-[8px] text-white">₴</span>
        Платна
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded bg-amber-500 px-0.5 text-[8px] text-white">DC</span>
        &gt; 50 кВт
      </span>
    </div>
  );
}
