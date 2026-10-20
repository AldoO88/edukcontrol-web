// =====================================================================
// src/app/prefect/groups/page.tsx
// ---------------------------------------------------------------------
// Lista de Grupos del prefecto — puerto web de (tabs)/groups.jsx de la
// app: cards con stats (matrícula, niños/niñas, reportes, barra de
// asistencia de hoy, deméritos/méritos) + búsqueda client-side a todo
// el ancho. Grid de 3 columnas en desktop (lg:grid-cols-3).
// Fuente: GET /api/prefect/groups-summary (hook usePrefectGroups).
// =====================================================================

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePrefectGroups } from "@/lib/hooks/usePrefectGroups";
import {
  AlertTriangle,
  BookOpen,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

// Color de la barra de asistencia (mismos umbrales 80/60 que la app).
function attendanceTint(rate: number): { bar: string; text: string } {
  if (rate >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600" };
  if (rate >= 60) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-rose-500", text: "text-rose-600" };
}

export default function PrefectGroupsPage() {
  const { groups, isLoading, error, refetch } = usePrefectGroups();
  const [searchText, setSearchText] = useState("");

  // Filtro client-side por label/grade/section (misma lógica que la app).
  const filteredGroups = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return groups;
    return groups.filter(
      (g) =>
        g.label?.toLowerCase().includes(term) ||
        g.grade?.toString().includes(term) ||
        g.section?.toLowerCase().includes(term)
    );
  }, [groups, searchText]);

  if (isLoading) return <LoadingState message="Cargando grupos…" />;
  if (error) return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grupos"
        subtitle="Selecciona un grupo para ver alumnos, asistencia y horario"
      />

      {/* Búsqueda — full width en desktop */}
      <Input
        placeholder="Buscar grupo..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        icon={<Search size={16} className="text-slate-400" />}
      />

      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={<Users size={48} className="text-slate-300" />}
          title={groups.length === 0 ? "No hay grupos" : "Sin resultados"}
          description={
            groups.length === 0
              ? "Aún no hay grupos registrados."
              : "No hay grupos con esta búsqueda."
          }
        />
      ) : (
        // 3 columnas en desktop (antes 2 — más uso del ancho web)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const tint = attendanceTint(group.attendanceRate || 0);
            return (
              <Link key={group._id} href={`/prefect/groups/${group._id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardBody className="h-full flex flex-col">
                    {/* Fila superior: grupo + matrícula */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <BookOpen size={18} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-text-primary">
                            {group.label}
                          </p>
                          <p className="text-xs text-text-secondary capitalize">
                            {group.shift || ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-text-primary">
                          {group.studentCount}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          alumno{group.studentCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Chips: Niños / Niñas / Reportes */}
                    <div className="flex gap-2 mb-3">
                      <span className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 rounded-xl px-3 py-2 text-xs font-bold">
                        {group.maleCount} <span className="text-[10px] font-medium text-blue-500">Niños</span>
                      </span>
                      <span className="flex-1 flex items-center justify-center gap-1.5 bg-pink-50 text-pink-700 rounded-xl px-3 py-2 text-xs font-bold">
                        {group.femaleCount} <span className="text-[10px] font-medium text-pink-500">Niñas</span>
                      </span>
                      <span className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-xs font-bold">
                        <AlertTriangle size={12} />
                        {group.conductReportCount}{" "}
                        <span className="text-[10px] font-medium text-amber-500">Reportes</span>
                      </span>
                    </div>

                    {/* Barra de asistencia de hoy */}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-text-secondary">
                          Asistencia hoy
                        </p>
                        <p className={`text-[10px] font-bold ${tint.text}`}>
                          {group.attendedToday}/{group.studentCount} •{" "}
                          {group.attendanceRate}%
                        </p>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tint.bar}`}
                          style={{ width: `${Math.min(group.attendanceRate || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Deméritos / Méritos */}
                    {(group.demeritCount > 0 || group.meritCount > 0) && (
                      <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100">
                        {group.demeritCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                            <TrendingDown size={11} />
                            {group.demeritCount} demérito{group.demeritCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {group.meritCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <TrendingUp size={11} />
                            {group.meritCount} mérito{group.meritCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Botón "limpiar" flotante cuando hay término de búsqueda */}
      {searchText && (
        <button
          onClick={() => setSearchText("")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <X size={14} /> Limpiar búsqueda
        </button>
      )}
    </div>
  );
}
