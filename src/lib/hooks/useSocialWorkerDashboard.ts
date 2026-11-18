// Hook del dashboard del trabajador social (área web /social-worker/*)
// Puerto del usePrefectDashboard al endpoint del rol:
//   1. GET /api/social-worker/dashboard      → stats, avisos, incidencias
//   2. GET /api/social-worker/expedientes?summary_only=1
//                                            → summary global de la
//                                              barra de progreso
// El summary es best-effort: si falla, el card de progreso simplemente
// no se pinta (el resto del dashboard queda intacto). Refetch al volver
// el foco a la ventana (equivalente web del useFocusEffect de RN).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { ExpedientesSummary, SocialWorkerDashboardData } from "@/lib/types";

export function useSocialWorkerDashboard() {
  const [data, setData] = useState<SocialWorkerDashboardData | null>(null);
  const [summary, setSummary] = useState<ExpedientesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [dash, exp] = await Promise.all([
        api.get<SocialWorkerDashboardData>(ENDPOINTS.SOCIAL_WORKER_DASHBOARD),
        api
          .get<{ summary: ExpedientesSummary }>(
            `${ENDPOINTS.SOCIAL_WORKER_EXPEDIENTES}?summary_only=1`
          )
          .catch(() => null),
      ]);
      setData(dash);
      setSummary(exp?.summary ?? null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refetch en foco de ventana (equivalente de useFocusEffect).
  useEffect(() => {
    const onFocus = () => fetchDashboard();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDashboard]);

  return { data, summary, isLoading, error, refetch: fetchDashboard };
}
