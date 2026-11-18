// Hook del listado de EXPEDIENTES (/social-worker/expedientes).
// Fuente: GET /api/social-worker/expedientes con filtros server-side
// (?search= ?group_id= ?status=) + summary GLOBAL (siempre el avance
// de toda la escuela, sin filtros). Los grupos del dropdown vienen de
// GET /api/groups (solo regulares — misma regla que el directorio).
// Búsqueda debounced 500ms (patrón de useStudentsDirectory).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  ExpedienteItem,
  ExpedienteStatus,
  ExpedientesSummary,
} from "@/lib/types";

// Ítem mínimo del filtro de grupos (label = "1A").
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

interface ExpedientesPayload {
  items?: ExpedienteItem[];
  summary: ExpedientesSummary;
}

export function useExpedientesList() {
  const [groups, setGroups] = useState<GroupFilterItem[]>([]);
  const [items, setItems] = useState<ExpedienteItem[]>([]);
  const [summary, setSummary] = useState<ExpedientesSummary | null>(null);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [status, setStatus] = useState<ExpedienteStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grupos del filtro (una sola vez): solo regulares, con label "1A".
  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
      const regular = (Array.isArray(res) ? res : []).filter(
        (g) => g.type !== "taller"
      );
      setGroups(
        regular.map((g) => ({ _id: g._id, label: `${g.grade}${g.section}` }))
      );
    } catch (e: unknown) {
      // Sin grupos el filtro queda vacío — no bloquea el listado.
      console.warn("No se pudieron cargar los grupos:", (e as Error)?.message);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Fetch del padrón con los filtros actuales.
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      const term = search.trim();
      if (term) qs.set("search", term);
      if (groupId) qs.set("group_id", groupId);
      if (status) qs.set("status", status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const res = await api.get<ExpedientesPayload>(
        `${ENDPOINTS.SOCIAL_WORKER_EXPEDIENTES}${suffix}`
      );
      setItems(res?.items || []);
      setSummary(res?.summary || null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los expedientes.");
    } finally {
      setIsLoading(false);
    }
  }, [search, groupId, status]);

  // Debounce de filtros: 500ms con término de búsqueda, 0 sin él.
  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchList();
      },
      search ? 500 : 0
    );
    return () => clearTimeout(timer);
  }, [search, groupId, status, fetchList]);

  const refetch = useCallback(() => fetchList(), [fetchList]);

  return {
    groups,
    items,
    summary,
    search,
    setSearch,
    groupId,
    setGroupId,
    status,
    setStatus,
    isLoading,
    error,
    refetch,
  };
}
