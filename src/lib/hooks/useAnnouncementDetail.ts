// Detalle de Aviso (GET /api/announcements/:id) + mutaciones de
// edición/borrado (solo para el emisor — la página gatea `canEdit`).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { AnnouncementItem } from "@/lib/types";

// El detalle puede venir plano o envuelto en { data }.
type Body = AnnouncementItem | { data: AnnouncementItem };

function unwrap(body: Body): AnnouncementItem {
  return body && "data" in body && body.data ? body.data : (body as AnnouncementItem);
}

export function useAnnouncementDetail(id: string | undefined) {
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const body = await api.get<Body>(`${ENDPOINTS.ANNOUNCEMENTS}/${id}`);
      setAnnouncement(unwrap(body));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el aviso.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  // Editar → PUT con { title, message, priority } y refetch local.
  const update = useCallback(
    async (payload: { title: string; message: string; priority: "informative" | "urgent" }) => {
      try {
        await api.put(`${ENDPOINTS.ANNOUNCEMENTS}/${id}`, payload);
        await fetchOne();
        return { success: true, message: "Aviso actualizado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo actualizar el aviso.",
        };
      }
    },
    [id, fetchOne]
  );

  // Eliminar → DELETE (la página navega de regreso al listado).
  const remove = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      await api.delete(`${ENDPOINTS.ANNOUNCEMENTS}/${id}`);
      return { success: true, message: "Aviso eliminado." };
    } catch (e: unknown) {
      return {
        success: false,
        message: (e as Error)?.message || "No se pudo eliminar el aviso.",
      };
    }
  }, [id]);

  return { announcement, isLoading, error, update, remove, refetch: fetchOne };
}
