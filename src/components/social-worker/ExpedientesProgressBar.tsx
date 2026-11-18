// Barra de progreso de EXPEDIENTES (segmentada, 3 estados).
// Compartida por el dashboard y el listado /social-worker/expedientes:
//   - completado → emerald
//   - en proceso → sky
//   - pendiente  → slate
// Los porcentajes se calculan sobre `summary.total`; sin total la barra
// no se pinta (evita divisiones por cero y renders vacíos).

"use client";

import type { ExpedientesSummary } from "@/lib/types";

interface ExpedientesProgressBarProps {
  summary: ExpedientesSummary;
  className?: string;
}

const SEGMENTS = [
  { key: "completed", label: "Completados", bar: "bg-emerald-500", text: "text-emerald-700" },
  { key: "in_progress", label: "En proceso", bar: "bg-sky-500", text: "text-sky-700" },
  { key: "pending", label: "Pendientes", bar: "bg-slate-400", text: "text-slate-600" },
] as const;

export function ExpedientesProgressBar({
  summary,
  className = "",
}: ExpedientesProgressBarProps) {
  const total = summary?.total || 0;
  if (!total) return null;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className={className}>
      {/* Barra segmentada (role="img" + aria-label: los lectores de
          pantalla oyen el resumen completo en vez de "barra vacía"). */}
      <div
        role="img"
        aria-label={`Avance de expedientes: ${summary.completed} de ${total} completados, ${summary.in_progress} en proceso, ${summary.pending} pendientes.`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
      >
        {SEGMENTS.map((seg) => {
          const value = summary[seg.key];
          if (!value) return null;
          return (
            <div
              key={seg.key}
              className={`${seg.bar} h-full transition-all duration-500`}
              style={{ width: `${(value / total) * 100}%` }}
            />
          );
        })}
      </div>

      {/* Leyenda con conteos + porcentaje */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {SEGMENTS.map((seg) => {
          const value = summary[seg.key];
          return (
            <li key={seg.key} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${seg.bar}`}
                aria-hidden
              />
              <span className="text-text-secondary">
                <span className={`font-semibold ${seg.text}`}>{value}</span>{" "}
                {seg.label} · {pct(value)}%
              </span>
            </li>
          );
        })}
        <li className="flex items-center gap-1.5 text-text-muted">
          <span aria-hidden>·</span>
          <span>
            Total <span className="font-semibold text-text-primary">{total}</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
