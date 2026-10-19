// Hook "Asistencia de hoy" — detalle del día para el drill-down del
// dashboard del prefecto (/prefect/today-attendance).
//
// Fuente: GET /api/attendance/day-detail?date=YYYY-MM-DD — un renglón
// por alumno activo con foto, nombre, #control, grupo, hora de
// ENTRADA, hora de SALIDA y estatus, mergeando los primeros taps
// entry/exit del día (mismo contrato que consume el monitoreo admin).
//
// El tenant sale del JWT (el endpoint authorize() acepta "prefect"
// desde 2026-10-19), así que NO se envía ?school=.
//
// La fecha se calcula con componentes LOCALES (localDateStr) y no con
// toISOString(): después de las 18:00 en México la fecha UTC ya es
// "mañana" y la query dejaría fuera los taps del día escolar (misma
// corrección que ya aplica usePrefectGroupDetail).
//
// Un solo fetch por montaje; refetch() manual para recargar (el
// endpoint es barato y el día cambia con cada tap).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { localDateStr } from "@/lib/dates";
import type { AttendanceDayDetail } from "@/lib/types";

export function useTodayAttendance() {
  const [data, setData] = useState<AttendanceDayDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fecha de hoy en zona local (YYYY-MM-DD) — se recalcula en cada
  // fetch para que un refetch pasado de medianoche pida el día nuevo.
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const date = localDateStr(new Date());
      const res = await api.get<AttendanceDayDetail>(
        `${ENDPOINTS.ATTENDANCE_DAY_DETAIL}?date=${date}`
      );
      setData(res);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar la asistencia de hoy.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
