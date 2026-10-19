// =====================================================================
// src/app/prefect/groups/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de grupo — puerto web de groups/[groupId].jsx de la app.
// 3 pestañas:
//   1. Asistencia (default) — asistencia del día con navegación de
//      fecha y botón "Marcar" (override manual → POST
//      /api/attendance/manual-override, el backend deja on_time +
//      notifica al tutor).
//   2. Horario — rejilla SEMANAL COMPLETA (sin selector de días, como
//      sí exige la app móvil por tamaño de pantalla): filas = hora de
//      inicio, columnas = Lun–Vie, cada celda con su rango propio,
//      materia coloreada, maestro y badge de taller.
//   3. Alumnos — lista ordenada por apellido → ficha del alumno.
// Fuente: hook usePrefectGroupDetail (alumnos + logs + horario).
// =====================================================================

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
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

// Color válido de materia o fallback (el backend puede mandar null).
function subjectHex(color?: string | null): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#6366F1";
}

// "HH:MM" → minutos desde medianoche (para ordenar la columna de hora
// de la rejilla semanal).
const toMinutes = (hhmm?: string): number => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
};

// Celda de la rejilla horaria: 1..n slots que INICIAN a la misma hora
// ese día (en prod los periodos no están alineados entre días — p. ej.
// 07:30-08:20 un día y 07:30-09:10 otro — por eso la fila se agrupa
// por hora de inicio y cada celda conserva su propio rango start–end).
function ScheduleCell({ slots }: { slots: GroupScheduleSlot[] }) {
  return (
    <div className="space-y-1.5">
      {slots.map((slot, idx) => {
        // Receso — celda punteada gris (misma estética que la app).
        if (slot.type === "receso") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5 text-center"
            >
              <p className="text-slate-400 text-[11px] font-semibold">Receso</p>
              <p className="text-slate-400 text-[10px]">
                {slot.start} – {slot.end}
              </p>
            </div>
          );
        }

        const hex = subjectHex(slot.color);
        const SubjectIcon = getSubjectIcon(slot.icon);
        const isTaller = slot.classificationType === "TALLER" || slot.is_taller;

        return (
          <div
            key={idx}
            className="rounded-lg bg-white border border-slate-200 px-2 py-1.5"
            style={{ borderLeft: `3px solid ${hex}` }}
          >
            <div className="flex items-center gap-1.5">
              <SubjectIcon size={12} color={hex} />
              <p className="text-[11px] font-bold text-text-primary truncate">
                {slot.subject || "Sin materia"}
              </p>
            </div>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {slot.start} – {slot.end}
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
      })}
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

  // Rejilla del horario COMPLETO (sin selector de días — en web hay
  // ancho de sobra; la app divide por día por tamaño de pantalla):
  //   - dayKeys: días con al menos 1 slot, ordenados 1..7.
  //   - starts: horas de INICIO únicas en toda la semana, ordenadas.
  //   - byDay: día → Map<inicio, slots[]> (acceso O(1) por celda; un
  //     mismo inicio puede tener >1 slot solo en datos degenerados —
  //     se apilan en la celda).
  const scheduleGrid = useMemo(() => {
    const sched = schedule?.schedule;
    if (!sched) return null;
    const dayKeys = Object.keys(sched)
      .filter((d) => (sched[d]?.length || 0) > 0)
      .sort((a, b) => Number(a) - Number(b));
    if (dayKeys.length === 0) return null;
    const startSet = new Set<string>();
    for (const d of dayKeys) {
      for (const s of sched[d]) startSet.add(s.start ?? "");
    }
    const starts = [...startSet].sort((a, b) => toMinutes(a) - toMinutes(b));
    const byDay = new Map<string, Map<string, GroupScheduleSlot[]>>();
    for (const d of dayKeys) {
      const m = new Map<string, GroupScheduleSlot[]>();
      for (const s of sched[d]) {
        const key = s.start ?? "";
        const arr = m.get(key) || [];
        arr.push(s);
        m.set(key, arr);
      }
      byDay.set(d, m);
    }
    return { dayKeys, starts, byDay };
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
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          photoUrl={student.photoUrl}
                          name={fullName}
                          size={48}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">
                            {index + 1}. {student.last_name}, {student.first_name}
                          </p>
                          <p className="text-xs text-text-secondary">
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
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-60 transition-colors"
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

          {/* Rejilla SEMANAL COMPLETA — filas = hora de inicio,
              columnas = Lun–Vie (en web NO se divide por días como en
              la app; el ancho extra beneficia, ver AGENTS.md — los
              grids con scroll horizontal no se limitan de ancho). */}
          {scheduleGrid ? (
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[880px]">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `84px repeat(${scheduleGrid.dayKeys.length}, minmax(150px, 1fr))`,
                  }}
                >
                  {/* Encabezados: columna de hora + días con clases */}
                  <div className="px-2 pb-2 text-[11px] font-bold uppercase text-slate-400">
                    Hora
                  </div>
                  {scheduleGrid.dayKeys.map((d) => (
                    <div
                      key={`head-${d}`}
                      className="px-2 pb-2 text-center text-xs font-bold text-indigo-700 bg-indigo-50 rounded-t-lg"
                    >
                      {DAY_NAMES_FULL[Number(d)] || `Día ${d}`}
                    </div>
                  ))}

                  {/* Filas: una por hora de inicio de toda la semana */}
                  {scheduleGrid.starts.map((start) => (
                    <Fragment key={start}>
                      <div className="px-2 py-2 text-[11px] font-bold text-slate-500 border-t border-slate-100">
                        {start || "—"}
                      </div>
                      {scheduleGrid.dayKeys.map((d) => {
                        const slots = scheduleGrid.byDay.get(d)?.get(start);
                        return (
                          <div
                            key={`${d}-${start}`}
                            className="px-1.5 py-1.5 border-t border-slate-100 align-top"
                          >
                            {slots && slots.length > 0 ? (
                              <ScheduleCell slots={slots} />
                            ) : (
                              /* Celda vacía: ese día no hay clase a esta
                                  hora (receso/salida antes). */
                              <div className="h-10 rounded-lg border border-dashed border-slate-100 bg-slate-50/50" />
                            )}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
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
                    <CardBody className="flex items-center gap-3">
                      <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={48} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {index + 1}. {student.last_name}, {student.first_name}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
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
