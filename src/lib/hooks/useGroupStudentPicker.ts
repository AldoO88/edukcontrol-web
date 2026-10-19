// Picker Grupo → Alumno — lógica compartida por los modales de
// creación (citatorio, reporte, pase de salida, aviso dirigido).
// Trae los grupos regulares de la escuela (sin talleres, igual que la
// app) y, al elegir un grupo, sus alumnos ordenados por apellido.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { PaginatedItems, PrefectStudent } from "@/lib/types";

export interface GroupOption {
  _id: string;
  label: string; // "1°A"
}

// GET /api/groups devuelve un ARREGLO plano (no paginado).
interface RawGroup {
  _id: string;
  grade: number;
  section: string;
  type?: string;
}

export function useGroupStudentPicker() {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [students, setStudents] = useState<PrefectStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Grupos regulares con label "1°A" (una sola vez).
  const fetchGroups = useCallback(async () => {
    try {
      setGroupsLoading(true);
      const res = await api.get<RawGroup[]>(ENDPOINTS.GROUPS);
      const regular = (Array.isArray(res) ? res : []).filter((g) => g.type !== "taller");
      setGroups(regular.map((g) => ({ _id: g._id, label: `${g.grade}°${g.section}` })));
    } catch {
      // Sin grupos el picker queda vacío; el modal muestra su propio estado.
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Alumnos del grupo elegido (lazy, orden apellido → nombre, como la app).
  useEffect(() => {
    if (!selectedGroupId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const qs = new URLSearchParams({ group: selectedGroupId, limit: "100" });
        const res = await api.get<PaginatedItems<PrefectStudent>>(
          `${ENDPOINTS.STUDENTS}?${qs.toString()}`
        );
        const items = res?.items || [];
        items.sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
        if (!cancelled) setStudents(items);
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  // Limpia la selección (al cerrar/reabrir modales).
  const reset = useCallback(() => {
    setSelectedGroupId(null);
    setStudents([]);
  }, []);

  return {
    groups,
    groupsLoading,
    selectedGroupId,
    // Set directo (los pickers de un solo grupo no hacen toggle).
    setSelectedGroupId,
    students,
    studentsLoading,
    reset,
  };
}
