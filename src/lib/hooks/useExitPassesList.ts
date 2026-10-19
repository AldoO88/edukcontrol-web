// Lista de Pases de Salida (GET /api/exit-passes).
// Envelope real { success, data: items, pagination: { total } } —
// paginación server con hasMore = acumulado < total; la búsqueda por
// nombre (alumno o quien retira) es client-side (igual que la app).
// El create es POST sin hora: el backend pone exit_time.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { ExitPassItem, ExitPassListResponse } from "@/lib/types";

export function useExitPassesList() {
  const [items, setItems] = useState<ExitPassItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      setError(null);
      const qs = new URLSearchParams({ page: String(pageNum), limit: "20" });
      const res = await api.get<ExitPassListResponse>(
        `${ENDPOINTS.EXIT_PASSES}?${qs.toString()}`
      );
      const incoming = res?.data || [];
      setTotal(res?.pagination?.total ?? 0);
      setPage(pageNum);
      setItems((prev) => (append ? [...prev, ...incoming] : incoming));
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los pases de salida.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore) return;
    if (items.length >= total) return;
    fetchPage(page + 1, true);
  }, [isLoading, isLoadingMore, items.length, total, page, fetchPage]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  // Crear pase (sin exit_time — lo pone el backend).
  const create = useCallback(
    async (payload: {
      student_id: string;
      guardian_name: string;
      relationship: "father" | "mother" | "guardian" | "family";
      reason: "illness" | "medical" | "family" | "personal" | "other";
      reason_detail?: string;
    }): Promise<{ success: boolean; message: string }> => {
      try {
        await api.post(ENDPOINTS.EXIT_PASSES, payload);
        await fetchPage(1, false);
        return { success: true, message: "Pase de salida registrado." };
      } catch (e: unknown) {
        return {
          success: false,
          message: (e as Error)?.message || "No se pudo registrar el pase de salida.",
        };
      }
    },
    [fetchPage]
  );

  return { items, total, page, isLoading, isLoadingMore, error, loadMore, refetch, create };
}
