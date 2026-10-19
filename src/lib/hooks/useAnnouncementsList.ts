// Lista de Avisos del prefecto (GET /api/announcements).
// Paginación SERVER (page/limit 20 + loadMore con dedupe por _id) con
// 3 filtros server-side: scope (Mis Avisos → sender=yo / Todos),
// prioridad (pills) y rango de fechas (chips Hoy/Semana/15 días/
// Historial, default 15 días — mismo comportamiento que la app).
// La búsqueda de texto es client-side (la filtra la página).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { AnnouncementItem, PaginatedItems } from "@/lib/types";

export type AnnouncementScope = "mine" | "all";
export type AnnouncementPriority = "informative" | "urgent" | null;
export type AnnouncementRange = "today" | "week" | "15days" | "history";

// Chips de rango (label para la UI, valor para el estado).
export const DATE_RANGE_OPTIONS: Array<{ value: AnnouncementRange; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "15days", label: "15 días" },
  { value: "history", label: "Historial" },
];

// Rango → from/to como instantes UTC (createdAt se compara en UTC).
// Hoy = desde medianoche local; week/15days = últimos N días; sin
// historial forzado = desde la antigüedad (null/null).
function rangeToFromTo(range: AnnouncementRange): { from?: string; to?: string } {
  const now = new Date();
  switch (range) {
    case "today": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: startOfDay.toISOString(), to: now.toISOString() };
    }
    case "week": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString() };
    }
    case "15days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 15);
      return { from: from.toISOString() };
    }
    case "history":
    default:
      return {};
  }
}

// Envoltorio real: pages O totalPages según versión del backend.
interface AnnouncementsResponse extends Omit<PaginatedItems<AnnouncementItem>, "pages"> {
  pages?: number;
  totalPages?: number;
}

export function useAnnouncementsList(senderId: string) {
  const [scope, setScope] = useState<AnnouncementScope>("mine");
  const [priority, setPriority] = useState<AnnouncementPriority>(null);
  const [range, setRange] = useState<AnnouncementRange>("15days");

  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      try {
        setError(null);
        const qs = new URLSearchParams({ page: String(pageNum), limit: "20" });
        if (scope === "mine" && senderId) qs.set("sender", senderId);
        if (priority) qs.set("priority", priority);
        const { from, to } = rangeToFromTo(range);
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);

        const res = await api.get<AnnouncementsResponse>(
          `${ENDPOINTS.ANNOUNCEMENTS}?${qs.toString()}`
        );
        const incoming = res?.items || [];
        setTotal(res?.total ?? 0);
        setPages(res?.pages ?? res?.totalPages ?? 1);
        setPage(res?.page ?? pageNum);
        setItems((prev) => {
          if (!append) return incoming;
          // Dedupe por _id (mismo anti-duplicado que el onEndReached de la app).
          const seen = new Set(prev.map((i) => i._id));
          return [...prev, ...incoming.filter((i) => !seen.has(i._id))];
        });
      } catch (e: unknown) {
        setError((e as Error)?.message || "No se pudieron cargar los avisos.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        inFlightRef.current = false;
      }
    },
    [scope, priority, range, senderId]
  );

  // Recarga página 1 al cambiar cualquier filtro server-side.
  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || page >= pages) return;
    fetchPage(page + 1, true);
  }, [isLoading, isLoadingMore, page, pages, fetchPage]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  // Crear aviso → recarga desde la pestaña activa (si el scope es
  // "mine", el aviso nuevo aparece arriba).
  const create = useCallback(
    async (
      payload: {
        title: string;
        message: string;
        priority: "informative" | "urgent";
        targetType: "general" | "group" | "student";
        targetGroups?: string[];
        targetStudents?: string[];
      }
    ): Promise<{ success: boolean; message: string }> => {
      try {
        await api.post(ENDPOINTS.ANNOUNCEMENTS, payload);
        await fetchPage(1, false);
        return { success: true, message: "Aviso publicado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo publicar el aviso.",
        };
      }
    },
    [fetchPage]
  );

  return {
    scope,
    setScope,
    priority,
    setPriority,
    range,
    setRange,
    items,
    total,
    page,
    pages,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refetch,
    create,
  };
}
