// =====================================================================
// src/app/social-worker/expedientes/page.tsx
// ---------------------------------------------------------------------
// Listado de EXPEDIENTES — pantalla eje de la sección web del
// trabajador social (Fase B). Diseño propio: barra de progreso
// segmentada arriba (avance global de la escuela) + tabla DENSA del
// padrón del ciclo con filtros server-side (búsqueda, grupo, estado).
//
// Fuente: hook useExpedientesList → GET /api/social-worker/expedientes
// Cada fila abre la ficha del alumno (/social-worker/expedientes/[id]).
// =====================================================================

"use client";

import Link from "next/link";
import { FolderOpen, Search, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpedientesProgressBar } from "@/components/social-worker/ExpedientesProgressBar";
import { ExpedienteStatusBadge } from "@/components/social-worker/ExpedienteStatusBadge";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { useExpedientesList } from "@/lib/hooks/useExpedientesList";
import type { ExpedienteStatus } from "@/lib/types";

// Filtros de estado (chips seleccionables — más rápido que un select
// para los 3 valores posibles).
const STATUS_FILTERS: Array<{ value: ExpedienteStatus | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En proceso" },
  { value: "completed", label: "Completados" },
];

// Fecha legible ("16 nov 2026, 10:32") — null → "—".
function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SocialWorkerExpedientesPage() {
  const {
    groups,
    items,
    summary,
    search,
    setSearch,
    groupId,
    setGroupId,
    status,
    setStatus,
    isLoading,
    error,
    refetch,
  } = useExpedientesList();

  const hasFilters = !!search.trim() || !!groupId || !!status;

  // Loading inicial (sin datos aún) → estado de carga de página.
  if (isLoading && items.length === 0 && !summary && !error) {
    return <LoadingState message="Cargando expedientes…" />;
  }
  if (error && items.length === 0) {
    return (
      <ErrorState
        message={error}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expedientes"
        subtitle="Padrón del ciclo activo con el avance de captura de cada alumno"
      />

      {/* Avance global — SIEMPRE sin filtros (el backend calcula el
          summary antes de filtrar, así la barra nunca se "contrae"). */}
      {summary && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shrink-0">
                <FolderOpen size={16} />
              </div>
              <h2 className="text-sm font-bold text-text-primary">
                Avance general
              </h2>
            </div>
            <ExpedientesProgressBar summary={summary} />
          </CardBody>
        </Card>
      )}

      {/* Filtros: búsqueda + grupo + chips de estado */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              icon={<Search size={16} />}
              placeholder="Buscar por nombre o número de control…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-52">
            <Select
              placeholder="Todos los grupos"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              options={groups.map((g) => ({ value: g._id, label: g.label }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <button
                key={f.label}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-border text-text-secondary hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados */}
      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={<FolderOpen size={48} className="text-slate-300" />}
          title="Sin expedientes"
          description="No hay alumnos que coincidan con los filtros actuales."
          action={
            hasFilters
              ? {
                  label: "Limpiar filtros",
                  onClick: () => {
                    setSearch("");
                    setGroupId("");
                    setStatus("");
                  },
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-semibold text-text-primary">
                    Alumno
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-primary">
                    Grupo
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-primary">
                    Estado
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-primary">
                    Última actualización
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-text-primary">
                    Alertas
                  </th>
                  <th className="w-10 px-3 py-2.5">
                    <span className="sr-only">Abrir ficha</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const fullName =
                    `${item.last_name || ""} ${item.first_name || ""}`.trim() ||
                    "Sin nombre";
                  return (
                    <tr
                      key={item.student_id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/social-worker/expedientes/${item.student_id}`}
                          className="flex items-center gap-3 group"
                        >
                          <StudentAvatar
                            photoUrl={item.photoUrl}
                            name={fullName}
                            size={36}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-text-primary truncate group-hover:text-emerald-700">
                              {fullName}
                            </span>
                            {item.controlNumber && (
                              <span className="block text-xs text-text-muted truncate">
                                {item.controlNumber}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.group?.label || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <ExpedienteStatusBadge status={item.expediente_status} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-text-secondary whitespace-nowrap">
                        {formatDateTime(item.expediente_last_saved_at)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.alerts_count > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                            title={`${item.alerts_count} alerta(s) en la ficha de salud`}
                          >
                            <TriangleAlert size={14} aria-hidden />
                            {item.alerts_count}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/social-worker/expedientes/${item.student_id}`}
                          aria-label={`Abrir expediente de ${fullName}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          ›
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Conteo de resultados filtrados (el summary de arriba es
          global; este refleja lo que se está viendo). */}
      {!isLoading && summary && (
        <p className="text-xs text-text-muted text-right">
          {items.length} de {summary.total} alumnos
          {hasFilters ? " (con filtros aplicados)" : ""}
        </p>
      )}
    </div>
  );
}
