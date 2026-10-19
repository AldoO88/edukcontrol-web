// Hook del directorio de Alumnos (búsqueda global paginada).
// Puerto de students.jsx de la app: página + limit 50, búsqueda
// debounced (500ms, igual que la app), filtro por grupo y "cargar más"
// (app: onEndReached de FlatList → aquí: botón/load-more manual).
// Los grupos del dropdown vienen de GET /api/groups (solo regulares,
// los talleres se excluyen — misma regla que la app).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { PaginatedItems, PrefectStudent } from "@/lib/types";

// Ítem mínimo del filtro de grupos (label = "1°A").
interface GroupFilterItem {
  _id: string;
  label: string;
}

// GET /api/groups devuelve un ARREGLO plano (no paginado).
interface RawGroup {
  _id: string;
  grade: number;
  section: string;
  type?: string;
}

const PAGE_SIZE = 50;

export function useStudentsDirectory() {
  const [groups, setGroups] = useState<GroupFilterItem[]>([]);
  const [students, setStudents] = useState<PrefectStudent[]>([]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para evitar dobles fetches simultáneos del mismo "append".
  const inFlightRef = useRef(false);

  // Grupos del filtro (una sola vez): solo regulares, con label "1°A".
  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
      const regular = (Array.isArray(res) ? res : []).filter((g) => g.type !== "taller");
      setGroups(regular.map((g) => ({ _id: g._id, label: `${g.grade}°${g.section}` })));
    } catch (e: unknown) {
      // Sin grupos el filtro queda vacío — no bloquea el directorio.
      console.warn("No se pudieron cargar los grupos:", (e as Error)?.message);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Fetch de una página (append = concatenar al final, para "cargar más").
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
        const qs = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
          status: "active",
        });
        const term = search.trim();
        if (term) qs.set("search", term);
        if (groupId) qs.set("group", groupId);
        const res = await api.get<PaginatedItems<PrefectStudent>>(
          `${ENDPOINTS.STUDENTS}?${qs.toString()}`
        );
        const items = res?.items || [];
        setStudents((prev) => (append ? [...prev, ...items] : items));
        setPages(res?.pages || 0);
        setPage(res?.page || pageNum);
      } catch (e: unknown) {
        setError((e as Error)?.message || "No se pudieron cargar los alumnos.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        inFlightRef.current = false;
      }
    },
    [search, groupId]
  );

  // Debounce de búsqueda/grupo: 500ms con término, 0 sin término
  // (mismo comportamiento que el useEffect + setTimeout de la app).
  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchPage(1, false);
      },
      search ? 500 : 0
    );
    return () => clearTimeout(timer);
  }, [search, groupId, fetchPage]);

  // "Cargar más" — solo si hay páginas pendientes.
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore) return;
    if (page >= pages) return;
    fetchPage(page + 1, true);
  }, [isLoading, isLoadingMore, page, pages, fetchPage]);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  return {
    groups,
    students,
    pages,
    page,
    search,
    setSearch,
    groupId,
    setGroupId,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refetch,
  };
}
