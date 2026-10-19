// Detalle de Reporte de conducta (GET /api/conduct-logs/:id) + las 3
// mutaciones con sus gates de permisos (la página decide qué botones
// muestra según creator/rol, igual que reports/[id].jsx):
//   - updateDescription → PATCH /:id { description }  (solo creador + active)
//   - cancelReport      → PUT /:id/cancel {}          (creador o rol admin-like;
//                                                      el backend restaura puntos)
//   - deleteReport      → DELETE /:id                 (solo super_admin)

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { ConductLogItem } from "@/lib/types";

type Body = ConductLogItem | { data: ConductLogItem };

function unwrap(body: Body): ConductLogItem {
  return body && "data" in body && body.data ? body.data : (body as ConductLogItem);
}

export function useReportDetail(id: string | undefined) {
  const [report, setReport] = useState<ConductLogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const body = await api.get<Body>(`${ENDPOINTS.CONDUCT_LOGS}/${id}`);
      setReport(unwrap(body));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el reporte.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  // Editar descripción (PATCH con campo único).
  const updateDescription = useCallback(
    async (description: string): Promise<{ success: boolean; message: string }> => {
      try {
        await api.patch(`${ENDPOINTS.CONDUCT_LOGS}/${id}`, { description });
        await fetchOne();
        return { success: true, message: "Descripción actualizada." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo editar la descripción.",
        };
      }
    },
    [id, fetchOne]
  );

  // Cancelar reporte → el backend restaura los puntos.
  const cancelReport = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      await api.put(`${ENDPOINTS.CONDUCT_LOGS}/${id}/cancel`, {});
      await fetchOne();
      return { success: true, message: "Reporte cancelado. Se restauraron los puntos." };
    } catch (e: unknown) {
      return {
        success: false,
        message: (e as Error)?.message || "No se pudo cancelar el reporte.",
      };
    }
  }, [id, fetchOne]);

  // Eliminar (solo super_admin — la página lo gatea por rol).
  const deleteReport = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      await api.delete(`${ENDPOINTS.CONDUCT_LOGS}/${id}`);
      return { success: true, message: "Reporte eliminado." };
    } catch (e: unknown) {
      return {
        success: false,
        message: (e as Error)?.message || "No se pudo eliminar el reporte.",
      };
    }
  }, [id]);

  return { report, isLoading, error, updateDescription, cancelReport, deleteReport, refetch: fetchOne };
}
