// =====================================================================
// src/lib/hooks/useInasistencias.ts
// ---------------------------------------------------------------------
// Pantalla única "Inasistencias y Justificantes" del trabajador social
// (fusión de las antiguas justificantes/ y attendance-summary/, web).
// 3 tabs con filtros COMPARTIDOS:
//   - "Por justificar" / "Justificadas": logs status=absent
//     (GET /api/attendance/logs). Split SERVER-SIDE por `justified`
//     (?justified=false|true, param desde 2026-11-25): cada tab paga su
//     propia paginación y sus counts salen del `total` del server
//     (EXACTOS). Fix 2026-11-27: antes se partía en cliente sobre UNA
//     fetch paginada (límite 200, orden desc) y con "Todos los grupos"
//     el ciclo tiene 2,434 faltas = 13 páginas → las 27 justificadas
//     (de octubre) nunca caían en la página 1 y el tab quedaba vacío
//     SIN botón "Cargar más" (la condición dependía de la lista
//     filtrada). Ahora cada tab consulta lo suyo con el filtro del
//     server, igual que la web de expedientes.
//   - "Por alumno": TODOS los alumnos con faltas del rango
//     (GET /api/social-worker/school-absences — SIN cap desde
//     2026-11-25; antes top-20).
// Filtros compartidos (controla la página):
//   - group_id → chips de grupos regulares (toggle).
//   - range: "week" (lun–dom de la semana actual, DEFAULT) | "cycle"
//     (sin from/to → el backend usa el inicio del ciclo escolar).
//   - search → client-side por nombre (lo aplica la página, sobre la
//     lista CARGADA del tab activo — limitación conocida: con "Por
//     justificar" a 13 páginas, buscar un alumno viejo requiere
//     "Cargar más" antes).
// Justificar: PUT /api/attendance/logs/:id/justify → el ítem se quita
// de pendientes en local (total--) y se refetchea la lista de
// justificadas (corta) para insertarla en su posición por fecha.
// =====================================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Envelope paginado de /api/attendance/logs (items + total/page/pages).
interface LogsEnvelope {
  items: AbsenceLogItem[];
  total?: number;
  page?: number;
  pages?: number;
}

// Estado de UNA lista paginada (una por tab de logs: pendientes y
// justificadas). `total` es el conteo EXACTO del server para el filtro
// activo (lo pintan los tabs como conteo).
export interface AbsenceListState {
  items: AbsenceLogItem[];
  page: number;
  pages: number;
  total: number;
}

const EMPTY_LIST: AbsenceListState = { items: [], page: 1, pages: 1, total: 0 };

// Dedupe defensivo por si el server repite un doc entre páginas.
function dedupeById(items: AbsenceLogItem[]): AbsenceLogItem[] {
  const seen = new Set<string>();
  return items.filter((it) =>
    seen.has(it._id) ? false : (seen.add(it._id), true)
  );
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

  // Tabs 1-2: UNA lista paginada por estado (split server-side).
  const [pendingList, setPendingList] = useState<AbsenceListState>(EMPTY_LIST);
  const [justifiedList, setJustifiedList] = useState<AbsenceListState>(EMPTY_LIST);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contador de fetches iniciales en vuelo: hay 2 (pendientes +
  // justificadas) por cada cambio de filtro — isLoading solo baja cuando
  // AMBAS terminan, para no parpadear un tab vacío a media carga.
  const initialInFlight = useRef(0);

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

  // Una lista de logs (PENDIENTES o JUSTIFICADAS) del rango/grupo
  // activos. `justified` va al server (?justified=true|false) para que
  // cada tab pague SU paginación y su `total` sea el conteo exacto.
  const fetchList = useCallback(
    async (justified: boolean, pageNum: number, append: boolean) => {
      const setList = justified ? setJustifiedList : setPendingList;
      if (append) {
        setIsLoadingMore(true);
      } else {
        initialInFlight.current += 1;
        setIsLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams({
          status: "absent",
          event_type: "entry",
          justified: justified ? "true" : "false",
          limit: "200",
          page: String(pageNum),
          ...rangeParams(range),
        });
        if (groupId) qs.set("group_id", groupId);
        const res = await api.get<LogsEnvelope>(
          `${ENDPOINTS.ATTENDANCE_LOGS}?${qs.toString()}`
        );
        const incoming = res?.items || [];
        setList((prev) => ({
          items: append ? dedupeById([...prev.items, ...incoming]) : incoming,
          page: pageNum,
          pages: res?.pages ?? 1,
          total: res?.total ?? incoming.length,
        }));
      } catch (e: unknown) {
        setError((e as Error)?.message || "No se pudieron cargar las inasistencias.");
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          initialInFlight.current -= 1;
          if (initialInFlight.current <= 0) setIsLoading(false);
        }
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

  // Re-fetch al cambiar grupo o rango: AMBAS listas de logs + resumen.
  useEffect(() => {
    fetchList(false, 1, false);
    fetchList(true, 1, false);
    fetchAbsences();
  }, [fetchList, fetchAbsences]);

  // Siguiente página de la lista del tab ACTIVO.
  const loadMore = useCallback(
    (justified: boolean) => {
      const list = justified ? justifiedList : pendingList;
      if (isLoading || isLoadingMore || list.page >= list.pages) return;
      fetchList(justified, list.page + 1, true);
    },
    [isLoading, isLoadingMore, pendingList, justifiedList, fetchList]
  );

  // Re-fetch de ambas listas (botón Reintentar del estado de error).
  const refetch = useCallback(() => {
    fetchList(false, 1, false);
    fetchList(true, 1, false);
  }, [fetchList]);

  // Toggle: clic en el grupo activo lo deselecciona (como la app).
  const toggleGroup = useCallback((id: string) => {
    setGroupId((prev) => (prev === id ? null : id));
  }, []);

  const clearGroup = useCallback(() => setGroupId(null), []);

  // Justificar → PUT + parcheo local: el ítem sale de pendientes
  // (total--) y se refetchea la lista de justificadas (corta: 27 hoy)
  // para insertarlo en su posición por fecha con el total exacto.
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
        setPendingList((prev) => {
          if (!prev.items.some((it) => it._id === logId)) return prev;
          return {
            ...prev,
            items: prev.items.filter((it) => it._id !== logId),
            total: Math.max(prev.total - 1, 0),
          };
        });
        fetchList(true, 1, false);
        // El tab "Por alumno" también cuenta faltas → refetch best-effort
        // para que los totales no queden desfasados.
        fetchAbsences();
        return { success: true, message: "Inasistencia justificada." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo justificar la inasistencia.",
        };
      }
    },
    [fetchList, fetchAbsences]
  );

  return {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    range,
    setRange,
    pendingList,
    justifiedList,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
    justify,
    absences,
    isLoadingAbsences,
    absencesError,
    refetchAbsences: fetchAbsences,
  };
}
