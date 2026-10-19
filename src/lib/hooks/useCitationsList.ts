// Lista de Citatorios del prefecto (GET /api/citations).
// Paginación SERVER (page/limit 20 + loadMore con dedupe); los filtros
// (scope Mis/Todos, pills de estado, búsqueda) son CLIENT-SIDE en la
// página — igual que CitationsListScreen de la app. Expone la
// normalización (normalizeCitation) y la creación (POST) — el modal
// vive en la página.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { normalizeCitation, type NormalizedCitation } from "@/lib/citations";
import type { CitationItem, PaginatedItems } from "@/lib/types";

export function useCitationsList() {
  const [rawItems, setRawItems] = useState<CitationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
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
      const res = await api.get<PaginatedItems<CitationItem>>(
        `${ENDPOINTS.CITATIONS}?${qs.toString()}`
      );
      const incoming = res?.items || [];
      setTotal(res?.total ?? 0);
      setPages(res?.pages ?? 1);
      setPage(res?.page ?? pageNum);
      setRawItems((prev) => {
        if (!append) return incoming;
        // Dedupe por _id al hacer scroll (mismo patrón que la app).
        const seen = new Set(prev.map((i) => i._id));
        return [...prev, ...incoming.filter((i) => !seen.has(i._id))];
      });
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los citatorios.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || page >= pages) return;
    fetchPage(page + 1, true);
  }, [isLoading, isLoadingMore, page, pages, fetchPage]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  // Crear citatorio (prefect: solo behavioral/administrative).
  const create = useCallback(
    async (payload: {
      student: string;
      scheduledDate: string; // ISO local naïve 'YYYY-MM-DDTHH:mm:ss'
      type: "behavioral" | "administrative";
      location: string;
      reason?: string;
    }): Promise<{ success: boolean; message: string }> => {
      try {
        await api.post(ENDPOINTS.CITATIONS, payload);
        await fetchPage(1, false);
        return { success: true, message: "Citatorio creado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo crear el citatorio.",
        };
      }
    },
    [fetchPage]
  );

  // Items ya normalizados al shape de UI (lo consume la página).
  const items: NormalizedCitation[] = rawItems
    .map(normalizeCitation)
    .filter((i): i is NormalizedCitation => !!i);

  return { items, total, page, pages, isLoading, isLoadingMore, error, loadMore, refetch, create };
}
