// Campo "Lugar" compartido por los modales de citatorio (crear,
// editar, reagendar): chips de lugares predefinidos + opción "Otro"
// con input libre (mismo UX que la app).

"use client";

import { useState } from "react";

// Lugares predefinidos (idénticos a la app).
export const CITATION_LOCATIONS = ["Trabajo Social", "Prefectura", "Dirección"];

interface LocationChipsProps {
  // Valor actual: string de los chips o texto libre (custom).
  value: string;
  onChange: (value: string) => void;
}

export function LocationChips({ value, onChange }: LocationChipsProps) {
  // Modo "Otro" activo si el valor actual no es uno de los chips.
  const isCustom = !CITATION_LOCATIONS.includes(value);
  const [customText, setCustomText] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CITATION_LOCATIONS.map((loc) => {
          const isActive = !isCustom && value === loc;
          return (
            <button
              key={loc}
              onClick={() => onChange(loc)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive
                  ? "bg-sky-500 border-sky-500 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {loc}
            </button>
          );
        })}
        <button
          onClick={() => {
            // "Otro" ya activo → no tocar el texto; si venía de un chip,
            // limpiar el valor para escribir la ubicación libre.
            if (isCustom) return;
            setCustomText("");
            onChange("");
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            isCustom
              ? "bg-sky-500 border-sky-500 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Otro
        </button>
      </div>
      {isCustom && (
        <input
          value={customText || value}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Ej. Salón de Inglés, Sala de Dirección..."
          maxLength={120}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      )}
    </div>
  );
}

// Label de campo unificado para los modales.
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-text-primary mb-1.5">{children}</p>
  );
}
