// Hook "Asistencia del día" — detalle de UN día para el drill-down del
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
// FECHA NAVEGABLE (2026-10-19): `date` es estado del hook e inicia en
// HOY con componentes LOCALES (localDateStr — nunca toISOString():
// después de las 18:00 en México la fecha UTC ya sería "mañana"). La
// página retrocede/avanza con ← Anterior / Siguiente → (el endpoint
// acepta CUALQUIER fecha pasada — sin cambios de backend —; avanzar se
// detiene en hoy porque no existe asistencia futura). Cada cambio de
// fecha re-consulta.
//
// Anti-race: si el usuario pica las flechas rápido, varias peticiones
// vuelan en paralelo; un contador (requestIdRef) DESCARTA las
// respuestas viejas para que los datos siempre correspondan a la fecha
// visible. La data anterior se conserva mientras carga (la página
// muestra el spinner junto a los badges, no pantalla completa).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { localDateStr } from "@/lib/dates";
import type { AttendanceDayDetail } from "@/lib/types";

// "YYYY-MM-DD" ± N días → "YYYY-MM-DD". Ancla al mediodía LOCAL antes
// de desplazar (el mediodía no se mueve con DST) y reextrae con
// componentes locales — cero desfase UTC.
function shiftDateStr(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export function useTodayAttendance() {
  // Fecha seleccionada (YYYY-MM-DD, componentes locales) — inicia HOY:
  // el card del dashboard entra aquí por defecto.
  const [date, setDate] = useState(() => localDateStr(new Date()));
  const [data, setData] = useState<AttendanceDayDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contador de peticiones: solo la ÚLTIMA respuesta se aplica (las
  // viejas de una ráfaga de clics se descartan en los 3 puntos).
  const requestIdRef = useRef(0);

  // Fetch de la fecha seleccionada — depende de `date`, así que el
  // effect de abajo re-consulta con cada cambio de fecha.
  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<AttendanceDayDetail>(
        `${ENDPOINTS.ATTENDANCE_DAY_DETAIL}?date=${date}`
      );
      if (requestId !== requestIdRef.current) return; // respuesta vieja
      setData(res);
    } catch (e: unknown) {
      if (requestId !== requestIdRef.current) return; // error viejo
      setError((e as Error)?.message || "No se pudo cargar la asistencia del día.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // "HOY" se recalcula en CADA render: si la pestaña queda abierta
  // sobre la medianoche, la fecha seleccionada pasa a ser "ayer" y las
  // flechas lo reflejan sin forzar recarga.
  const todayStr = localDateStr(new Date());
  const isToday = date === todayStr;

  return {
    data,
    date,
    isLoading,
    error,
    isToday,
    refetch: fetchData,
    // Retroceso libre (no hay límite de antigüedad — los logs no TTL).
    goPrev: () => setDate((d) => shiftDateStr(d, -1)),
    // Avance con tope en HOY: comparar lexicográficamente strings
    // YYYY-MM-DD es orden cronológico.
    goNext: () => setDate((d) => (d >= todayStr ? d : shiftDateStr(d, 1))),
  };
}
