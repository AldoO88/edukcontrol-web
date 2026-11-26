// =====================================================================
// src/lib/hooks/useInasistencias.ts
// ---------------------------------------------------------------------
// Pantalla única "Inasistencias y Justificantes" del trabajador social
// (fusión de las antiguas justificantes/ y attendance-summary/, web).
// 3 tabs con filtros COMPARTIDOS:
//   - "Por justificar" / "Justificadas": logs status=absent
//     (GET /api/attendance/logs), partidos en cliente por `justified`
//     (mismo split que la app; el server también admite
//     ?justified=true|false desde 2026-11-25 por si se necesita).
//   - "Por alumno": TODOS los alumnos con faltas del rango
//     (GET /api/social-worker/school-absences — SIN cap desde
//     2026-11-25; antes top-20).
// Filtros compartidos (controla la página):
//   - group_id → chips de grupos regulares (toggle).
//   - range: "week" (lun–dom de la semana actual, DEFAULT) | "cycle"
//     (sin from/to → el backend usa el inicio del ciclo escolar).
//   - search → client-side por nombre (lo aplica la página).
// Justificar: PUT /api/attendance/logs/:id/justify con parcheo local
// (el ítem cambia de tab sin re-fetch, igual que la app).
// =====================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";

// GET /api/groups devuelve un ARREGLO plano.
interface RawGroup {
  _id: string;
  grade: number;
  section: string;
  type?: string;
}

export interface AbsenceGroupOption {
  _id: string;
  label: string;
}

// Rango del filtro compartido.
//   week  → lun–dom de la semana actual (default)
//   cycle → todo el ciclo escolar (sin from/to)
export type AbsenceRange = "week" | "cycle";

// Ítem de /api/attendance/logs — doc completo con student poblado
// (controlNumber, first_name, last_name; current_group_id sin poblar de
// forma anidada: se resuelve con el map de grupos del hook).
export interface AbsenceLogItem {
  _id: string;
  student_id?: {
    _id?: string;
    controlNumber?: string;
    first_name?: string;
    last_name?: string;
    current_group_id?: string | { grade?: number; section?: string };
  } | null;
  event_type: string;
  status: string;
  event_time?: string;
  createdAt?: string;
  justified?: boolean;
  justified_reason?: string | null;
  justified_at?: string | null;
}

// Envelope paginado de /api/attendance/logs (items + pages).
interface LogsEnvelope {
  items: AbsenceLogItem[];
  total?: number;
  page?: number;
  pages?: number;
}

// Fila del tab "Por alumno" (GET /api/social-worker/school-absences).
export interface StudentAbsenceRow {
  rank: number;
  _id: string;
  fullName: string;
  controlNumber: string | null;
  group: string | null;
  absenceCount: number;
}

interface SchoolAbsencesResponse {
  summary: { totalAbsences: number; affectedStudents: number };
  topAbsentStudents: StudentAbsenceRow[];
}

// Lunes 00:00 → domingo 23:59:59.999 de la semana ACTUAL, en hora local
// del navegador (MX), devuelto como ISO para que el backend lo aplique
// sobre `event_time` sin ambigüedad de zona. Compatible con las dos
// convenciones de almacenamiento de AttendanceLog.event_time:
//   - taps: instante UTC real
//   - ausencias del cron: "hora pared forzada a UTC" (07:30 → 07:30Z)
// Un lunes 00:00 CST = 06:00Z y la primera falta del lunes se guarda
// como 07:30Z → queda DENTRO del rango; la del lunes de la semana
// siguiente (07:30Z) queda FUERA del to (domingo 23:59 CST = lunes
// 05:59Z). Los datos futuros del extension por setHours del endpoint
// no existen aún cuando se consulta, así que el rango es correcto.
export function currentWeekBounds(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo … 6 = sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday
  );
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 6);
  sundayEnd.setHours(23, 59, 59, 999);
  return { from: monday.toISOString(), to: sundayEnd.toISOString() };
}

// Query params de rango para un endpoint que acepta from/to
// (/api/attendance/logs y /api/social-worker/school-absences).
function rangeParams(range: AbsenceRange): Record<string, string> {
  if (range !== "week") return {};
  const { from, to } = currentWeekBounds();
  return { from, to };
}

export function useInasistencias() {
  const [groups, setGroups] = useState<AbsenceGroupOption[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [range, setRange] = useState<AbsenceRange>("week");

  // Tabs 1-2: logs de inasistencias.
  const [items, setItems] = useState<AbsenceLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 3: alumnos con faltas.
  const [absences, setAbsences] = useState<SchoolAbsencesResponse | null>(null);
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(true);
  const [absencesError, setAbsencesError] = useState<string | null>(null);

  // Grupos del filtro (solo regulares — una sola vez).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
        const regular = (Array.isArray(res) ? res : []).filter(
          (g) => g.type !== "taller"
        );
        setGroups(
          regular.map((g) => ({ _id: g._id, label: `${g.grade}°${g.section}` }))
        );
      } catch {
        // Sin grupos los chips quedan vacíos; las listas funcionan sin filtro.
        setGroups([]);
      }
    })();
  }, []);

  // Inasistencias del rango/grupo activos (tabs 1-2).
  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          status: "absent",
          event_type: "entry",
          limit: "200",
          page: String(pageNum),
          ...rangeParams(range),
        });
        if (groupId) qs.set("group_id", groupId);
        const res = await api.get<LogsEnvelope>(
          `${ENDPOINTS.ATTENDANCE_LOGS}?${qs.toString()}`
        );
        const incoming = res?.items || [];
        setPage(pageNum);
        setPages(res?.pages ?? 1);
        setItems((prev) => (append ? [...prev, ...incoming] : incoming));
      } catch (e: unknown) {
        setError((e as Error)?.message || "No se pudieron cargar las inasistencias.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [groupId, range]
  );

  // Alumnos con faltas del rango/grupo activos (tab "Por alumno").
  const fetchAbsences = useCallback(async () => {
    setIsLoadingAbsences(true);
    setAbsencesError(null);
    try {
      const qs = new URLSearchParams(rangeParams(range));
      if (groupId) qs.set("group_id", groupId);
      const query = qs.toString();
      const res = await api.get<SchoolAbsencesResponse>(
        `${ENDPOINTS.SOCIAL_WORKER_SCHOOL_ABSENCES}${query ? `?${query}` : ""}`
      );
      setAbsences(res);
    } catch (e: unknown) {
      setAbsencesError(
        (e as Error)?.message || "No se pudo cargar el resumen de faltas."
      );
    } finally {
      setIsLoadingAbsences(false);
    }
  }, [groupId, range]);

  // Re-fetch al cambiar grupo o rango (ambas fuentes).
  useEffect(() => {
    fetchPage(1, false);
    fetchAbsences();
  }, [fetchPage, fetchAbsences]);

  // Siguiente página de logs (dedupe defensivo por si el server repite un doc).
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || page >= pages) return;
    fetchPage(page + 1, true).then(() => {
      setItems((prev) => {
        const seen = new Set<string>();
        return prev.filter((it) =>
          seen.has(it._id) ? false : (seen.add(it._id), true)
        );
      });
    });
  }, [isLoading, isLoadingMore, page, pages, fetchPage]);

  // Toggle: clic en el grupo activo lo deselecciona (como la app).
  const toggleGroup = useCallback((id: string) => {
    setGroupId((prev) => (prev === id ? null : id));
  }, []);

  const clearGroup = useCallback(() => setGroupId(null), []);

  // Justificar → PUT + parcheo local del ítem (sin re-fetch: el ítem
  // se mueve de tab al instante; también re-contar es client-side).
  const justify = useCallback(
    async (
      logId: string,
      reason: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        await api.put(ENDPOINTS.ATTENDANCE_JUSTIFY(logId), {
          justified: true,
          justified_reason: reason || "Justificado por trabajo social",
        });
        const now = new Date().toISOString();
        setItems((prev) =>
          prev.map((item) =>
            item._id === logId
              ? {
                  ...item,
                  justified: true,
                  justified_reason: reason || "Justificado por trabajo social",
                  justified_at: now,
                }
              : item
          )
        );
        // El resumen del tab "Por alumno" también cuenta faltas → refetch
        // best-effort para que los totales no queden desfasados.
        fetchAbsences();
        return { success: true, message: "Inasistencia justificada." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo justificar la inasistencia.",
        };
      }
    },
    [fetchAbsences]
  );

  return {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    range,
    setRange,
    items,
    page,
    pages,
    isLoading,
    isLoadingMore,
    error,
    refetch: () => fetchPage(1, false),
    loadMore,
    justify,
    absences,
    isLoadingAbsences,
    absencesError,
    refetchAbsences: fetchAbsences,
  };
}
