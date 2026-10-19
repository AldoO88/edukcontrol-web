// Hook del dashboard del prefecto (área web /prefect/*)
// Puerto del src/hooks/usePrefectDashboard.js de la app móvil: trae
// stats del día, incidencias y avisos recientes + metadatos de la
// escuela. Refetch al volver el foco a la ventana (equivalente web del
// useFocusEffect de RN — al volver de otra pestaña las stats del día
// pueden haber cambiado).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { PrefectDashboardData } from "@/lib/types";

export function usePrefectDashboard() {
  const [data, setData] = useState<PrefectDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<PrefectDashboardData>(ENDPOINTS.PREFECT_DASHBOARD);
      setData(res);
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

  return { data, isLoading, error, refetch: fetchDashboard };
}
