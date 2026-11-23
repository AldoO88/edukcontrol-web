// =====================================================================
// src/app/social-worker/groups/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de grupo (Fase C — sección Consulta del trabajador social).
// Puerto con estilo propio de groups/[id]/page.tsx del prefecto:
// 3 pestañas:
//   1. Asistencia (default) — asistencia del día con navegación de
//      fecha. SOLO LECTURA: el override manual (POST
//      /api/attendance/manual-override) no autoriza al rol
//      social_worker, así que no hay botón "Marcar".
//   2. Horario — tabla SEMANAL COMPLETA por módulos (fila "Módulo",
//      encabezados de día coloreados, receso en fila ámbar, clases de
//      2 módulos vía rowSpan). Mismo motor de grid que el prefecto.
//   3. Alumnos — lista ordenada por apellido → FICHA DE EXPEDIENTE
//      del trabajador social (no la ficha de conducta del prefecto).
// Fuente: hook usePrefectGroupDetail (mismos endpoints genéricos de
// staff, ya autorizados para social_worker).
// =====================================================================

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePrefectGroupDetail } from "@/lib/hooks/usePrefectGroupDetail";
import { addDays } from "@/lib/dates";
import { getSubjectIcon, hexToRgba } from "@/lib/subjectIcons";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import type { GroupScheduleSlot } from "@/lib/types";
import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Users,
} from "lucide-react";

// Pestañas del detalle (mismos segmentos que la app).
const SEGMENTS = [
  { id: "attendance", label: "Asistencia", icon: ClipboardCheck },
  { id: "schedule", label: "Horario", icon: Calendar },
  { id: "students", label: "Alumnos", icon: Users },
] as const;
type SegmentId = (typeof SEGMENTS)[number]["id"];

// Badge de estado del alumno.
const STATUS_BADGE: Record<string, { variant: "emerald" | "amber" | "rose"; label: string }> = {
  on_time: { variant: "emerald", label: "Presente" },
  late: { variant: "amber", label: "Retardo" },
  absent: { variant: "rose", label: "Falta" },
};

const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Encabezados de día con los MISMOS colores que la config de horarios
// (schools/[id]/school-years/[yearId]/schedules/page.tsx → DAY_COLORS).
const DAY_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
];

// Color válido de materia o fallback (el backend puede mandar null).
function subjectHex(color?: string | null): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#6366F1";
}

// "HH:MM" → minutos desde medianoche (fallback cuando el backend no
// manda startMinutes/endMinutes en el slot).
const toMinutes = (hhmm?: string): number => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
};

// Minutos → "HH:MM" (para el rango de la columna "Módulo").
const fmtMin = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Contenido de UNA materia dentro de su celda de horario (ver nota
// extendida en el puerto del prefecto): el "card" vive en la propia
// <td> para que con rowSpan=N pinte su fondo sobre las N filas.
function ScheduleCellContent({ slot }: { slot: GroupScheduleSlot }) {
  const hex = subjectHex(slot.color);
  const SubjectIcon = getSubjectIcon(slot.icon);
  const isTaller = slot.classificationType === "TALLER" || slot.is_taller;
  // Tecnología son TALLERES con 4 maestros rotativos: se muestra SIN
  // nombre de maestro (sería confuso nombrar solo a uno).
  const sinNombreMaestro = /tecnolog/i.test(slot.subject || "");

  return (
    <div className="text-left">
      <div className="flex items-center gap-1.5">
        <SubjectIcon size={12} color={hex} />
        <p className="text-[11px] font-bold text-text-primary truncate">
          {slot.subject || "Sin materia"}
        </p>
      </div>
      <p className="text-[10px] text-text-secondary mt-0.5">
        {slot.start} – {slot.end}
        {slot.block_count && slot.block_count > 1 ? ` · ${slot.block_count} módulos` : ""}
      </p>
      {slot.teacher && !sinNombreMaestro && (
        <p className="text-[10px] text-text-secondary truncate">{slot.teacher}</p>
      )}
      {slot.classroom && (
        <p className="text-[10px] text-slate-400 truncate">Aula: {slot.classroom}</p>
      )}
      {isTaller && (
        <span
          className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
          style={{ backgroundColor: hexToRgba(hex, 0.15), color: hex }}
        >
          Taller
        </span>
      )}
    </div>
  );
}

export default function SocialWorkerGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;

  const {
    students,
    logs,
    schedule,
    selectedDate,
    setSelectedDate,
    isLoading,
    error,
    refetch,
  } = usePrefectGroupDetail(groupId);

  const [activeSegment, setActiveSegment] = useState<SegmentId>("attendance");

  // Mapa alumno → status del día (solo logs de entrada, del hook).
  const statusByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      const sid =
        typeof log.student_id === "string" ? log.student_id : log.student_id?._id;
      if (sid && log.status) map.set(sid, log.status);
    }
    return map;
  }, [logs]);

  const studentsWithStatus = useMemo(
    () =>
      students.map((s) => ({
        ...s,
        attendanceStatus: statusByStudent.get(s._id) || null,
      })),
    [students, statusByStudent]
  );

  // Stats: presentes = on_time + late; faltas = resto de la matrícula
  // (incluye "sin registro").
  const presentCount = studentsWithStatus.filter(
    (s) => s.attendanceStatus === "on_time" || s.attendanceStatus === "late"
  ).length;
  const absentCount = students.length - presentCount;

  // Título del grupo: fuente preferida el horario (label del backend),
  // fallback al primer alumno del grupo.
  const firstGroup = students[0]?.current_group_id;
  const groupLabel =
    schedule?.group?.label ||
    (typeof firstGroup === "object"
      ? `${firstGroup?.grade ?? ""}°${firstGroup?.section ?? ""}`
      : "");

  // Tabla del horario por MÓDULOS — motor TOMADO del puerto del
  // prefecto (mismo cálculo de fronteras, filas de receso, inyección
  // de cortes internos y celdas con rowSpan). Ver comentario extendido
  // en src/app/prefect/groups/[id]/page.tsx.
  const scheduleGrid = useMemo(() => {
    const sched = schedule?.schedule;
    if (!sched) return null;
    const dayKeys = Object.keys(sched)
      .filter((d) => (sched[d]?.length || 0) > 0)
      .sort((a, b) => Number(a) - Number(b));
    if (dayKeys.length === 0) return null;

    // 1. Fronteras (minutos) únicas de toda la semana → índice de fila.
    const boundarySet = new Set<number>();
    for (const d of dayKeys) {
      for (const s of sched[d]) {
        boundarySet.add(s.startMinutes ?? toMinutes(s.start));
        boundarySet.add(s.endMinutes ?? toMinutes(s.end));
      }
    }
    let boundaries = [...boundarySet].sort((a, b) => a - b);
    let rowIndex = new Map<number, number>();
    const rebuildRowIndex = () => {
      rowIndex = new Map();
      boundaries.forEach((m, i) => rowIndex.set(m, i));
    };
    rebuildRowIndex();

    const spanOf = (s: GroupScheduleSlot): [number, number] | null => {
      const a = rowIndex.get(s.startMinutes ?? toMinutes(s.start));
      const b = rowIndex.get(s.endMinutes ?? toMinutes(s.end));
      if (a == null || b == null || b <= a) return null;
      return [a, b];
    };

    // 1.5. Fronteras internas sintéticas (rango de N módulos que ningún
    // día parte → se divide en N para que la columna "Módulo" muestre
    // sus nombres).
    const extraBoundaries = new Set<number>();
    for (const d of dayKeys) {
      for (const s of sched[d]) {
        if (s.type === "receso" || !s.block_names?.length) continue;
        const span = spanOf(s);
        if (!span) continue;
        const [a, b] = span;
        if (s.block_names.length <= b - a) continue;
        const startMin = s.startMinutes ?? toMinutes(s.start);
        const endMin = s.endMinutes ?? toMinutes(s.end);
        const step = (endMin - startMin) / s.block_names.length;
        for (let k = 1; k < s.block_names.length; k++) {
          extraBoundaries.add(Math.round(startMin + step * k));
        }
      }
    }
    if (extraBoundaries.size > 0) {
      boundaries = [...new Set([...boundaries, ...extraBoundaries])].sort(
        (a, b) => a - b
      );
      rebuildRowIndex();
    }

    // 2. Nombres de módulo (de block_names) + filas de receso.
    const nameByRow = new Map<number, string>();
    const breakRows = new Set<number>();
    for (const d of dayKeys) {
      for (const s of sched[d]) {
        const span = spanOf(s);
        if (!span) continue;
        const [a, b] = span;
        if (s.type === "receso") {
          for (let r = a; r < b; r++) breakRows.add(r);
        } else if (s.block_names && s.block_names.length === b - a) {
          for (let j = 0; j < s.block_names.length; j++) {
            if (!nameByRow.has(a + j)) nameByRow.set(a + j, s.block_names[j]);
          }
        }
      }
    }

    // 3. Celdas por día (primera escritura gana).
    const cells = new Map<
      string,
      Map<number, { slot: GroupScheduleSlot; span: number } | "skip">
    >();
    for (const d of dayKeys) {
      const dayCells = new Map<number, { slot: GroupScheduleSlot; span: number } | "skip">();
      for (const s of sched[d]) {
        if (s.type === "receso") continue;
        const span = spanOf(s);
        if (!span) continue;
        const [a, b] = span;
        if (dayCells.has(a)) continue;
        dayCells.set(a, { slot: s, span: b - a });
        for (let r = a + 1; r < b; r++) dayCells.set(r, "skip");
      }
      cells.set(d, dayCells);
    }

    // 4. Filas de la tabla (la última frontera solo cierra el rango).
    const rows = boundaries.slice(0, -1).map((startMin, i) => ({
      i,
      startMin,
      endMin: boundaries[i + 1],
      isBreak: breakRows.has(i),
      name: nameByRow.get(i),
    }));

    return { dayKeys, rows, cells };
  }, [schedule]);

  if (isLoading) return <LoadingState message="Cargando grupo…" />;
  if (error) return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={groupLabel ? `Grupo ${groupLabel}` : "Grupo"}
        subtitle={`${students.length} alumno${students.length !== 1 ? "s" : ""}`}
        action={{ label: "← Volver", href: "/social-worker/groups" }}
      />

      {/* Segmentos (tabs) — acento emerald del área. */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        {SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.id;
          const Icon = seg.icon;
          return (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-white text-emerald-700 font-bold shadow-sm"
                  : "text-slate-500 font-medium hover:text-slate-700 hover:bg-white/60"
              }`}
            >
              <Icon size={16} />
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          PESTAÑA: ASISTENCIA (solo lectura)
          ============================================================ */}
      {activeSegment === "attendance" && (
        <div className="space-y-3">
          {/* Selector de fecha */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              ← Anterior
            </button>
            <p className="text-sm font-bold text-text-primary capitalize">
              {selectedDate.toLocaleDateString("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Siguiente →
            </button>
          </div>

          {/* Stats del día (Presentes / Faltas) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
              <p className="text-xs text-emerald-600">Presentes</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-rose-700">{absentCount}</p>
              <p className="text-xs text-rose-600">Faltas</p>
            </div>
          </div>

          {/* Lista de alumnos con estado — SOLO LECTURA (sin botón
              "Marcar": el override manual no autoriza a este rol). */}
          {studentsWithStatus.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck size={48} className="text-slate-300" />}
              title="No hay alumnos"
              description="Este grupo no tiene matrícula."
            />
          ) : (
            <div className="space-y-3">
              {studentsWithStatus.map((student, index) => {
                const badge = student.attendanceStatus
                  ? STATUS_BADGE[student.attendanceStatus]
                  : undefined;
                const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
                return (
                  <Card key={student._id}>
                    <CardBody>
                      <div className="flex items-center gap-4">
                        <StudentAvatar
                          photoUrl={student.photoUrl}
                          name={fullName}
                          size={64}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="flex-1 min-w-0 text-lg font-bold text-text-primary truncate">
                              {index + 1}. {student.last_name}, {student.first_name}
                            </p>
                            {badge ? (
                              <Badge variant={badge.variant} className="shrink-0">
                                {badge.label}
                              </Badge>
                            ) : (
                              <Badge variant="slate" className="shrink-0">
                                Sin registro
                              </Badge>
                            )}
                          </div>
                          <p className="text-[15px] text-text-secondary truncate mt-0.5">
                            No. Control {student.controlNumber || "—"}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PESTAÑA: HORARIO
          ============================================================ */}
      {activeSegment === "schedule" && (
        <div className="space-y-3">
          {/* Banner del turno */}
          {schedule?.shift_info && (
            <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5">
              <Calendar size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700">
                {schedule.shift_info.name} • {schedule.shift_info.start} –{" "}
                {schedule.shift_info.end}
              </p>
            </div>
          )}

          {/* Tabla SEMANAL COMPLETA por módulos (ver nota en la cabecera). */}
          {scheduleGrid ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <div className="min-w-[880px]">
                <table className="w-full border-separate border-spacing-1.5">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-text-primary border border-gray-200 rounded-lg w-40">
                        Módulo
                      </th>
                      {scheduleGrid.dayKeys.map((d, idx) => (
                        <th
                          key={`head-${d}`}
                          className={`px-3 py-2 text-center text-xs font-semibold border border-gray-200 rounded-lg ${DAY_COLORS[idx % DAY_COLORS.length]}`}
                        >
                          {DAY_NAMES_FULL[Number(d)] || `Día ${d}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleGrid.rows.map((row) => {
                      const rowTime = `${fmtMin(row.startMin)} – ${fmtMin(row.endMin)}`;

                      // Fila de receso → ámbar en todo el renglón
                      if (row.isBreak) {
                        return (
                        <tr key={row.i}>
                          <td className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg align-middle">
                            <p className="text-xs font-medium text-amber-700">Receso</p>
                            <p className="text-[10px] text-amber-600">{rowTime}</p>
                          </td>
                          {scheduleGrid.dayKeys.map((d) => {
                            const cell = scheduleGrid.cells.get(d)?.get(row.i);
                            if (cell === "skip") return null;
                            if (cell) {
                              return (
                                <td
                                  key={`b-${d}`}
                                  rowSpan={cell.span}
                                  className="px-2 py-1.5 border border-gray-200 bg-white rounded-lg align-middle"
                                  style={{ borderLeft: `3px solid ${subjectHex(cell.slot.color)}` }}
                                >
                                  <ScheduleCellContent slot={cell.slot} />
                                </td>
                              );
                            }
                            return (
                              <td
                                key={`b-${d}`}
                                className="px-2 py-1.5 border border-amber-200 bg-amber-50 rounded-lg text-center align-middle"
                              >
                                <span className="text-[10px] text-amber-400 font-medium">
                                  RECESO
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        );
                      }

                      // Fila de módulo normal: columna "Módulo" + una celda por día.
                      return (
                        <tr key={row.i}>
                          <td className="px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg align-middle">
                            {row.name && (
                              <p className="text-xs font-semibold text-text-primary">{row.name}</p>
                            )}
                            <p
                              className={`text-[11px] text-text-secondary ${
                                row.name ? "" : "text-xs font-semibold text-text-primary"
                              }`}
                            >
                              {rowTime}
                            </p>
                          </td>
                          {scheduleGrid.dayKeys.map((d) => {
                            const cell = scheduleGrid.cells.get(d)?.get(row.i);
                            if (cell === "skip") return null;
                            if (!cell) {
                              return (
                                <td
                                  key={`${d}-${row.i}`}
                                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-center align-middle"
                                >
                                  <span className="text-xs text-text-muted">—</span>
                                </td>
                              );
                            }
                            // EL CARD = la propia <td> (rowSpan=N pinta
                            // su fondo sobre las N filas completas).
                            return (
                              <td
                                key={`${d}-${row.i}`}
                                rowSpan={cell.span}
                                className="px-2 py-1.5 border border-gray-200 bg-white rounded-lg align-middle"
                                style={{ borderLeft: `3px solid ${subjectHex(cell.slot.color)}` }}
                              >
                                <ScheduleCellContent slot={cell.slot} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Calendar size={48} className="text-slate-300" />}
              title="Sin horario registrado"
              description="Este grupo aún no tiene horario cargado."
            />
          )}
        </div>
      )}

      {/* ============================================================
          PESTAÑA: ALUMNOS → ficha de expediente
          ============================================================ */}
      {activeSegment === "students" && (
        <div className="space-y-3">
          {students.length === 0 ? (
            <EmptyState
              icon={<Users size={48} className="text-slate-300" />}
              title="No hay alumnos en este grupo"
            />
          ) : (
            students.map((student, index) => {
              const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
              const sub =
                typeof student.current_group_id === "object" && student.current_group_id
                  ? `${student.current_group_id.grade ?? ""}°${student.current_group_id.section ?? ""}`
                  : groupLabel;
              return (
                <Link key={student._id} href={`/social-worker/expedientes/${student._id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardBody className="flex items-center gap-4">
                      <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={64} />
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-text-primary truncate">
                          {index + 1}. {student.last_name}, {student.first_name}
                        </p>
                        <p className="text-[15px] text-text-secondary truncate">
                          {sub}
                          {sub && student.controlNumber ? " • " : ""}
                          {student.controlNumber || ""}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </CardBody>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
