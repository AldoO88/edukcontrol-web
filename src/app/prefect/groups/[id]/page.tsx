// =====================================================================
// src/app/prefect/groups/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de grupo — puerto web de groups/[groupId].jsx de la app.
// 3 pestañas:
//   1. Asistencia (default) — asistencia del día con navegación de
//      fecha y botón "Marcar" (override manual → POST
//      /api/attendance/manual-override, el backend deja on_time +
//      notifica al tutor).
//   2. Horario — horario semanal con pills de día (lun-vie) y slots
//      coloreados por materia.
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
import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MapPin,
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
  // Día del horario: lunes-viernes (como la app: hoy si es entre semana).
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 5 ? day : 1;
  });

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

          {/* Pills de día (lun-vie) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border transition-colors ${
                  selectedDay === day
                    ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                    : "bg-slate-100 border-slate-200 text-slate-500 font-medium hover:bg-slate-200"
                }`}
              >
                {DAY_NAMES_FULL[day] || `Día ${day}`}
              </button>
            ))}
          </div>

          {/* Slots del día seleccionado */}
          {schedule?.schedule?.[String(selectedDay)]?.length ? (
            <div className="space-y-2">
              {schedule.schedule[String(selectedDay)].map((slot, idx) => {
                // Receso — slot punteado gris (como la app).
                if (slot.type === "receso") {
                  return (
                    <div
                      key={idx}
                      className="flex items-center rounded-xl p-3 border border-dashed border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-200">
                        <Clock size={16} className="text-slate-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-slate-400 text-[13px] font-semibold">Receso</p>
                        <p className="text-slate-400 text-xs">
                          {slot.start} – {slot.end}
                        </p>
                      </div>
                    </div>
                  );
                }

                const hex = subjectHex(slot.color);
                const SubjectIcon = getSubjectIcon(slot.icon);
                const isTaller = slot.classificationType === "TALLER" || slot.is_taller;

                return (
                  <div
                    key={idx}
                    className="flex items-center rounded-xl p-3 bg-white border border-slate-200"
                    style={{ borderLeft: `4px solid ${hex}` }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                      style={{ backgroundColor: hexToRgba(hex, 0.12) }}
                    >
                      <SubjectIcon size={16} color={hex} />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {slot.subject || "Sin materia"}
                        </p>
                        {isTaller && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
                            style={{ backgroundColor: hexToRgba(hex, 0.15), color: hex }}
                          >
                            Taller
                          </span>
                        )}
                      </div>
                      {slot.teacher && !isTaller && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {slot.teacher}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                        <Clock size={11} />
                        {slot.start} – {slot.end}
                        {slot.block_count && slot.block_count > 1
                          ? ` (${slot.block_count} módulos)`
                          : ""}
                      </p>
                      {slot.classroom && (
                        <p className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                          <MapPin size={11} />
                          <span className="truncate">{slot.classroom}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar size={48} className="text-slate-300" />}
              title="Sin clases este día"
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
