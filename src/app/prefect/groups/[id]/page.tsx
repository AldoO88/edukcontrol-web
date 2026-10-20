// =====================================================================
// src/app/prefect/groups/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de grupo — puerto web de groups/[groupId].jsx de la app.
// 3 pestañas:
//   1. Asistencia (default) — asistencia del día con navegación de
//      fecha y botón "Marcar" (override manual → POST
//      /api/attendance/manual-override, el backend deja on_time +
//      notifica al tutor).
//   2. Horario — tabla SEMANAL COMPLETA (sin selector de días, como
//      sí exige la app móvil por tamaño de pantalla) presentada como
//      la config de horarios por ciclo del super_admin: columna
//      "Módulo" (nombre + rango), encabezados de día coloreados,
//      receso en fila ámbar y — lo clave — una clase de 2 MÓDULOS
//      OCUPA DOS FILAS vía rowSpan. El card de materia es la PROPIA
//      <td> (border-separate): así su fondo/borde abarca realmente
//      las dos filas (height:100% no se resuelve contra una td de
//      altura auto — ver ScheduleCellContent). Materia coloreada,
//      maestro, aula y badge de taller.
//   3. Alumnos — lista ordenada por apellido → ficha del alumno.
// Fuente: hook usePrefectGroupDetail (alumnos + logs + horario).
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

// Badge de estado del alumno (Retardo añadido respecto a la app, que
// pintaba "Sin registro" para late — aquí se muestra honestamente).
const STATUS_BADGE: Record<string, { variant: "emerald" | "amber" | "rose"; label: string }> = {
  on_time: { variant: "emerald", label: "Presente" },
  late: { variant: "amber", label: "Retardo" },
  absent: { variant: "rose", label: "Falta" },
};

const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Encabezados de día con los MISMOS colores que usa la tabla de
// configuración de horarios del super_admin
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

// Contenido de UNA materia dentro de su celda de horario: ícono con
// el color propio de la materia, nombre, rango horario del SLOT (con
// indicador "· N módulos" cuando abarca 2, igual que en la config
// admin donde la celda cubre los renglones), maestro, aula y badge de
// taller.
//
// NOTA IMPORTANTE: este componente es SOLO el contenido — el "card"
// (fondo blanco, borde redondeado y acento de color de la materia)
// vive en la propia <td>. Razón: `height: 100%` NO se resuelve contra
// una <td> de altura `auto` (verificado en Chrome headless: el div
// medía 0.78× la altura de la celda → FILL=NO; la CSS dice que un %
// sobre altura auto se trata como auto). En cambio la <td> con
// rowSpan=2 pinta su fondo/borde sobre LAS DOS filas completas por
// geometría de table-layout — así el card abarca realmente sus dos
// filas. La <td> usa `align-middle` para centrar este contenido.
function ScheduleCellContent({ slot }: { slot: GroupScheduleSlot }) {
  const hex = subjectHex(slot.color);
  const SubjectIcon = getSubjectIcon(slot.icon);
  const isTaller = slot.classificationType === "TALLER" || slot.is_taller;

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
      {slot.teacher && (
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

export default function PrefectGroupDetailPage() {
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
    overrideId,
    markPresent,
    refetch,
  } = usePrefectGroupDetail(groupId);

  const [activeSegment, setActiveSegment] = useState<SegmentId>("attendance");
  // Feedback del override (equivalente al Alert.alert de la app).
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Auto-dismiss del banner de feedback.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

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

  // Stats: presentes = on_time + late (retardo cuenta como presente,
  // misma convención de las pantallas de monitoreo de asistencia);
  // faltas = resto de la matrícula (incluye "sin registro").
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

  // Tabla del horario por MÓDULOS — presentación TOMADA de la config
  // de horarios por ciclo del super_admin
  // (schools/[id]/school-years/[yearId]/schedules/page.tsx): fila
  // "Módulo" a la izquierda, columnas = días y una clase de 2 MÓDULOS
  // OCUPA DOS FILAS con rowSpan. En web NO se divide por día como en
  // la app (tamaño de pantalla).
  //   - rows: módulos-base de la semana = pares consecutivos de todas
  //     las fronteras start/end (siempre alinean porque las mismas
  //     fronteras definen los slots; p. ej. 09:10-10:50 de un día y
  //     10:00-10:50 de otro parten el renglón en 09:10/10:00/10:50).
  //   - nameByRow: nombre de módulo ("Modulo 3") derivado de
  //     block_names[] cuando su cantidad coincide con las filas que
  //     abarca el slot; primera escritura gana.
  //   - breakRows: filas cubiertas por un slot type=receso (fila
  //     ámbar "RECESO", como en la tabla admin).
  //   - cells: día → Map<fila, {slot, span} | "skip">; el slot se
  //     pinta en su fila INICIAL con rowSpan=span y las filas que
  //     cubre quedan "skip" (no se pintan) — mismo mecanismo que
  //     gridData de la config admin. Los slots de receso NO entran
  //     aquí: su fila se renderiza uniforme por breakRows.
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
    const boundaries = [...boundarySet].sort((a, b) => a - b);
    const rowIndex = new Map<number, number>();
    boundaries.forEach((m, i) => rowIndex.set(m, i));

    // Helper: filas [a, b) que abarca un slot (null si no alinea).
    const spanOf = (s: GroupScheduleSlot): [number, number] | null => {
      const a = rowIndex.get(s.startMinutes ?? toMinutes(s.start));
      const b = rowIndex.get(s.endMinutes ?? toMinutes(s.end));
      if (a == null || b == null || b <= a) return null;
      return [a, b];
    };

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
          // block_names[j] corresponde a la fila a+j (numeración
          // uniforme del turno — misma plantilla para todos los días).
          for (let j = 0; j < s.block_names.length; j++) {
            if (!nameByRow.has(a + j)) nameByRow.set(a + j, s.block_names[j]);
          }
        }
      }
    }

    // 3. Celdas por día (primera escritura gana, como en el admin).
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

  // Override manual → banner con el mensaje (la app muestra Alert).
  const handleOverride = async (studentId: string, fullName: string) => {
    const res = await markPresent(studentId);
    if (res.success) {
      setNotice({
        ok: true,
        text: `${fullName} fue marcado(a) como presente. Se notificó al tutor.`,
      });
    } else {
      setNotice({ ok: false, text: res.message });
    }
  };

  if (isLoading) return <LoadingState message="Cargando grupo…" />;
  if (error) return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={groupLabel ? `Grupo ${groupLabel}` : "Grupo"}
        subtitle={`${students.length} alumno${students.length !== 1 ? "s" : ""}`}
      />

      {/* Banner de feedback del override */}
      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Segmentos (tabs) */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        {SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.id;
          const Icon = seg.icon;
          return (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs transition-colors ${
                isActive
                  ? "bg-white text-indigo-600 font-bold shadow-sm"
                  : "text-slate-500 font-medium hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          PESTAÑA: ASISTENCIA
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

          {/* Stats del día */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
              <p className="text-[10px] text-emerald-600">Presentes</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-rose-700">{absentCount}</p>
              <p className="text-[10px] text-rose-600">Faltas</p>
            </div>
          </div>

          {/* Lista de alumnos con estado + Marcar */}
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
                const isPresent = student.attendanceStatus === "on_time";
                const isOverriding = overrideId === student._id;
                const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
                return (
                  <Card key={student._id}>
                    <CardBody>
                      {/* Fila del alumno — solo foto y tipografías
                          subidas ~30% respecto a la versión anterior
                          (foto 84px, nombre 21px, meta 18px); el card
                          mantiene su tamaño actual. */}
                      <div className="flex items-center gap-4">
                        <StudentAvatar
                          photoUrl={student.photoUrl}
                          name={fullName}
                          size={84}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[21px] font-bold text-text-primary truncate">
                            {index + 1}. {student.last_name}, {student.first_name}
                          </p>
                          <p className="text-[18px] text-text-secondary">
                            No. Control {student.controlNumber || "—"}
                          </p>
                        </div>
                        {badge ? (
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        ) : (
                          <Badge variant="slate">Sin registro</Badge>
                        )}
                      </div>
                      {/* Marcar: para todo lo que no sea on_time (falta,
                          retardo o sin registro — mismo alcance que la
                          app; el backend normaliza a on_time). */}
                      {!isPresent && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleOverride(student._id, fullName)}
                            disabled={isOverriding}
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 transition-colors"
                          >
                            {isOverriding ? "Marcando…" : "Marcar"}
                          </button>
                        </div>
                      )}
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
            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2.5">
              <Calendar size={16} className="text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-700">
                {schedule.shift_info.name} • {schedule.shift_info.start} –{" "}
                {schedule.shift_info.end}
              </p>
            </div>
          )}

          {/* Tabla SEMANAL COMPLETA por módulos — presentación TOMADA
              de la config de horarios del super_admin (columna
              "Módulo", encabezados de día coloreados, receso en fila
              ámbar y rowSpan para clases de 2 módulos). En web NO se
              divide por días como en la app; scroll horizontal en
              pantallas estrechas (AGENTS.md: los grids anchos no se
              limitan de ancho — benefician a tablet landscape).

              IMPORTANTE: border-separate + border-spacing (NO
              border-collapse) y el "card" vive en la PROPIA <td> —
              ver ScheduleCellContent. Razón: height:100% NO se resuelve
              contra una <td> de altura auto (verificado en Chrome
              headless: ratio 0.78), pero la celda con rowSpan=2 por
              geometría de table-layout pinta su fondo/borde sobre las
              DOS filas completas: así el card de 2 módulos abarca sus
              dos filas sin alturas porcentuales. */}
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
                      // (misma estética que la config admin).
                      if (row.isBreak) {
                        return (
                          <tr key={row.i}>
                            <td className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg align-middle">
                              <p className="text-xs font-medium text-amber-700">Receso</p>
                              <p className="text-[10px] text-amber-600">{rowTime}</p>
                            </td>
                            {scheduleGrid.dayKeys.map((d) => {
                              // Dato degenerado: una clase inicia justo
                              // en el módulo de receso → se pinta la
                              // clase en vez del "RECESO".
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

                      // Fila de módulo normal: columna "Módulo" con
                      // nombre derivado de block_names (si existe) +
                      // rango del renglón, luego una celda por día.
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
                            // Lo cubre el rowSpan de un renglón anterior
                            // (la clase de 2 módulos ocupa 2 filas).
                            if (cell === "skip") return null;
                            if (!cell) {
                              // Sin clase este día a este módulo.
                              return (
                                <td
                                  key={`${d}-${row.i}`}
                                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-center align-middle"
                                >
                                  <span className="text-xs text-text-muted">—</span>
                                </td>
                              );
                            }
                            // EL CARD = la propia <td>: su fondo/borde
                            // (y el acento de color de la materia) se
                            // pintan sobre TODA el área de la celda, que
                            // con rowSpan=N abarca N filas completas
                            // (height:100% no se resuelve contra una td
                            // de altura auto — ver comentario arriba).
                            // align-middle centra el contenido cuando la
                            // celda mide 2 filas.
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
          PESTAÑA: ALUMNOS
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
                <Link key={student._id} href={`/prefect/students/${student._id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    {/* Fila del alumno — misma escala grande que la
                        pestaña de Asistencia (foto 84px, nombre 21px,
                        meta 18px). El card mantiene su tamaño. */}
                    <CardBody className="flex items-center gap-4">
                      <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={84} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[21px] font-bold text-text-primary truncate">
                          {index + 1}. {student.last_name}, {student.first_name}
                        </p>
                        <p className="text-[18px] text-text-secondary truncate">
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
