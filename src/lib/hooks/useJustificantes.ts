// Justificantes del trabajador social (Fase D).
// Puerto de la pantalla justificantes/index.jsx de la app:
//   - GET /api/attendance/logs?status=absent&event_type=entry[&group_id]
//     → inasistencias del ciclo (page/limit 200 = cap del endpoint; la
//       app solo pide la primera página, la web agrega "Cargar más")
//   - Filtro por grupo (regular, toggle) que re-fetchea
//   - PUT /api/attendance/logs/:id/justify { justified, justified_reason }
//     → actualiza el ítem en LOCAL tras el éxito (como la app)
// Los tabs Pendientes/Justificadas y la búsqueda son CLIENT-SIDE en la
// página (mismo split que la app sobre `justified`).

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

export interface JustificanteGroupOption {
  _id: string;
  label: string;
}

// Ítem de /api/attendance/logs — el doc completo con student poblado
// (controlNumber, first_name, last_name, current_group_id sin poblar
// de forma anidada: se resuelve con el map de grupos de este hook).
export interface JustificanteItem {
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

// Envelope paginado (items + pages del controller).
interface LogsEnvelope {
  items: JustificanteItem[];
  total?: number;
  page?: number;
  pages?: number;
}

export function useJustificantes() {
  const [groups, setGroups] = useState<JustificanteGroupOption[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [items, setItems] = useState<JustificanteItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grupos del filtro (solo regulares — una sola vez).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
        const regular = (Array.isArray(res) ? res : []).filter((g) => g.type !== "taller");
        setGroups(regular.map((g) => ({ _id: g._id, label: `${g.grade}°${g.section}` })));
      } catch {
        // Sin grupos el chip filter queda vacío; la lista funciona sin filtro.
        setGroups([]);
      }
    })();
  }, []);

  // Inasistencias (con grupo activo si lo hay).
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
    [groupId]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  // Siguiente página (dedupe defensivo por si el server repite un doc).
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

  // Justificar → PUT + parcheo local del ítem (sin re-fetch, igual
  // que la app: el ítem se mueve solo de tab).
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
        return { success: true, message: "Inasistencia justificada." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo justificar la inasistencia.",
        };
      }
    },
    []
  );

  return {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    items,
    page,
    pages,
    isLoading,
    isLoadingMore,
    error,
    refetch: () => fetchPage(1, false),
    loadMore,
    justify,
  };
}
