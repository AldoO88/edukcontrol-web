// Faltas Escolares / Resumen de inasistencias del prefecto.
// GET /api/prefect/school-absences (summary + topAbsentStudents) con
// filtro opcional group_id (grupos regulares de GET /api/groups) —
// el cambio de grupo re-fetchea, y seleccionar el mismo grupo lo
// deselecciona (toggle, igual que la app).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { GroupSummaryItem, SchoolAbsencesData } from "@/lib/types";

// GET /api/groups devuelve un ARREGLO plano.
interface RawGroup {
  _id: string;
  grade: number;
  section: string;
  type?: string;
}

export interface AbsenceGroupOption {
  _id: string;
  label: string;
}

export function useSchoolAbsences() {
  const [groups, setGroups] = useState<AbsenceGroupOption[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [data, setData] = useState<SchoolAbsencesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grupos del filtro (solo regulares — una sola vez).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
        const regular = (Array.isArray(res) ? res : []).filter((g) => g.type !== "taller");
        setGroups(regular.map((g) => ({ _id: g._id, label: `${g.grade}°${g.section}` })));
      } catch {
        // Sin grupos el dropdown queda vacío; el resumen funciona sin filtro.
        setGroups([]);
      }
    })();
  }, []);

  // Resumen (con grupo activo si lo hay).
  const fetchAbsences = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = groupId ? `?${new URLSearchParams({ group_id: groupId })}` : "";
      const res = await api.get<SchoolAbsencesData>(
        `${ENDPOINTS.PREFECT_SCHOOL_ABSENCES}${qs}`
      );
      setData(res);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el resumen de faltas.");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  // Toggle: clic en el grupo activo lo deselecciona (como la app).
  const toggleGroup = useCallback((id: string) => {
    setGroupId((prev) => (prev === id ? null : id));
  }, []);

  const clearGroup = useCallback(() => setGroupId(null), []);

  return {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    data,
    isLoading,
    error,
    refetch: fetchAbsences,
  };
}

// Re-export puntual por si la página necesita el type de un ítem de
// la lista rankeada sin importar types.ts completo.
export type AbsenceGroup = Pick<GroupSummaryItem, "_id" | "label">;
