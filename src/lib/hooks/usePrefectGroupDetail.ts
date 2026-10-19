// Hook del DETALLE de grupo (3 pestañas: Asistencia / Horario / Alumnos).
// Puerto del grupo de fetchs de groups/[groupId].jsx de la app:
//   - alumnos del grupo (GET /api/students?group=...)
//   - logs de asistencia de un día (GET /api/attendance/logs, rango local)
//   - horario semanal (GET /api/groups/:id/schedule)
//   - override manual (POST /api/attendance/manual-override)
// La fecha seleccionada vive aquí para que el cambio de día solo
// refetchee asistencia (igual que en la app).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { localDateStr } from "@/lib/dates";
import type {
  AttendanceLogItem,
  GroupScheduleData,
  PaginatedItems,
  PrefectStudent,
} from "@/lib/types";

export function usePrefectGroupDetail(groupId: string | undefined) {
  const [students, setStudents] = useState<PrefectStudent[]>([]);
  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [schedule, setSchedule] = useState<GroupScheduleData | null>(null);
  // Día consultado (local). Inicia hoy.
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Id del alumno que está en medio de un override (para el spinner del botón).
  const [overrideId, setOverrideId] = useState<string | null>(null);

  // Alumnos del grupo — orden por apellido (misma regla que la app).
  const fetchStudents = useCallback(async () => {
    if (!groupId) return;
    const qs = new URLSearchParams({ group: groupId, limit: "100" });
    const res = await api.get<PaginatedItems<PrefectStudent>>(
      `${ENDPOINTS.STUDENTS}?${qs.toString()}`
    );
    const items = res?.items || [];
    items.sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
    setStudents(items);
  }, [groupId]);

  // Logs de ENTRADA del día seleccionado — rango [día local 00:00Z,
  // 23:59Z], el mismo contrato from/to que usa la app (ver lib/dates.ts
  // por qué la fecha sale de componentes locales). event_type=entry
  // excluye los logs de salida: los exits también traen `status` y
  // pisarían el estado de entrada en el mapa por alumno.
  const fetchAttendance = useCallback(async () => {
    if (!groupId) return;
    const day = localDateStr(selectedDate);
    const qs = new URLSearchParams({
      group_id: groupId,
      event_type: "entry",
      from: `${day}T00:00:00.000Z`,
      to: `${day}T23:59:59.999Z`,
      limit: "200",
    });
    const res = await api.get<PaginatedItems<AttendanceLogItem>>(
      `${ENDPOINTS.ATTENDANCE_LOGS}?${qs.toString()}`
    );
    setLogs(res?.items || []);
  }, [groupId, selectedDate]);

  // Horario semanal del grupo.
  const fetchSchedule = useCallback(async () => {
    if (!groupId) return;
    const res = await api.get<GroupScheduleData>(ENDPOINTS.GROUP_SCHEDULE(groupId));
    setSchedule(res);
  }, [groupId]);

  // Carga inicial / refetch manual / refetch al cambiar de día — un
  // solo efecto: al mutar selectedDate cambia la identidad de
  // fetchAttendance → cambia loadAll → recarga completa. Es un
  // micro-ahorro (2 requests ligeros) a cambio de cero duplicados y
  // cero efectos cruzados.
  const loadAll = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    setError(null);
    await Promise.allSettled([fetchStudents(), fetchAttendance(), fetchSchedule()]);
    setIsLoading(false);
  }, [groupId, fetchStudents, fetchAttendance, fetchSchedule]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Override manual: marcar presente. Devuelve {success, message} para
  // que la página muestre el feedback (la app usa Alert.alert).
  const markPresent = useCallback(
    async (studentId: string): Promise<{ success: boolean; message: string }> => {
      setOverrideId(studentId);
      try {
        await api.post(ENDPOINTS.ATTENDANCE_MANUAL_OVERRIDE, {
          student_id: studentId,
          date: localDateStr(selectedDate),
          status: "present",
        });
        // Refetchee los logs para que el badge pase a Presente.
        await fetchAttendance();
        return {
          success: true,
          message: "Asistencia registrada. Se notificó al tutor.",
        };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo registrar la asistencia.",
        };
      } finally {
        setOverrideId(null);
      }
    },
    [selectedDate, fetchAttendance]
  );

  return {
    students,
    logs,
    schedule,
    selectedDate,
    setSelectedDate,
    isLoading,
    error,
    overrideId,
    markPresent,
    refetch: loadAll,
  };
}
