// =====================================================================
// src/app/prefect/teachers/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de maestro — puerto web de teachers/[teacherId].jsx de la
// app: datos de contacto, stats (horas/semana • grupos), materias,
// grupos asignados y horario semanal completo.
// Fuente: hook useTeacherDetail (detalle + horario en paralelo).
// =====================================================================

"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTeacherDetail } from "@/lib/hooks/useTeacherDetail";
import { getSubjectIcon, hexToRgba } from "@/lib/subjectIcons";
import { Calendar, Clock, Mail, Phone, Users } from "lucide-react";

const DAY_NAMES_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// Color válido o fallback (idéntico al helper del detalle de grupo).
function subjectHex(color?: string | null): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#6366F1";
}

export default function PrefectTeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const teacherId = params.id;

  const { detail, schedule, isLoading, error, refetch } = useTeacherDetail(teacherId);

  if (isLoading) return <LoadingState message="Cargando horario…" />;
  if (error || !detail) {
    return (
      <ErrorState message={error || "No se encontró el maestro."} action={{ label: "Reintentar", onClick: refetch }} />
    );
  }

  const { teacher, subjects, assignedGroups } = detail;
  // Nombre completo en orden apellido-nombre (display de la app).
  const fullName = `${teacher.last_name || ""} ${teacher.name || ""}`.trim();
  const initials =
    `${teacher.name?.[0] || ""}${teacher.last_name?.[0] || ""}`.toUpperCase();
  const stats = schedule?.stats;

  // Horario: entradas { día → slots } ordenadas por número de día.
  const scheduleEntries = Object.entries(schedule?.schedule || {}).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    // Sin el tope max-w-3xl mx-auto de la app: en desktop el detalle
    // usa todo el ancho del área de contenido.
    <div className="space-y-4">
      <PageHeader
        title="Horario del Maestro"
        subtitle={fullName}
        action={{ label: "← Volver", href: "/prefect/teachers" }}
      />

      {/* Ficha del maestro */}
      <Card className="border-l-4 border-l-violet-600">
        <CardBody className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-violet-600">{initials || "?"}</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-text-primary">{fullName}</p>
            {teacher.phoneNumber && (
              <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                <Phone size={12} className="text-slate-400" />
                {teacher.phoneNumber}
              </p>
            )}
            {teacher.email && (
              <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                <Mail size={12} className="text-slate-400" />
                {teacher.email}
              </p>
            )}
            {stats && (stats.weeklyHours || stats.groupsCount) ? (
              <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                <Clock size={12} className="text-slate-400" />
                {stats.weeklyHours || 0} hora{(stats.weeklyHours || 0) !== 1 ? "s" : ""}
                /semana • {stats.groupsCount || 0} grupo
                {(stats.groupsCount || 0) !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Materias y grupos asignados — 2 columnas en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Materias */}
        {subjects.length > 0 && (
          <Card>
            <CardBody>
              <p className="text-sm font-bold text-text-primary mb-2">Materias</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => {
                  const hex = subjectHex(sub.color);
                  const SubjectIcon = getSubjectIcon(sub.icon);
                  return (
                    <span
                      key={sub._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: hexToRgba(hex, 0.1), color: hex }}
                    >
                      <SubjectIcon size={13} color={hex} />
                      {sub.name}
                    </span>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Grupos asignados */}
        {assignedGroups.length > 0 && (
          <Card>
            <CardBody>
              <p className="text-sm font-bold text-text-primary mb-2">Grupos Asignados</p>
              <div className="flex flex-wrap gap-2">
                {assignedGroups.map((group) => (
                  <span
                    key={group._id}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold"
                  >
                    <Users size={12} />
                    {group.label}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Horario semanal */}
      <Card>
        <CardBody>
          <p className="text-sm font-bold text-text-primary mb-3">Horario Semanal</p>
          {scheduleEntries.length > 0 ? (
            // Días en columnas en desktop (antes: todos apilados uno
            // debajo del otro, patrón de la app).
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scheduleEntries.map(([day, slots]) => (
                <div key={day} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    {DAY_NAMES_FULL[Number(day)] || `Día ${day}`}
                  </p>
                  <div className="space-y-2">
                    {slots.map((slot, idx) => {
                      // subject: string crudo u objeto poblado {name,color,icon}.
                      const subjectName =
                        typeof slot.subject === "string"
                          ? slot.subject
                          : slot.subject?.name || slot.subject_name || "Materia";
                      const subjectColor =
                        typeof slot.subject === "object"
                          ? subjectHex(slot.subject?.color)
                          : "#6366F1";
                      const subjectIcon =
                        typeof slot.subject === "object" ? slot.subject?.icon : undefined;
                      const SlotIcon = getSubjectIcon(subjectIcon);
                      const groupLabel = slot.group
                        ? `${slot.group.grade ?? ""}°${slot.group.section ?? ""}`
                        : "";
                      // Rango de horas: startTime/endTime o timeBlocks.
                      const timeRange =
                        slot.startTime && slot.endTime
                          ? `${slot.startTime} - ${slot.endTime}`
                          : slot.timeBlocks && slot.timeBlocks.length > 0
                            ? `${slot.timeBlocks[0].startTime} - ${
                                slot.timeBlocks[slot.timeBlocks.length - 1].endTime
                              }`
                            : "";
                      return (
                        <div
                          key={idx}
                          className="rounded-xl p-3"
                          style={{
                            backgroundColor: hexToRgba(subjectColor, 0.1),
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <SlotIcon size={14} color={subjectColor} />
                              <div className="min-w-0">
                                <p
                                  className="text-sm font-bold truncate"
                                  style={{ color: subjectColor }}
                                >
                                  {subjectName}
                                </p>
                                <p className="text-xs text-text-secondary mt-0.5 truncate">
                                  {groupLabel ? `Grupo ${groupLabel}` : ""}
                                  {groupLabel && slot.classroom ? " • " : ""}
                                  {slot.classroom || ""}
                                </p>
                              </div>
                            </div>
                            {timeRange && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                                <Clock size={10} />
                                {timeRange}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar size={40} className="text-slate-300" />}
              title="No hay horario disponible"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
