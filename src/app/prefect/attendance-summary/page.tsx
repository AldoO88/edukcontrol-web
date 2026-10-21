// =====================================================================
// src/app/prefect/attendance-summary/page.tsx
// ---------------------------------------------------------------------
// Resumen de Inasistencias (Faltas Escolares) — puerto web de
// attendance-summary/index.jsx del prefecto:
//   - Chips de filtro por grupo (regular; clic sobre el grupo activo lo
//     deselecciona = toggle, igual que la app) → re-fetchea
//   - Stat cards: Total de Faltas + Alumnos Afectados
//   - Lista rankeada de alumnos más ausentes (shape verificado contra
//     backend: { rank, _id, fullName, group, controlNumber,
//     absenceCount } — sin foto, así que el avatar usa iniciales):
//     posición, avatar, nombre, grupo, conteo y barra relativa al máximo
// Fuente: hook useSchoolAbsences (GET /api/prefect/school-absences).
// =====================================================================

"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSchoolAbsences } from "@/lib/hooks/useSchoolAbsences";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { CalendarX2, TrendingUp, Users } from "lucide-react";

export default function PrefectAttendanceSummaryPage() {
  const { groups, groupId, toggleGroup, clearGroup, data, isLoading, error, refetch } =
    useSchoolAbsences();

  if (isLoading && !data) return <LoadingState message="Cargando resumen de faltas…" />;
  if (error && !data) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  const summary = data?.summary || { totalAbsences: 0, affectedStudents: 0 };
  const ranked = data?.topAbsentStudents || [];

  // Máximo de faltas para escalar las barras (mínimo 1 p/ evitar 0/0).
  const maxAbsences = ranked.reduce((max, s) => Math.max(max, s.absenceCount || 0), 1);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Resumen de Inasistencias"
        subtitle="Alumnos con más faltas en el periodo"
        action={{ label: "← Volver", href: "/prefect/dashboard" }}
      />

      {/* Chips de grupo (toggle, como la app) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={clearGroup}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            groupId == null
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos los grupos
        </button>
        {groups.map((group) => (
          <button
            key={group._id}
            onClick={() => toggleGroup(group._id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              groupId === group._id
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-rose-500">
          <CardBody>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-rose-600">
              <CalendarX2 size={12} />
              Total de Faltas
            </p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">
              {summary.totalAbsences}
            </p>
          </CardBody>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardBody>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-600">
              <Users size={12} />
              Alumnos Afectados
            </p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">
              {summary.affectedStudents}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Lista rankeada */}
      <Card>
        <CardBody>
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-3">
            <TrendingUp size={16} className="text-rose-500" />
            Alumnos más ausentes
          </p>

          {ranked.length === 0 ? (
            <EmptyState
              icon={<Users size={40} className="text-slate-300" />}
              title="Sin faltas registradas"
              description="No hay inasistencias en el periodo consultado."
            />
          ) : (
            <ol className="space-y-4">
              {ranked.map((student, index) => {
                const absences = student.absenceCount || 0;
                const pct = Math.max(Math.round((absences / maxAbsences) * 100), 8);
                return (
                  <li key={student._id}>
                    <Link href={`/prefect/students/${student._id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        {/* Posición (el backend ya manda rank; fallback al índice) */}
                        <span
                          className={`w-6 text-center text-sm font-extrabold shrink-0 ${
                            index === 0
                              ? "text-rose-600"
                              : index === 1
                                ? "text-amber-600"
                                : "text-slate-400"
                          }`}
                        >
                          #{student.rank ?? index + 1}
                        </span>
                        {/* El endpoint no trae foto → iniciales de fullName */}
                        <StudentAvatar name={student.fullName} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-text-primary truncate">
                              {student.fullName}
                            </p>
                            <span className="text-xs font-extrabold text-rose-600 shrink-0">
                              {absences} falta{absences !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {/* Barra relativa al máximo del ranking */}
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {student.group || "—"}
                            {student.controlNumber ? ` • ${student.controlNumber}` : ""}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
