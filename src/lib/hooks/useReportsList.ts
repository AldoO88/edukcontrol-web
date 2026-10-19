// Lista de Reportes de conducta (GET /api/conduct-logs).
// El backend pagina (page/limit 20, envelope solo con items →
// hasMore = última página llenó 20); los filtros (scope Mis/Todos,
// dropdown Activos/Cancelados/Deméritos/Méritos, búsqueda) son
// CLIENT-SIDE en la página — igual que reports/index.jsx de la app.
// El create inyecta school_year_id tomado del dashboard del prefecto
// (misma fuente que la app: dashboardData.school.school_year_id).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { usePrefectDashboard } from "@/lib/hooks/usePrefectDashboard";
import type { ConductLogItem, PaginatedItems } from "@/lib/types";

export function useReportsList() {
  // school_year_id para el create — traído del dashboard (una sola
  // fuente de verdad, como en la app).
  const { data: dashboard } = usePrefectDashboard();

  const [items, setItems] = useState<ConductLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      setError(null);
      const qs = new URLSearchParams({ page: String(pageNum), limit: "20" });
      const res = await api.get<PaginatedItems<ConductLogItem>>(
        `${ENDPOINTS.CONDUCT_LOGS}?${qs.toString()}`
      );
      const incoming = res?.items || [];
      // Página < 20 → no hay más (mismo criterio que la app).
      setHasMore(incoming.length >= 20);
      setPage(pageNum);
      setItems((prev) => (append ? [...prev, ...incoming] : incoming));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los reportes.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    fetchPage(page + 1, true);
  }, [isLoading, isLoadingMore, hasMore, page, fetchPage]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  // Crear reporte — points_impact_override = stepper, severity solo
  // aplica a demerit (la app lo omite en merit).
  const create = useCallback(
    async (payload: {
      student_id: string;
      eventType: "demerit" | "merit";
      severity?: "minor" | "moderate" | "severe";
      description: string;
      points_impact_override: number;
    }): Promise<{ success: boolean; message: string }> => {
      const schoolYearId = dashboard?.school?.school_year_id;
      if (!schoolYearId) {
        return {
          success: false,
          message: "No hay ciclo escolar activo en el dashboard.",
        };
      }
      try {
        await api.post(ENDPOINTS.CONDUCT_LOGS, {
          ...payload,
          school_year_id: schoolYearId,
        });
        await fetchPage(1, false);
        return { success: true, message: "Reporte registrado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo crear el reporte.",
        };
      }
    },
    [dashboard, fetchPage]
  );

  return { items, page, hasMore, isLoading, isLoadingMore, error, loadMore, refetch, create };
}
