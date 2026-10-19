// Hook de la lista de Grupos del prefecto (GET /api/prefect/groups-summary).
// Una sola llamada con todas las stats por grupo (matrícula, niños/niñas,
// reportes, asistencia de hoy, deméritos/méritos) — mismo contrato que
// getGroupsSummary() de la app móvil.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { GroupSummaryItem } from "@/lib/types";

interface GroupsSummaryResponse {
  groups: GroupSummaryItem[];
}

export function usePrefectGroups() {
  const [groups, setGroups] = useState<GroupSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<GroupsSummaryResponse>(ENDPOINTS.PREFECT_GROUPS_SUMMARY);
      setGroups(res?.groups || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los grupos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, isLoading, error, refetch: fetchGroups };
}
