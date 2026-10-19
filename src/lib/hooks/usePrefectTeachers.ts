// Hook de la lista de Maestros del prefecto (GET /api/prefect/teachers).
// Fetch único con nombre/teléfono/horas semanales — la búsqueda por
// nombre es client-side (igual que teachers.jsx de la app).

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherListItem } from "@/lib/types";

interface TeachersResponse {
  teachers: TeacherListItem[];
}

export function usePrefectTeachers() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<TeachersResponse>(ENDPOINTS.PREFECT_TEACHERS);
      setTeachers(res?.teachers || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudieron cargar los maestros.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, isLoading, error, refetch: fetchTeachers };
}
