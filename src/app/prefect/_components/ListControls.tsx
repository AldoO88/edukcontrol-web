// Controles de lista compartidos por Avisos / Citatorios / Reportes
// (port de los segment tabs underline y pills de filtro de la app).

"use client";

interface TabItem {
  id: string;
  label: string;
}

// Tabs segmentados estilo underline ("Mis Avisos | Todos", "Mis
// Citatorios | Todos los Citatorios", "Mis Reportes | Todos").
export function SegmentTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "border-sky-500 text-sky-600 font-bold"
                : "border-transparent text-slate-500 font-medium hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export interface PillOption {
  value: string;
  label: string;
}

// Pills de filtro (prioridad de avisos, estados de citatorio…).
// `active: string | null` — null = sin filtro activo.
export function FilterPills({
  options,
  active,
  onChange,
}: {
  options: PillOption[];
  active: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            // Click sobre el pill activo lo apaga (toggle, como la app).
            onClick={() => onChange(isActive ? null : option.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isActive
                ? "bg-sky-500 border-sky-500 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
      {active && (
        <button
          onClick={() => onChange(null)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
