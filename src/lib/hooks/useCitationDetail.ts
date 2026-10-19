// Detalle de Citatorio (GET /api/citations/:id) + acciones del
// creador: editar (PUT parcial), reagendar (PATCH /reschedule) y
// cancelar (PATCH /cancel). La página gatea permisos por status.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { CitationItem } from "@/lib/types";

type Body = CitationItem | { data: CitationItem };

function unwrap(body: Body): CitationItem {
  return body && "data" in body && body.data ? body.data : (body as CitationItem);
}

export function useCitationDetail(id: string | undefined) {
  const [citation, setCitation] = useState<CitationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const body = await api.get<Body>(`${ENDPOINTS.CITATIONS}/${id}`);
      setCitation(unwrap(body));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el citatorio.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  // Editar: payload PARCIAL { reason?, location?, type? } (la app solo
  // manda los campos que cambiaron).
  const update = useCallback(
    async (payload: {
      reason?: string;
      location?: string;
      type?: "behavioral" | "administrative";
    }): Promise<{ success: boolean; message: string }> => {
      try {
        await api.put(`${ENDPOINTS.CITATIONS}/${id}`, payload);
        await fetchOne();
        return { success: true, message: "Citatorio actualizado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo editar el citatorio.",
        };
      }
    },
    [id, fetchOne]
  );

  // Reagendar: { scheduledDate: ISO local naïve, location? }.
  const reschedule = useCallback(
    async (payload: { scheduledDate: string; location?: string }) => {
      try {
        await api.patch(`${ENDPOINTS.CITATIONS}/${id}/reschedule`, payload);
        await fetchOne();
        return { success: true, message: "Citatorio reagendado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo reagendar el citatorio.",
        };
      }
    },
    [id, fetchOne]
  );

  // Cancelar: PATCH sin body (estado terminal).
  const cancel = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      await api.patch(`${ENDPOINTS.CITATIONS}/${id}/cancel`);
      await fetchOne();
      return { success: true, message: "Citatorio cancelado." };
    } catch (e: unknown) {
      return {
        success: false,
        message: (e as Error)?.message || "No se pudo cancelar el citatorio.",
      };
    }
  }, [id, fetchOne]);

  return { citation, isLoading, error, update, reschedule, cancel, refetch: fetchOne };
}
